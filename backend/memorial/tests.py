"""Testes da API do Memorial: busca, privacidade, check-in e versão por sala.

    python manage.py test memorial
"""

import json
import os
import re
import shutil
import tempfile
from datetime import timedelta
from io import BytesIO, StringIO
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.contrib.admin.utils import flatten_fieldsets
from django.contrib.auth.models import Group, Permission, User
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.utils import timezone
from PIL import Image

from .administracao import _celula
from .models import (
    Acontecimento,
    Aluno,
    Apresentacao,
    ConfiguracaoMemorial,
    ConfirmacaoEmail,
    Decada,
    Foto,
    FotoAluno,
    Icone,
    Registro,
    Sala,
    chave_turma,
    normalizar,
)
from .registro import registrar
from .secoes import SECOES
from .templatetags.painel import estatico

MEDIA = tempfile.mkdtemp(prefix="memorial-testes-")
CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


def limites(minuto, hora="1000/hour"):
    return {**settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"checkin_minuto": minuto, "checkin_hora": hora}}
EMAIL = "pessoa.real@exemplo.com"


def png(tamanho=(40, 30), formato="PNG", exif=False):
    buf = BytesIO()
    img = Image.new("RGB", tamanho, (120, 90, 60))
    extra = {}
    if exif:
        e = Image.Exif()
        e[0x010F] = "CameraSecreta"  # Make
        extra["exif"] = e.tobytes()
    img.save(buf, formato, **extra)
    return SimpleUploadedFile(f"foto.{formato.lower()}", buf.getvalue(), content_type=f"image/{formato.lower()}")


def aluno(nome, ano=1998, turma="3º A", **kw):
    dados = {"consentimento": True, "status": Aluno.Status.APROVADO, "email": f"{normalizar(nome).replace(' ', '.')}@x.com"}
    dados.update(kw)
    return Aluno.objects.create(nome=nome, ano=ano, turma=turma, **dados)


def codigo_enviado(email, desde=0):
    """O código do último e-mail de confirmação enviado a `email` desde a posição `desde` de mail.outbox."""
    for m in reversed(mail.outbox[desde:]):
        if m.to == [email] and "seu código de check-in" in m.subject:
            return re.search(r"\b(\d{6})\b", m.subject).group(1)
    return None


def fazer_checkin(client, dados):
    """O check-in como o celular faz, no modo do painel. Devolve a última resposta.

    Direto: um envio só, com as fotos. Por e-mail: pede o código, lê no e-mail e confirma; as fotos vão só na
    segunda etapa. Sem código no e-mail (dados inválidos, e-mail já cadastrado, campo isca), devolve a resposta
    da primeira etapa.
    """
    if not ConfiguracaoMemorial.atual().checkin_por_email:
        return client.post("/api/memorial/checkin/", dados)
    sem_fotos = {k: v for k, v in dados.items() if k != "fotos"}
    antes = len(mail.outbox)
    r = client.post("/api/memorial/checkin/", sem_fotos)
    if r.status_code != 202:
        return r
    codigo = codigo_enviado(str(dados["email"]).strip().lower(), antes)
    if codigo is None:
        return r
    return client.post("/api/memorial/checkin/", {**dados, "codigo": codigo})


def avisos_a_equipe():
    """Os e-mails que não são o código do visitante."""
    return [m for m in mail.outbox if m.to != [EMAIL]]


SEM_ESPERA = {"CHECKIN_CODIGO_INTERVALO": 0, "CHECKIN_CODIGO_POR_HORA": 1000}


@override_settings(MEDIA_ROOT=MEDIA, CACHES=CACHE, REST_FRAMEWORK=limites("1000/min"), **SEM_ESPERA)
class Base(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()

    def get(self, url, **params):
        r = self.client.get(url, params)
        self.assertNotIn(b"@", r.content.replace(b"@x.com", b"!"), "resposta contém algo parecido com e-mail")
        return r

    def checkin(self, **dados):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL,
                "instagram": "", "facebook": "", "consentimento": "true", "site": ""}
        base.update(dados)
        return fazer_checkin(self.client, base)


class BuscaTests(Base):
    def setUp(self):
        super().setUp()
        aluno("João Pedro da Silva Sales", 2007, "2º B")
        aluno("Ana Beatriz Silva Moura", 1998)
        aluno("Antônio Silva Façanha", 1962, "4ª série")
        aluno("Beatriz Coelho Lima", 1992, "8ª A")

    def nomes(self, **params):
        return [a["nome"] for a in self.get("/api/memorial/alunos/", **params).json()["resultados"]]

    def test_sem_acento_e_por_parte_do_nome(self):
        self.assertEqual(self.nomes(q="joao sil"), ["João Pedro da Silva Sales"])
        self.assertEqual(self.nomes(q="JOÃO   SILVA"), ["João Pedro da Silva Sales"])
        self.assertEqual(self.nomes(q="facanha"), ["Antônio Silva Façanha"])
        self.assertEqual(self.nomes(q="antonio"), ["Antônio Silva Façanha"])

    def test_cada_palavra_precisa_estar_no_nome(self):
        self.assertEqual(self.nomes(q="silva beatriz"), ["Ana Beatriz Silva Moura"])
        self.assertEqual(self.nomes(q="joao moura"), [])

    def test_ano_e_decada(self):
        self.assertEqual(self.nomes(ano=1962), ["Antônio Silva Façanha"])
        self.assertEqual(sorted(self.nomes(decada="1990-1999")), ["Ana Beatriz Silva Moura", "Beatriz Coelho Lima"])
        self.assertEqual(self.nomes(decada="1958–1969"), ["Antônio Silva Façanha"])
        self.assertEqual(self.nomes(q="beatriz", decada="1990-1999", ano=1992), ["Beatriz Coelho Lima"])

    def test_anos_do_diretorio_e_paginacao(self):
        for i in range(20):
            aluno(f"Pessoa Teste {i:02d}", 2010)
        r = self.get("/api/memorial/alunos/").json()
        self.assertEqual(r["anos"], [1962, 1992, 1998, 2007, 2010])
        self.assertEqual((r["total"], r["paginas"], len(r["resultados"])), (24, 2, 12))
        r2 = self.get("/api/memorial/alunos/", pagina=2).json()
        self.assertEqual(len(r2["resultados"]), 12)
        self.assertFalse({a["id"] for a in r["resultados"]} & {a["id"] for a in r2["resultados"]})

    def test_recentes_primeiro_com_selo_novo(self):
        Aluno.objects.update(checkin_em=timezone.now() - timedelta(days=5))
        novo = aluno("Zé Recém Chegado", 2001)
        r = self.get("/api/memorial/alunos/").json()["resultados"]
        self.assertEqual(r[0]["id"], novo.pk)
        self.assertTrue(r[0]["novo"])
        self.assertFalse(any(a["novo"] for a in r[1:]))
        self.assertEqual([a["nome"] for a in r[1:]], sorted([a["nome"] for a in r[1:]], key=normalizar))


class PrivacidadeTests(Base):
    def setUp(self):
        super().setUp()
        self.visivel = aluno("Ana Visível Silva", turma="3º A", instagram="ana.v")
        self.pendente = aluno("Bruno Pendente Silva", status=Aluno.Status.PENDENTE)
        self.oculto = aluno("Carla Oculta Silva", status=Aluno.Status.OCULTO)
        self.sem_consentimento = aluno("Davi Sem Termo Silva", consentimento=False)
        self.colega = aluno("Eva Colega Silva", turma="3o a")
        FotoAluno.objects.create(aluno=self.visivel, imagem=png(), legenda="aprovada", status=FotoAluno.Status.APROVADA)
        FotoAluno.objects.create(aluno=self.visivel, imagem=png(), legenda="pendente")
        FotoAluno.objects.create(aluno=self.visivel, imagem=png(), legenda="recusada", status=FotoAluno.Status.RECUSADA)

    def test_so_aprovados_com_consentimento_na_lista(self):
        r = self.get("/api/memorial/alunos/", q="silva").json()
        self.assertEqual({a["nome"] for a in r["resultados"]}, {"Ana Visível Silva", "Eva Colega Silva"})

    def test_perfis_invisiveis_dao_404(self):
        for a in (self.pendente, self.oculto, self.sem_consentimento):
            self.assertEqual(self.get(f"/api/memorial/alunos/{a.pk}/").status_code, 404)

    def test_perfil_sem_email_e_so_fotos_aprovadas(self):
        r = self.get(f"/api/memorial/alunos/{self.visivel.pk}/")
        corpo = r.content.decode()
        for proibido in ("email", "@x.com", "consentimento", "pessoa.real"):
            self.assertNotIn(proibido, corpo)
        p = r.json()
        self.assertEqual([f["legenda"] for f in p["fotos"]], ["aprovada"])
        self.assertEqual(p["instagram"], "ana.v")
        # "3o a" e "3º A" são a mesma turma; os invisíveis da mesma turma ficam de fora
        self.assertEqual([c["nome"] for c in p["colegas"]], ["Eva Colega Silva"])

    def test_nenhuma_resposta_tem_email(self):
        with open("/dev/null", "w") as nada:
            call_command("carregar_exemplo", stdout=nada)
        self.checkin()
        urls = ["/api/memorial/alunos/", "/api/memorial/checkin/", "/api/memorial/versao/?sala=5"]
        urls += [f"/api/memorial/sala/{n}/" for n in range(1, 6)]
        urls += [f"/api/memorial/alunos/{a.pk}/" for a in Aluno.objects.filter(status="aprovado", consentimento=True)]
        for url in urls:
            corpo = self.client.get(url).content.decode()
            self.assertNotIn(EMAIL, corpo, url)
            self.assertNotIn('"email"', corpo, url)
            self.assertNotIn("@x.com", corpo, url)


def modo_email():
    ConfiguracaoMemorial.objects.update_or_create(pk=ConfiguracaoMemorial.atual().pk, defaults={"modo_checkin": "email"})


class CheckinDiretoTests(Base):
    """Check-in direto (o padrão): gravado no primeiro envio, sem código."""

    def test_grava_no_primeiro_envio_com_fotos_e_sem_mandar_codigo(self):
        r = self.client.post("/api/memorial/checkin/", {
            "nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true", "fotos": png(),
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json(), {"ok": True})
        a = Aluno.objects.get()
        self.assertEqual(a.fotos.count(), 1)
        self.assertEqual(a.fotos.get().status, FotoAluno.Status.PENDENTE)  # as fotos sempre passam pela aprovação
        self.assertEqual([m for m in mail.outbox if m.to == [EMAIL]], [])  # nenhum e-mail ao visitante
        self.assertFalse(ConfirmacaoEmail.objects.exists())

    def test_config_diz_o_modo_ao_celular(self):
        self.assertIs(self.client.get("/api/memorial/checkin/").json()["confirmacaoEmail"], False)
        modo_email()
        self.assertIs(self.client.get("/api/memorial/checkin/").json()["confirmacaoEmail"], True)

    def test_mesmas_regras_de_email_e_ano_e_limite(self):
        self.assertEqual(self.checkin(ano="2017").status_code, 201)
        r = self.checkin(ano="2017", nome="Outra Pessoa Qualquer")
        self.assertEqual(r.status_code, 409)
        self.assertIn("já tem check-in para este ano", r.json()["erros"]["geral"])
        self.assertEqual(self.checkin(ano="2022").status_code, 201)
        self.assertEqual(self.checkin(ano="2024").status_code, 201)
        r = self.checkin(ano="2025")
        self.assertEqual(r.status_code, 409)
        self.assertIn("limite", r.json()["erros"]["geral"])
        self.assertEqual(Aluno.objects.count(), 3)

    def test_codigo_enviado_e_ignorado(self):
        self.assertEqual(self.checkin(codigo="123456").status_code, 201)
        self.assertEqual(Aluno.objects.count(), 1)

    def test_aprovar_perfis_continua_valendo(self):
        ConfiguracaoMemorial.objects.filter(pk=ConfiguracaoMemorial.atual().pk).update(aprovar_perfis=True)
        self.checkin()
        self.assertEqual(Aluno.objects.get().status, Aluno.Status.PENDENTE)

    def test_trocar_para_email_exige_envio_configurado(self):
        from django.forms.models import model_to_dict

        from memorial.admin import ConfiguracaoForm

        dados = {k: v for k, v in model_to_dict(ConfiguracaoMemorial.atual()).items() if v is not None}
        with override_settings(EMAIL_HOST="", EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend"):
            form = ConfiguracaoForm({**dados, "modo_checkin": "email"}, instance=ConfiguracaoMemorial.atual())
            self.assertFalse(form.is_valid())
            self.assertIn("EMAIL_HOST", form.errors["modo_checkin"][0])
            self.assertTrue(ConfiguracaoForm({**dados, "modo_checkin": "direto"}, instance=ConfiguracaoMemorial.atual()).is_valid())
        with override_settings(EMAIL_HOST="smtp.exemplo.invalid", EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend"):
            form = ConfiguracaoForm({**dados, "modo_checkin": "email"}, instance=ConfiguracaoMemorial.atual())
            self.assertTrue(form.is_valid(), form.errors)


class CheckinTests(Base):
    """Check-in por e-mail, com código (o modo direto está em CheckinDiretoTests)."""

    def setUp(self):
        super().setUp()
        modo_email()

    def test_cria_e_aparece_na_sala_5(self):
        r = self.checkin(instagram="@maria.souza")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json(), {"ok": True})  # sem eco de dados
        a = Aluno.objects.get()
        self.assertEqual((a.nome, a.ano, a.turma, a.instagram, a.status), ("Maria Clara Souza", 1998, "3º A", "maria.souza", "aprovado"))
        self.assertEqual(a.consentimento_versao, ConfiguracaoMemorial.atual().termo_versao)
        self.assertEqual(self.get("/api/memorial/alunos/", q="maria clara").json()["total"], 1)

    def test_mesmo_email_e_ano_recebe_aviso(self):
        self.checkin()
        mail.outbox.clear()
        # outro nome, turma e maiúsculas, mas o mesmo e-mail e ano: não grava um segundo check-in
        r = self.checkin(nome="Maria Clara Souza Lima", turma="3º B", email=EMAIL.upper())
        self.assertEqual(r.status_code, 202)  # a mesma resposta de um e-mail novo: a página não revela nada
        self.assertEqual(r.json(), {"ok": True, "codigo": "enviado"})
        self.assertEqual(Aluno.objects.count(), 1)
        self.assertEqual(Aluno.objects.get().nome, "Maria Clara Souza")
        [aviso] = mail.outbox
        self.assertEqual(aviso.to, [EMAIL])
        self.assertIn("já fez check-in", aviso.subject)
        self.assertIn("check-in de 1998", aviso.body)
        self.assertIn("recepção", aviso.body)
        self.assertIsNone(re.search(r"\b\d{6}\b", aviso.subject + aviso.body))  # sem código

    def test_ate_tres_checkins_por_email_em_anos_diferentes(self):
        # escola e faculdade do grupo, por exemplo: cada check-in de um ano
        for ano, turma in (("2017", "3º A"), ("2022", "Direito"), ("2024", "Pós")):
            self.assertEqual(self.checkin(ano=ano, turma=turma).status_code, 201, ano)
        self.assertEqual(sorted(Aluno.objects.values_list("ano", flat=True)), [2017, 2022, 2024])
        mail.outbox.clear()
        r = self.checkin(ano="2025", turma="MBA")
        self.assertEqual(r.status_code, 202)  # igual a um e-mail novo
        self.assertEqual(Aluno.objects.count(), 3)
        [aviso] = mail.outbox
        self.assertIn("já tem 3 check-ins", aviso.body)
        self.assertIsNone(re.search(r"\b\d{6}\b", aviso.subject + aviso.body))

    @override_settings(CHECKIN_MAX_POR_EMAIL=1)
    def test_limite_por_email_configuravel(self):
        self.assertEqual(self.checkin().status_code, 201)
        self.assertEqual(self.checkin(ano="2005").status_code, 202)
        self.assertEqual(Aluno.objects.count(), 1)

    def test_trocar_o_ano_depois_do_codigo_nao_burla_a_regra(self):
        self.checkin(ano="2017")
        antes = len(mail.outbox)
        dados = {"nome": "Maria Clara Souza", "ano": "2018", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        self.assertEqual(self.client.post("/api/memorial/checkin/", dados).status_code, 202)
        codigo = codigo_enviado(EMAIL, antes)  # código pedido para 2018, que ainda não tem check-in
        r = self.client.post("/api/memorial/checkin/", {**dados, "ano": "2017", "codigo": codigo})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(Aluno.objects.count(), 1)

    def test_perfil_oculto_continua_oculto(self):
        self.checkin()
        Aluno.objects.update(status=Aluno.Status.OCULTO)
        self.checkin()
        self.assertEqual(Aluno.objects.get().status, Aluno.Status.OCULTO)

    def test_nada_e_gravado_antes_do_codigo(self):
        r = self.client.post("/api/memorial/checkin/", {
            "nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true",
        })
        self.assertEqual(r.status_code, 202)
        self.assertEqual(Aluno.objects.count(), 0)
        [m] = mail.outbox
        self.assertEqual(m.to, [EMAIL])
        codigo = codigo_enviado(EMAIL)
        self.assertIn(codigo, m.body)
        self.assertNotIn(codigo, ConfirmacaoEmail.objects.get().codigo_hash)  # só o hash fica no banco

    def test_codigo_errado_expirado_usado_e_de_outro_email(self):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        post = lambda **d: self.client.post("/api/memorial/checkin/", {**base, **d})  # noqa: E731
        post()
        codigo = codigo_enviado(EMAIL)
        errado = f"{(int(codigo) + 1) % 1_000_000:06d}"
        r = post(codigo=errado)
        self.assertEqual((r.status_code, r.json()["erros"]["codigo"]), (400, "Código incorreto. Confira o e-mail e tente de novo."))
        self.assertEqual(post(codigo="12").json()["erros"]["codigo"], "Digite o código de 6 números que enviamos para o seu e-mail.")
        # o código vale só para o e-mail que o recebeu
        self.assertEqual(post(email="outra@exemplo.com", codigo=codigo).status_code, 400)
        # vencido
        ConfirmacaoEmail.objects.update(expira_em=timezone.now())
        self.assertIn("não vale mais", post(codigo=codigo).json()["erros"]["codigo"])
        self.assertEqual(Aluno.objects.count(), 0)
        # um novo código; depois de usado, não vale de novo
        post()
        codigo = codigo_enviado(EMAIL)
        self.assertEqual(post(codigo=f" {codigo[:3]} {codigo[3:]} ").status_code, 201)  # espaços não atrapalham
        self.assertEqual(post(codigo=codigo).status_code, 400)
        self.assertEqual(Aluno.objects.count(), 1)

    @override_settings(CHECKIN_CODIGO_TENTATIVAS=3)
    def test_tentativas_esgotadas_bloqueiam_o_codigo(self):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        self.client.post("/api/memorial/checkin/", base)
        codigo = codigo_enviado(EMAIL)
        errado = f"{(int(codigo) + 1) % 1_000_000:06d}"
        respostas = [self.client.post("/api/memorial/checkin/", {**base, "codigo": errado}).json()["erros"]["codigo"] for _ in range(3)]
        self.assertIn("Muitas tentativas", respostas[-1])
        r = self.client.post("/api/memorial/checkin/", {**base, "codigo": codigo})  # nem o certo vale mais
        self.assertIn("Muitas tentativas", r.json()["erros"]["codigo"])
        self.assertEqual(Aluno.objects.count(), 0)

    def test_pedir_outro_codigo_invalida_o_anterior(self):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        self.client.post("/api/memorial/checkin/", base)
        primeiro = codigo_enviado(EMAIL)
        self.client.post("/api/memorial/checkin/", base)
        segundo = codigo_enviado(EMAIL)
        if primeiro != segundo:
            self.assertEqual(self.client.post("/api/memorial/checkin/", {**base, "codigo": primeiro}).status_code, 400)
        self.assertEqual(self.client.post("/api/memorial/checkin/", {**base, "codigo": segundo}).status_code, 201)

    @override_settings(CHECKIN_CODIGO_INTERVALO=60, CHECKIN_CODIGO_POR_HORA=2)
    def test_reenvio_espera_e_tem_limite_por_hora(self):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        self.assertEqual(self.client.post("/api/memorial/checkin/", base).status_code, 202)
        r = self.client.post("/api/memorial/checkin/", base)
        self.assertEqual(r.status_code, 429)
        self.assertIn("Já enviamos um código", r.json()["erros"]["geral"])
        ConfirmacaoEmail.objects.update(criado_em=timezone.now() - timedelta(minutes=5))
        self.assertEqual(self.client.post("/api/memorial/checkin/", base).status_code, 202)
        ConfirmacaoEmail.objects.update(criado_em=timezone.now() - timedelta(minutes=5))
        self.assertEqual(self.client.post("/api/memorial/checkin/", base).status_code, 429)  # 2 por hora
        self.assertEqual(len(mail.outbox), 2)

    def test_foto_invalida_nao_gasta_o_codigo(self):
        base = {"nome": "Maria Clara Souza", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true"}
        self.client.post("/api/memorial/checkin/", base)
        codigo = codigo_enviado(EMAIL)
        falso = SimpleUploadedFile("foto.jpg", b"isto nao e uma imagem", content_type="image/jpeg")
        self.assertEqual(self.client.post("/api/memorial/checkin/", {**base, "codigo": codigo, "fotos": [falso]}).status_code, 400)
        self.assertEqual(self.client.post("/api/memorial/checkin/", {**base, "codigo": codigo, "fotos": [png()]}).status_code, 201)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", EMAIL_HOST="")
    def test_sem_envio_de_email_nao_ha_checkin(self):
        r = self.checkin()
        self.assertEqual(r.status_code, 503)
        self.assertIn("recepção", r.json()["erros"]["geral"])
        self.assertEqual(Aluno.objects.count(), 0)

    def test_falha_ao_enviar_o_codigo(self):
        with mock.patch("django.core.mail.EmailMessage.send", side_effect=OSError("smtp fora")):
            r = self.checkin()
        self.assertEqual(r.status_code, 503)
        self.assertEqual(Aluno.objects.count(), 0)

    def test_aprovar_perfis_deixa_pendente(self):
        c = ConfiguracaoMemorial.atual()
        c.aprovar_perfis = True
        c.save()
        self.checkin()
        self.assertEqual(Aluno.objects.get().status, Aluno.Status.PENDENTE)
        self.assertEqual(self.get("/api/memorial/alunos/").json()["total"], 0)

    def test_validacoes_com_as_mensagens_do_prototipo(self):
        casos = {
            "nome": ({"nome": "Maria"}, "Escreva nome e sobrenome."),
            "ano": ({"ano": ""}, "Escolha o ano em que estudou."),
            "turma": ({"turma": "  "}, "Informe a turma, por exemplo 3º A."),
        }
        for campo, (dados, msg) in casos.items():
            r = self.checkin(**dados)
            self.assertEqual(r.status_code, 400)
            self.assertEqual(r.json()["erros"][campo], msg)
        self.assertEqual(self.checkin(ano="1957").status_code, 400)
        self.assertEqual(self.checkin(ano=str(timezone.localdate().year + 1)).status_code, 400)
        self.assertIn("email", self.checkin(email="nao-e-email").json()["erros"])
        self.assertIn("consentimento", self.checkin(consentimento="false").json()["erros"])
        self.assertIn("instagram", self.checkin(instagram="com espaço").json()["erros"])
        self.assertEqual(Aluno.objects.count(), 0)

    def test_campo_isca_finge_sucesso_e_nao_grava(self):
        r = self.checkin(site="http://spam.example")
        self.assertEqual(r.status_code, 202)
        self.assertEqual(Aluno.objects.count(), 0)
        self.assertEqual(mail.outbox, [])  # nem o código é enviado

    def test_fotos_reencodadas_sem_exif_e_pendentes(self):
        r = self.checkin(fotos=[png((3000, 2000), "JPEG", exif=True), png()])
        self.assertEqual(r.status_code, 201)
        fotos = list(FotoAluno.objects.all())
        self.assertEqual(len(fotos), 2)
        self.assertTrue(all(f.status == FotoAluno.Status.PENDENTE for f in fotos))
        grande = max(fotos, key=lambda f: f.largura)
        self.assertEqual((grande.largura, grande.altura), (2560, 1707))
        with Image.open(grande.imagem.path) as img:
            self.assertEqual(img.format, "JPEG")
            self.assertEqual(len(img.getexif()), 0)
        # pendente: não aparece no perfil
        a = Aluno.objects.get()
        self.assertEqual(self.get(f"/api/memorial/alunos/{a.pk}/").json()["fotos"], [])

    def test_upload_invalido_recusado(self):
        falso = SimpleUploadedFile("foto.jpg", b"isto nao e uma imagem", content_type="image/jpeg")
        gif = png(formato="GIF")
        for arquivo in (falso, gif):
            r = self.checkin(fotos=[arquivo])
            self.assertEqual(r.status_code, 400)
            self.assertIn("fotos", r.json()["erros"])
        r = self.checkin(fotos=[png(), png(), png(), png()])
        self.assertEqual(r.json()["erros"]["fotos"], "Envie no máximo 3 fotos.")
        grande = SimpleUploadedFile("g.jpg", b"0" * (10 * 1024 * 1024 + 1), content_type="image/jpeg")
        self.assertEqual(self.checkin(fotos=[grande]).json()["erros"]["fotos"], "Cada foto pode ter até 10 MB.")
        self.assertEqual(Aluno.objects.count(), 0)
        self.assertEqual(FotoAluno.objects.count(), 0)

    @override_settings(REST_FRAMEWORK=limites("10/min", "60/hour"))
    def test_limite_de_frequencia(self):
        # cada check-in são dois envios: com 10/min passam 5 check-ins
        for i in range(5):
            self.assertEqual(self.checkin(email=f"p{i}@exemplo.com").status_code, 201)
        r = self.checkin(email="p6@exemplo.com")
        self.assertEqual(r.status_code, 429)
        self.assertEqual(Aluno.objects.count(), 5)
        # ler a configuração do formulário não é limitado
        self.assertEqual(self.client.get("/api/memorial/checkin/").status_code, 200)

    def test_configuracao_do_formulario(self):
        r = self.client.get("/api/memorial/checkin/").json()
        self.assertEqual(r["anoInicial"], 1958)
        self.assertEqual(r["termoVersao"], "1.0")
        self.assertIn("Autorizo", r["termoTexto"])


class SalaTests(Base):
    def setUp(self):
        super().setUp()
        self.s1 = Sala.objects.get(numero=1)
        self.s2 = Sala.objects.get(numero=2)
        Foto.objects.create(sala=self.s1, ano=1960, legenda="Com imagem", imagem=png())
        Foto.objects.create(sala=self.s1, ano=1961, legenda="Rascunho", publicado=False)

    def test_sala_traz_tudo_com_urls_relativas(self):
        r = self.get("/api/memorial/sala/1/").json()
        self.assertEqual(r["sala"]["nome"], "Fundação")
        self.assertEqual(r["config"]["anoInicial"], 1958)
        self.assertNotIn("marcos", r)  # a aba Marcos saiu do sistema
        self.assertEqual(len(r["fotos"]), 1)
        self.assertTrue(r["fotos"][0]["src"].startswith("/media/fotos/exibicao/"))
        self.assertFalse(r["demonstrativo"])

    def test_sala_inexistente_ou_inativa(self):
        self.assertEqual(self.client.get("/api/memorial/sala/9/").status_code, 404)
        Sala.objects.filter(numero=3).update(ativa=False)
        self.assertEqual(self.client.get("/api/memorial/sala/3/").status_code, 404)

    def test_versao_muda_so_com_a_propria_sala(self):
        v1 = self.get("/api/memorial/versao/", sala=1).json()["versao"]
        v2 = self.get("/api/memorial/versao/", sala=2).json()["versao"]
        Decada.objects.create(sala=self.s2, rotulo="1990", periodo="C", titulo="C")
        self.assertEqual(self.get("/api/memorial/versao/", sala=1).json()["versao"], v1)
        self.assertNotEqual(self.get("/api/memorial/versao/", sala=2).json()["versao"], v2)
        Foto.objects.filter(sala=self.s1).first().delete()
        self.assertNotEqual(self.get("/api/memorial/versao/", sala=1).json()["versao"], v1)
        self.assertEqual(self.client.get("/api/memorial/versao/").status_code, 400)


class ExemploTests(Base):
    def test_carregar_e_remover(self):
        real = aluno("Pessoa Real Silva")
        with open("/dev/null", "w") as nada:
            call_command("carregar_exemplo", stdout=nada)
            self.assertEqual(Apresentacao.objects.count(), 6)
            self.assertEqual(Decada.objects.count(), 42)  # 7 pontos na linha do tempo por espaço
            # a linha do tempo nova traz um marco por ponto, sem lista de acontecimentos
            self.assertEqual(Acontecimento.objects.count(), 0)
            self.assertEqual(Registro.objects.exclude(aluno_ref=real.pk).count(), 0)  # exemplo não é movimento real
            self.assertEqual(Aluno.objects.filter(demonstrativo=True).count(), 22)
            r = self.get("/api/memorial/sala/1/").json()
            self.assertTrue(r["demonstrativo"])
            self.assertGreater(len(r["fotos"]), 100)
            self.assertEqual(len(r["decadas"]), 7)
            self.assertEqual(len(r["decadas"][0]["acontecimentos"]), 0)
            # rótulo e etiqueta vêm do próprio ponto ("r" e "p" no tour.json), não da década genérica
            self.assertEqual((r["decadas"][0]["rotulo"], r["decadas"][0]["periodo"]), ("1958", "Pequeno Polegar"))
            self.assertGreater(len(r["apresentacao"]["texto"]), 0)
            sala6 = self.get("/api/memorial/sala/6/").json()
            self.assertEqual(sala6["sala"]["tipo"], "fechamento")
            self.assertEqual(len(sala6["decadas"]), 7)
            self.assertEqual(self.get("/api/memorial/alunos/", q="joao sil").json()["resultados"][0]["nome"],
                             "João Pedro da Silva Sales")
            call_command("carregar_exemplo", "--remover", stdout=nada)
        self.assertEqual(Foto.objects.count() + Decada.objects.count() + Apresentacao.objects.count(), 0)
        self.assertEqual(list(Aluno.objects.all()), [real])


class TextosTests(Base):
    def test_grava_so_os_textos_e_nao_troca_o_que_existe(self):
        with open("/dev/null", "w") as nada:
            call_command("carregar_textos", stdout=nada)
            self.assertEqual(Apresentacao.objects.filter(demonstrativo=False).count(), 6)
            self.assertEqual(Decada.objects.filter(demonstrativo=False).count(), 42)
            self.assertEqual(Foto.objects.count() + Aluno.objects.count(), 0)
            self.assertEqual(Registro.objects.count(), 0)
            r = self.get("/api/memorial/sala/1/").json()
            self.assertEqual(r["apresentacao"]["titulo"], "Onde tudo começou, em 1958")
            self.assertEqual((r["decadas"][0]["rotulo"], r["decadas"][0]["periodo"]), ("1958", "Pequeno Polegar"))

            # o que a equipe editou fica; rodar de novo não duplica
            Apresentacao.objects.filter(sala__numero=2).update(titulo="Editado pela equipe")
            call_command("carregar_textos", stdout=nada)
            self.assertEqual(Apresentacao.objects.count(), 6)
            self.assertEqual(Decada.objects.count(), 42)
            self.assertEqual(Apresentacao.objects.get(sala__numero=2).titulo, "Editado pela equipe")

            # o exemplo completo convive com os textos e o --remover não os apaga
            call_command("carregar_exemplo", stdout=nada)
            self.assertEqual(Apresentacao.objects.count(), 6)
            self.assertEqual(Decada.objects.count(), 42)
            self.assertGreater(Foto.objects.filter(demonstrativo=True).count(), 0)
            call_command("carregar_exemplo", "--remover", stdout=nada)
        self.assertEqual(Apresentacao.objects.count(), 6)
        self.assertEqual(Decada.objects.count(), 42)
        self.assertEqual(Foto.objects.count() + Aluno.objects.count(), 0)


class SeisEspacosTests(Base):
    def test_salas_iguais_as_do_frontend(self):
        salas = list(Sala.objects.values_list("numero", "slug", "cor", "tipo"))
        self.assertEqual(salas, [
            (1, "fundacao", "#8E6918", "conteudo"), (2, "diretores", "#2F62B0", "conteudo"),
            (3, "professores", "#17805F", "conteudo"), (4, "artes", "#C43F60", "conteudo"),
            (5, "esporte", "#B85A0C", "conteudo"), (6, "alunos", "#6E4BA8", "fechamento"),
        ])

    def test_titulos_das_salas_iguais_aos_do_frontend(self):
        # migração 0017: os mesmos títulos de frontend/src/dados/salas.ts, sem subtítulo
        self.assertEqual(list(Sala.objects.values_list("numero", "nome", "titulo", "subtitulo")), [
            (1, "Fundação", "Nossas Origens", ""), (2, "Diretores", "Liderança e Legado", ""),
            (3, "Professores", "Mestres de Gerações", ""), (4, "Artes", "Palco e Ateliê", ""),
            (5, "Esportes", "Campeões", ""), (6, "Alunos", "Memórias vivas", ""),
        ])

    def test_apresentacao_e_decadas_no_contrato(self):
        sala = Sala.objects.get(numero=6)
        Apresentacao.objects.create(sala=sala, titulo="Abertura", texto="Um.\n\n  Dois.\n", foto=png(), legenda="L", icone="home")
        d = Decada.objects.create(sala=sala, rotulo="Anos 60", periodo="1958 a 1969", titulo="T", resumo="R", icone="cap", foto=png())
        Acontecimento.objects.create(decada=d, ano=1958, texto="Segundo", ordem=2)
        Acontecimento.objects.create(decada=d, ano=1960, texto="Primeiro", ordem=1)
        Decada.objects.create(sala=sala, rotulo="Oculta", periodo="x", titulo="x", publicado=False)
        r = self.get("/api/memorial/sala/6/").json()
        self.assertEqual(r["apresentacao"]["texto"], ["Um.", "Dois."])
        self.assertTrue(r["apresentacao"]["foto"].startswith("/media/fotos/epoca/"))  # /media/fotos/ fica no cache offline
        self.assertEqual(len(r["decadas"]), 1)
        self.assertEqual([e["texto"] for e in r["decadas"][0]["acontecimentos"]], ["Primeiro", "Segundo"])
        self.assertTrue(r["decadas"][0]["foto"].endswith(".jpg"))

    def test_sala_sem_conteudo_novo_deixa_o_app_derivar(self):
        r = self.get("/api/memorial/sala/2/").json()
        self.assertIsNone(r["apresentacao"])
        self.assertEqual(r["decadas"], [])

    def test_versao_muda_com_decada_e_acontecimento(self):
        sala = Sala.objects.get(numero=1)
        versao = lambda: self.get("/api/memorial/versao/", sala=1).json()["versao"]  # noqa: E731
        v = versao()
        d = Decada.objects.create(sala=sala, rotulo="A", periodo="B", titulo="C")
        v2 = versao()
        self.assertNotEqual(v, v2)
        e = Acontecimento.objects.create(decada=d, ano=1960, texto="x")
        v3 = versao()
        self.assertNotEqual(v2, v3)
        e.delete()
        self.assertNotEqual(v3, versao())

    def test_sala_6_mostra_selo_com_conteudo_de_exemplo(self):
        sala = Sala.objects.get(numero=6)
        self.assertFalse(self.get("/api/memorial/sala/6/").json()["demonstrativo"])
        Decada.objects.create(sala=sala, rotulo="1958", periodo="P", titulo="M", demonstrativo=True)
        self.assertTrue(self.get("/api/memorial/sala/6/").json()["demonstrativo"])

    def test_acao_publicar_muda_a_versao_do_totem(self):
        sala = Sala.objects.get(numero=1)
        m = Decada.objects.create(sala=sala, rotulo="1958", periodo="P", titulo="M")
        v = self.get("/api/memorial/versao/", sala=1).json()["versao"]
        admin_user = User.objects.create_superuser("chefe", password="senha-longa-1")
        self.client.force_login(admin_user)
        self.client.post("/admin/memorial/decada/", {
            "action": "despublicar", "_selected_action": [m.pk],
        })
        self.assertFalse(Decada.objects.get(pk=m.pk).publicado)
        self.assertNotEqual(self.get("/api/memorial/versao/", sala=1).json()["versao"], v)
        self.assertTrue(Registro.objects.filter(descricao__startswith="Tirado do totem", autor="chefe").exists())

    def test_admin_abre_com_as_abas_novas(self):
        self.client.force_login(User.objects.create_superuser("chefe", password="senha-longa-1"))
        sala = Sala.objects.get(numero=6)
        pagina = self.client.get(f"/admin/memorial/sala/{sala.pk}/change/").content.decode()
        for campo in ("apresentacao_set-0-titulo", "decada_set-TOTAL_FORMS", "video_set-TOTAL_FORMS"):
            self.assertIn(campo, pagina)
        self.assertNotIn("marco_set", pagina)
        d = Decada.objects.create(sala=sala, rotulo="A", periodo="B", titulo="C")
        self.assertIn("acontecimentos-0-texto", self.client.get(f"/admin/memorial/decada/{d.pk}/change/").content.decode())


@override_settings(MEDIA_ROOT=MEDIA, CACHES=CACHE, REST_FRAMEWORK=limites("1000/min"))
class RegistroTests(Base):
    URL = "/administracao/registro/"
    CSV = "/administracao/exportar.csv"

    def setUp(self):
        super().setUp()
        Registro.objects.all().delete()
        self.chefe = User.objects.create_superuser("chefe", password="senha-longa-1")
        Registro.objects.all().delete()

    def checkin(self, **extra):
        dados = {"nome": "Maria Conceição", "ano": "1998", "turma": "3º A", "email": EMAIL, "consentimento": "true", **extra}
        return fazer_checkin(self.client, dados)

    def test_checkin_novo_e_foto(self):
        self.assertEqual(self.checkin(fotos=png()).status_code, 201)
        self.assertEqual(self.checkin().status_code, 409)  # o mesmo e-mail e ano de novo: não grava nem registra nada
        tipos = list(Registro.objects.order_by("id").values_list("tipo", "direcao", "autor"))
        self.assertEqual(tipos, [("checkin_novo", "entrada", "Visitante"), ("foto_enviada", "entrada", "Visitante")])

    def test_nunca_guarda_email(self):
        self.checkin()
        aluno_obj = Aluno.objects.get()
        aluno_obj.instagram = "fulano"
        aluno_obj.save()
        for r in Registro.objects.all():
            self.assertNotIn(EMAIL, f"{r.descricao} {r.autor} {r.busca}")

    def test_campo_isca_nao_registra(self):
        self.checkin(site="http://robo")
        self.assertEqual(Registro.objects.count(), 0)

    def test_remover_ex_aluno_apaga_o_nome_dos_registros(self):
        self.checkin(fotos=png())
        aluno_obj = Aluno.objects.get()
        pk = aluno_obj.pk
        aluno_obj.delete()
        for r in Registro.objects.all():
            self.assertNotIn("Maria", r.descricao)
            self.assertNotIn("maria", r.busca)
        self.assertTrue(Registro.objects.filter(tipo="aluno_removido", direcao="saida", aluno_ref=pk).exists())

    def test_alteracoes_da_equipe_com_autor(self):
        self.client.force_login(self.chefe)
        self.assertTrue(Registro.objects.filter(tipo="login", autor="chefe", direcao="entrada").exists())
        sala = Sala.objects.get(numero=1)
        self.client.post("/admin/memorial/decada/add/", {
            "sala": sala.pk, "rotulo": "1960", "periodo": "P", "titulo": "Novo", "icone": "star", "ordem": 0, "publicado": "on",
            **_mgmt("acontecimentos"),
        })
        self.assertTrue(Registro.objects.filter(tipo="cadastro_criado", autor="chefe", descricao__contains="Novo").exists())
        m = Decada.objects.get()
        self.client.post(f"/admin/memorial/decada/{m.pk}/delete/", {"post": "yes"})
        self.assertTrue(Registro.objects.filter(tipo="cadastro_removido", direcao="saida", autor="chefe").exists())
        self.client.post("/admin/logout/")
        self.assertTrue(Registro.objects.filter(tipo="logout", autor="chefe", direcao="saida").exists())

    def test_login_recusado(self):
        self.client.post("/admin/login/", {"username": "chefe", "password": "errada"})
        self.assertTrue(Registro.objects.filter(tipo="login_recusado", descricao__contains="chefe").exists())
        self.assertNotIn("errada", str(list(Registro.objects.values_list("descricao", "busca"))))

    def test_login_nao_vira_alteracao_de_usuario(self):
        self.client.login(username="chefe", password="senha-longa-1")
        self.assertEqual(list(Registro.objects.values_list("tipo", flat=True)), ["login"])

    def test_acesso_ao_painel(self):
        self.assertRedirects(self.client.get(self.URL), f"/admin/login/?next={self.URL}")
        comum = User.objects.create_user("comum", password="senha-longa-1")
        self.client.force_login(comum)
        self.assertEqual(self.client.get(self.URL).status_code, 302)  # não é da equipe
        equipe = User.objects.create_user("equipe", password="senha-longa-1", is_staff=True)
        self.client.force_login(equipe)
        self.assertEqual(self.client.get(self.URL).status_code, 403)  # é da equipe, sem a permissão
        self.assertEqual(self.client.get(self.CSV).status_code, 403)
        equipe.groups.add(Group.objects.get(name="Administrativo"))
        equipe = User.objects.get(pk=equipe.pk)
        self.client.force_login(equipe)
        self.assertEqual(self.client.get(self.URL).status_code, 200)

    def test_filtros_do_painel(self):
        self.checkin()
        registrar(Registro.Tipo.EXPORTACAO, "Exportação antiga", autor="ana", em=timezone.now() - timedelta(days=10))
        self.client.force_login(self.chefe)
        def nomes(**filtros):
            return [r.descricao for r in self.client.get(self.URL, filtros).context["pagina"].object_list]
        self.assertIn("Check-in: Maria Conceição (1998, 3º A)", nomes(q="conceicao maria"))
        self.assertEqual(nomes(q="ana"), ["Exportação antiga"])
        self.assertEqual(nomes(direcao="saida", q="exportacao"), ["Exportação antiga"])
        self.assertEqual(nomes(tipo="checkin_novo"), ["Check-in: Maria Conceição (1998, 3º A)"])
        dez = (timezone.localdate() - timedelta(days=10)).isoformat()
        self.assertEqual(nomes(ate=dez), ["Exportação antiga"])
        self.assertEqual(self.client.get(self.URL, {"de": "lixo", "tipo": "lixo", "direcao": "lixo", "pagina": "lixo"}).status_code, 200)

    def test_html_do_visitante_e_escapado(self):
        registrar(Registro.Tipo.CHECKIN_NOVO, "Check-in: <script>alert(1)</script>", autor="Visitante")
        self.client.force_login(self.chefe)
        pagina = self.client.get(self.URL).content.decode()
        self.assertNotIn("<script>alert", pagina)

    def test_exportar_csv_fica_registrado_e_neutraliza_formula(self):
        registrar(Registro.Tipo.CHECKIN_NOVO, "=HYPERLINK(1)", autor="Visitante")
        self.client.force_login(self.chefe)
        r = self.client.get(self.CSV, {"tipo": "checkin_novo"})
        corpo = r.content.decode("utf-8-sig")
        self.assertEqual(r["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("'=HYPERLINK(1)", corpo)
        self.assertNotIn(";=HYPERLINK", corpo)
        self.assertEqual(len(corpo.strip().splitlines()), 2)
        self.assertTrue(Registro.objects.filter(tipo="exportacao", autor="chefe", direcao="saida").exists())
        self.assertEqual(_celula("-1"), "'-1")
        self.assertEqual(_celula("Maria"), "Maria")

    def test_registro_nao_edita_nem_apaga_no_admin(self):
        registro = registrar(Registro.Tipo.LOGIN, "x", autor="y")
        self.client.force_login(self.chefe)
        base = "/admin/memorial/registro/"
        self.assertEqual(self.client.get(base).status_code, 200)
        self.assertEqual(self.client.get(base + "add/").status_code, 403)
        self.assertEqual(self.client.post(f"{base}{registro.pk}/delete/", {"post": "yes"}).status_code, 403)
        self.assertEqual(self.client.post(f"{base}{registro.pk}/change/", {"descricao": "z"}).status_code, 403)


@override_settings(MEDIA_ROOT=MEDIA, CACHES=CACHE, REST_FRAMEWORK=limites("1000/min"))
class AprovacaoTests(Base):
    URL = "/administracao/"

    def setUp(self):
        super().setUp()
        self.chefe = User.objects.create_superuser("chefe", email="chefe@escola.test", password="senha-longa-1")
        self.adm = User.objects.create_user("adm", email="adm@escola.test", password="senha-longa-1", is_staff=True)
        self.adm.groups.add(Group.objects.get(name="Administrativo"))

    def checkin_foto(self, n=1):
        self.assertEqual(self.checkin(fotos=[png() for _ in range(n)]).status_code, 201)
        return list(FotoAluno.objects.order_by("id"))

    def test_foto_enviada_fica_fora_do_totem_ate_aprovar(self):
        foto = self.checkin_foto()[0]
        aluno_id = foto.aluno_id
        self.client.force_login(self.adm)
        pagina = self.client.get(self.URL)
        self.assertEqual(pagina.context["pendentes"]["fotos"], 1)
        self.assertContains(pagina, foto.miniatura.url)
        self.assertEqual(self.client.get(f"/api/memorial/alunos/{aluno_id}/").json()["fotos"], [])
        r = self.client.post(self.URL + "fotos/", {"acao": "aprovar", "selecionados": [foto.pk]}, follow=True)
        self.assertEqual(r.context["pendentes"]["fotos"], 0)
        self.assertEqual(len(self.client.get(f"/api/memorial/alunos/{aluno_id}/").json()["fotos"]), 1)
        self.assertTrue(Registro.objects.filter(descricao__startswith="Foto aprovada", autor="adm").exists())

    def test_aprovacao_so_nos_selecionados(self):
        a, b, c = self.checkin_foto(3)
        self.client.force_login(self.adm)
        self.client.post(self.URL + "fotos/", {"acao": "recusar", "selecionados": [a.pk, c.pk]})
        status = dict(FotoAluno.objects.values_list("pk", "status"))
        self.assertEqual([status[a.pk], status[b.pk], status[c.pk]], ["recusada", "pendente", "recusada"])

    def test_decisao_de_outra_pessoa_nao_e_sobrescrita(self):
        foto = self.checkin_foto()[0]
        FotoAluno.objects.filter(pk=foto.pk).update(status="recusada")
        self.client.force_login(self.adm)
        r = self.client.post(self.URL + "fotos/", {"acao": "aprovar", "selecionados": [foto.pk]}, follow=True)
        self.assertEqual(FotoAluno.objects.get(pk=foto.pk).status, "recusada")
        self.assertContains(r, "já tinha(m) sido decidido(s)")

    def test_sem_selecao_ou_acao_invalida_nao_muda_nada(self):
        foto = self.checkin_foto()[0]
        self.client.force_login(self.adm)
        self.assertContains(self.client.post(self.URL + "fotos/", {"acao": "aprovar"}, follow=True), "Selecione ao menos")
        self.client.post(self.URL + "fotos/", {"acao": "apagar", "selecionados": [foto.pk]})
        self.client.post(self.URL + "fotos/", {"acao": "aprovar", "selecionados": ["x"]})
        self.assertEqual(FotoAluno.objects.get(pk=foto.pk).status, "pendente")

    def test_get_nao_decide_e_post_exige_csrf(self):
        foto = self.checkin_foto()[0]
        self.client.force_login(self.adm)
        self.assertEqual(self.client.get(self.URL + "fotos/", {"acao": "aprovar", "selecionados": [foto.pk]}).status_code, 405)
        rigoroso = Client(enforce_csrf_checks=True)
        rigoroso.force_login(self.adm)
        self.assertEqual(rigoroso.post(self.URL + "fotos/", {"acao": "aprovar", "selecionados": [foto.pk]}).status_code, 403)
        self.assertEqual(FotoAluno.objects.get(pk=foto.pk).status, "pendente")

    def test_cadastros_pendentes(self):
        config = ConfiguracaoMemorial.atual()
        config.aprovar_perfis = True
        config.save()
        self.checkin()
        a = Aluno.objects.get()
        self.assertEqual(a.status, "pendente")
        self.client.force_login(self.adm)
        pagina = self.client.get(self.URL)
        self.assertContains(pagina, a.nome)
        self.assertNotContains(pagina, a.email)
        self.assertEqual(self.client.get(f"/api/memorial/alunos/{a.pk}/").status_code, 404)
        self.client.post(self.URL + "cadastros/", {"acao": "aprovar", "selecionados": [a.pk]})
        self.assertEqual(self.client.get(f"/api/memorial/alunos/{a.pk}/").status_code, 200)

    def test_tela_avisa_quando_a_aprovacao_de_cadastros_esta_desligada(self):
        self.client.force_login(self.adm)
        self.assertContains(self.client.get(self.URL), "sem passar por aqui")
        config = ConfiguracaoMemorial.atual()
        config.aprovar_perfis = True
        config.save()
        self.assertNotContains(self.client.get(self.URL), "sem passar por aqui")

    def test_acesso_e_contagem(self):
        self.assertEqual(self.client.get(self.URL).status_code, 302)
        self.assertEqual(self.client.post(self.URL + "fotos/", {"acao": "aprovar"}).status_code, 302)
        so_registro = User.objects.create_user("leitor", password="senha-longa-1", is_staff=True)
        so_registro.user_permissions.add(Permission.objects.get(codename="view_registro"))
        self.client.force_login(so_registro)
        self.assertRedirects(self.client.get(self.URL), "/administracao/registro/")
        self.assertEqual(self.client.post(self.URL + "fotos/", {"acao": "aprovar"}).status_code, 403)
        self.checkin_foto(2)
        self.assertEqual(self.client.get(self.URL + "pendencias.json").json()["total"], 0)  # não pode aprovar
        self.client.force_login(self.adm)
        self.assertEqual(self.client.get(self.URL + "pendencias.json").json(), {"fotos": 2, "cadastros": 0, "total": 2})

    def test_nome_do_visitante_e_escapado(self):
        self.checkin_foto()
        Aluno.objects.update(nome="<img src=x onerror=alert(1)>")
        self.client.force_login(self.adm)
        self.assertNotContains(self.client.get(self.URL), "<img src=x")

    def test_sem_email_configurado_nao_envia(self):
        self.checkin_foto()
        self.assertEqual(avisos_a_equipe(), [])

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_email_com_a_foto_para_quem_aprova(self):
        User.objects.create_user("comum", email="comum@escola.test", password="senha-longa-1", is_staff=True)
        self.checkin_foto(2)
        self.assertEqual(sorted(m.to[0] for m in avisos_a_equipe()), ["adm@escola.test", "chefe@escola.test"])
        m = avisos_a_equipe()[0]
        # logo + 2 fotos dentro da mensagem (Content-ID), mostradas no HTML
        tipos = [img.get_content_type() for img in m.attachments]
        self.assertEqual(tipos, ["image/png", "image/jpeg", "image/jpeg"])
        [(html, _)] = m.alternatives
        self.assertIn("cid:foto-1", html)
        self.assertIn("cid:foto-2", html)
        self.assertIn("Maria Clara Souza", m.subject)
        self.assertIn("http://testserver/administracao/", m.body)
        self.assertIn("http://testserver/administracao/", html)
        self.assertNotIn(EMAIL, m.body + m.subject + html)
        self.assertTrue(Registro.objects.filter(tipo="aviso_email", direcao="saida").exists())

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_checkin_sem_foto_e_sem_aprovacao_nao_avisa(self):
        self.checkin()
        self.assertEqual(avisos_a_equipe(), [])

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_falha_no_email_nao_derruba_o_checkin(self):
        with mock.patch("memorial.notificacoes.get_connection", side_effect=OSError("smtp fora")):
            self.assertEqual(self.checkin(fotos=png()).status_code, 201)
        self.assertEqual(FotoAluno.objects.count(), 1)

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_remover_ex_aluno_apaga_o_nome_do_aviso(self):
        self.checkin_foto()
        Aluno.objects.get().delete()
        self.assertFalse(Registro.objects.filter(descricao__contains="Maria").exists())


def _mgmt(prefixo, total=0, iniciais=0):
    return {f"{prefixo}-TOTAL_FORMS": total, f"{prefixo}-INITIAL_FORMS": iniciais, f"{prefixo}-MIN_NUM_FORMS": 0, f"{prefixo}-MAX_NUM_FORMS": 1000}


@override_settings(MEDIA_ROOT=MEDIA, CACHES=CACHE, REST_FRAMEWORK=limites("1000/min"))
class GestaoTests(Base):
    BASE = "/administracao/gerir"

    def setUp(self):
        super().setUp()
        self.chefe = User.objects.create_superuser("chefe", password="senha-longa-1")
        self.client.force_login(self.chefe)
        self.sala = Sala.objects.get(numero=1)

    def dados_sala(self, **extra):
        s = self.sala
        return {
            "numero": s.numero, "slug": s.slug, "nome": s.nome, "titulo": s.titulo, "subtitulo": s.subtitulo, "cor": s.cor,
            "tipo": s.tipo, "ativa": "on", **_mgmt("apresentacao_set"), **_mgmt("decada_set"),
            **_mgmt("video_set"), **extra,
        }

    def test_todo_modelo_do_admin_tem_secao_no_painel(self):
        registrados = set(admin.site._registry) - {Group, User, Registro}
        self.assertEqual(registrados, {s.modelo for s in SECOES})

    def test_mesmos_campos_do_admin_em_cada_formulario(self):
        for secao in SECOES:
            ma = secao.admin
            url = f"{self.BASE}/{secao.slug}/novo/"
            if secao.modelo is ConfiguracaoMemorial:
                url = f"{self.BASE}/{secao.slug}/{ConfiguracaoMemorial.atual().pk}/"
            elif not ma.has_add_permission(mock.Mock(user=self.chefe)):
                continue
            pagina = self.client.get(url)
            self.assertEqual(pagina.status_code, 200, secao.slug)
            html = pagina.content.decode()
            somente_leitura = set(ma.readonly_fields)
            for nome in flatten_fieldsets(ma.get_fieldsets(mock.Mock(user=self.chefe), None)):
                if nome not in somente_leitura:
                    self.assertIn(f'name="{nome}"', html, f"{secao.slug}: {nome}")

    def test_campos_de_imagem_pedem_recorte_no_formato_do_totem(self):
        esperado = {
            "decadas": ('name="foto"', "6:5"), "fotos": ('name="imagem"', "16:9"),
            "videos": ('name="capa"', "16:9"), "alunos": ('name="foto"', "1:1"),
        }
        for slug, (campo, proporcao) in esperado.items():
            html = self.client.get(f"{self.BASE}/{slug}/novo/").content.decode()
            tag = next(t for t in html.split("<input") if campo in t)
            self.assertIn(f'data-recorte="{proporcao}"', tag, slug)
        html = self.client.get(f"{self.BASE}/salas/{self.sala.pk}/").content.decode()
        self.assertIn('data-recorte="6:5"', next(t for t in html.split("<input") if 'name="apresentacao_set-0-foto"' in t))
        self.assertIn('data-recorte="16:9"', next(t for t in html.split("<input") if 'name="enviar_fotos"' in t))

    def test_toda_lista_abre_com_e_sem_dados(self):
        for secao in SECOES:
            r = self.client.get(f"{self.BASE}/{secao.slug}/", follow=True)
            self.assertEqual(r.status_code, 200, secao.slug)
        Decada.objects.create(sala=self.sala, rotulo="1958", periodo="P", titulo="Primeira", foto=png())
        self.assertContains(self.client.get(f"{self.BASE}/decadas/"), "Primeira")
        self.assertEqual(self.client.get(f"{self.BASE}/marcos/").status_code, 404)  # a seção Marcos saiu
        self.assertEqual(self.client.get(f"{self.BASE}/nada/").status_code, 404)

    def test_busca_filtro_e_acao(self):
        a = Decada.objects.create(sala=self.sala, rotulo="1958", periodo="P", titulo="Alfa")
        Decada.objects.create(sala=Sala.objects.get(numero=2), rotulo="1960", periodo="P", titulo="Beta")
        titulos = lambda **f: [l["obj"].titulo for l in self.client.get(f"{self.BASE}/decadas/", f).context["linhas"]]  # noqa: E731
        self.assertEqual(titulos(q="alf"), ["Alfa"])
        self.assertEqual(titulos(sala=self.sala.pk), ["Alfa"])
        self.assertEqual(sorted(titulos(sala="lixo", publicado="lixo")), ["Alfa", "Beta"])
        self.assertEqual(titulos(publicado="0"), [])
        self.client.post(f"{self.BASE}/decadas/", {"acao": "despublicar", "selecionados": [a.pk]})
        self.assertFalse(Decada.objects.get(pk=a.pk).publicado)
        self.assertEqual(sorted(titulos(publicado="1")), ["Beta"])

    def test_criar_com_foto_e_registrar_quem_fez(self):
        r = self.client.post(f"{self.BASE}/decadas/novo/", {
            "sala": self.sala.pk, "rotulo": "1970", "periodo": "P", "titulo": "Novo", "resumo": "longo", "icone": "home",
            "foto": png(), "ordem": 0, "publicado": "on", **_mgmt("acontecimentos"),
        })
        self.assertRedirects(r, f"{self.BASE}/decadas/")
        m = Decada.objects.get()
        self.assertEqual((m.resumo, m.icone), ("longo", "home"))
        self.assertTrue(m.foto.name.startswith("fotos/epoca/"))
        self.assertTrue(Registro.objects.filter(tipo="cadastro_criado", autor="chefe", descricao__contains="Novo").exists())
        self.assertTrue(LogEntry.objects.filter(object_id=m.pk).exists())  # histórico do admin do Django

    def test_erro_nao_salva_e_mostra_a_mensagem(self):
        r = self.client.post(f"{self.BASE}/decadas/novo/", {
            "sala": self.sala.pk, "rotulo": "", "periodo": "", "titulo": "", "icone": "home", "ordem": 0, **_mgmt("acontecimentos"),
        })
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Nada foi salvo")
        self.assertEqual(Decada.objects.count(), 0)

    def test_sala_salva_com_inlines_e_formularios_vazios(self):
        url = f"{self.BASE}/salas/{self.sala.pk}/"
        self.assertContains(self.client.get(url), 'name="apresentacao_set-0-titulo"')
        dados = self.dados_sala(nome="Fundação Nova", **_mgmt("apresentacao_set", 1), **{
            "apresentacao_set-0-titulo": "Abertura", "apresentacao_set-0-texto": "Um.", "apresentacao_set-0-icone": "image",
            "apresentacao_set-0-publicado": "on", **_mgmt("decada_set", 1), "decada_set-0-rotulo": "1958", "decada_set-0-periodo": "P",
            "decada_set-0-titulo": "M", "decada_set-0-icone": "star", "decada_set-0-ordem": 0, "decada_set-0-publicado": "on",
        })
        self.assertEqual(self.client.post(url, dados).status_code, 302)
        self.sala.refresh_from_db()
        self.assertEqual(self.sala.nome, "Fundação Nova")
        self.assertEqual(self.sala.apresentacao_set.get().titulo, "Abertura")
        self.assertEqual(self.sala.decada_set.get().titulo, "M")

    def test_sala_envia_varias_fotos_como_no_admin(self):
        url = f"{self.BASE}/salas/{self.sala.pk}/"
        self.client.post(url, self.dados_sala(enviar_fotos=[png(), png()], ano_das_fotos=1960))
        self.assertEqual(self.sala.foto_set.count(), 2)

    def test_acontecimentos_na_pagina_da_decada(self):
        d = Decada.objects.create(sala=self.sala, rotulo="A", periodo="B", titulo="C")
        self.client.post(f"{self.BASE}/decadas/{d.pk}/", {
            "sala": self.sala.pk, "rotulo": "A", "periodo": "B", "titulo": "C", "icone": "star", "ordem": 0, "publicado": "on",
            **_mgmt("acontecimentos", 1), "acontecimentos-0-ano": 1960, "acontecimentos-0-texto": "Fato", "acontecimentos-0-ordem": 0,
        })
        self.assertEqual(d.acontecimentos.get().texto, "Fato")

    def test_apagar_pede_confirmacao_e_mostra_a_cascata(self):
        d = Decada.objects.create(sala=self.sala, rotulo="A", periodo="B", titulo="C")
        Acontecimento.objects.create(decada=d, ano=1960, texto="x")
        url = f"{self.BASE}/decadas/apagar/"
        r = self.client.post(url, {"selecionados": [d.pk]})
        self.assertContains(r, "Apagar definitivamente")
        self.assertTrue(Decada.objects.filter(pk=d.pk).exists())
        self.client.post(url, {"selecionados": [d.pk], "confirmar": "1"})
        self.assertFalse(Decada.objects.filter(pk=d.pk).exists())
        self.assertEqual(self.client.get(url).status_code, 405)

    def test_configuracao_mostra_o_aceite_de_checkins_como_opcoes(self):
        html = self.client.get(f"{self.BASE}/configuracao/{ConfiguracaoMemorial.atual().pk}/").content.decode()
        self.assertIn("campo-form--opcoes", html)
        self.assertIn("Via check-in direto, com aprovação", html)
        self.assertIn("Via e-mail, com código de segurança", html)
        self.assertRegex(html, r'type="radio" name="modo_checkin" value="direto"[^>]*checked')

    def test_configuracao_abre_direto_e_nao_apaga(self):
        r = self.client.get(f"{self.BASE}/configuracao/", follow=True)
        self.assertContains(r, 'name="aprovar_perfis"')
        self.assertEqual(self.client.post(f"{self.BASE}/configuracao/apagar/", {"selecionados": [1]}).status_code, 403)
        self.assertEqual(self.client.get(f"{self.BASE}/configuracao/novo/").status_code, 403)

    def test_permissoes_do_grupo_administrativo(self):
        adm = User.objects.create_user("adm", password="senha-longa-1", is_staff=True)
        adm.groups.add(Group.objects.get(name="Administrativo"))
        self.client.force_login(adm)
        self.assertEqual(self.client.get(f"{self.BASE}/salas/").status_code, 403)
        self.assertEqual(self.client.post(f"{self.BASE}/salas/{self.sala.pk}/", self.dados_sala(nome="X")).status_code, 403)
        self.sala.refresh_from_db()
        self.assertNotEqual(self.sala.nome, "X")
        pagina = self.client.get(f"{self.BASE}/alunos/")
        self.assertEqual(pagina.status_code, 200)
        nomes = [s.slug for secoes in pagina.context["menu"].values() for s in secoes]
        self.assertEqual(nomes, ["alunos", "fotos-alunos"])
        self.assertEqual(self.client.post(f"{self.BASE}/alunos/apagar/", {"selecionados": [1]}).status_code, 403)

    def test_quem_so_ve_nao_altera(self):
        leitor = User.objects.create_user("leitor", password="senha-longa-1", is_staff=True)
        leitor.user_permissions.add(Permission.objects.get(codename="view_decada"))
        m = Decada.objects.create(sala=self.sala, rotulo="1958", periodo="P", titulo="T")
        self.client.force_login(leitor)
        pagina = self.client.get(f"{self.BASE}/decadas/{m.pk}/")
        self.assertContains(pagina, "não alterá-los")
        self.assertNotContains(pagina, ">Salvar<")
        self.assertEqual(self.client.post(f"{self.BASE}/decadas/{m.pk}/", {"titulo": "Z"}).status_code, 403)
        self.assertEqual(self.client.post(f"{self.BASE}/decadas/", {"acao": "despublicar", "selecionados": [m.pk]}).status_code, 302)
        self.assertTrue(Decada.objects.get(pk=m.pk).publicado)

    def test_anonimo_vai_para_o_login_e_post_exige_csrf(self):
        self.client.logout()
        self.assertEqual(self.client.get(f"{self.BASE}/salas/").status_code, 302)
        rigoroso = Client(enforce_csrf_checks=True)
        rigoroso.force_login(self.chefe)
        self.assertEqual(rigoroso.post(f"{self.BASE}/decadas/apagar/", {"selecionados": [1]}).status_code, 403)

    def test_texto_cadastrado_e_escapado(self):
        Decada.objects.create(sala=self.sala, rotulo="1958", periodo="P", titulo="<script>x</script>")
        self.assertNotContains(self.client.get(f"{self.BASE}/decadas/"), "<script>x")

    def test_todo_icone_do_modelo_tem_desenho_no_painel(self):
        html = (Path(__file__).parent / "templates/memorial/_icones.html").read_text(encoding="utf-8")
        for valor in Icone.values:
            self.assertIn(f'id="i-{valor}"', html)


class EstaticoTests(TestCase):
    def test_url_muda_com_o_conteudo_do_arquivo(self):
        """O nginx guarda /static/ por 30 dias: CSS novo precisa de URL nova."""
        with tempfile.TemporaryDirectory() as pasta:
            caminho = os.path.join(pasta, "a.css")
            with mock.patch("memorial.templatetags.painel.finders.find", return_value=caminho), override_settings(DEBUG=True):
                with open(caminho, "w") as f:
                    f.write("a{}")
                primeira = estatico("memorial/a.css")
                with open(caminho, "w") as f:
                    f.write("b{}")
                segunda = estatico("memorial/a.css")
        self.assertRegex(primeira, r"^/static/memorial/a\.css\?v=[0-9a-f]{12}$")
        self.assertNotEqual(primeira, segunda)

    def test_arquivo_ausente_nao_derruba_a_pagina(self):
        with override_settings(DEBUG=True):
            self.assertEqual(estatico("memorial/nao-existe.css"), "/static/memorial/nao-existe.css")

    def test_painel_usa_a_url_versionada(self):
        User.objects.create_superuser("chefe", password="x")
        self.client.login(username="chefe", password="x")
        html = self.client.get("/administracao/").content.decode()
        self.assertRegex(html, r'href="/static/memorial/administracao\.css\?v=[0-9a-f]{12}"')
        self.assertRegex(html, r'src="/static/memorial/administracao\.js\?v=[0-9a-f]{12}"')


class UtilTests(TestCase):
    def test_normalizar_e_turma(self):
        self.assertEqual(normalizar("  João  PEDRO  "), "joao pedro")
        self.assertEqual({chave_turma(t) for t in ("3º A", "3o a", "3ª A", "3 A", "3A")}, {"3a"})
        self.assertNotEqual(chave_turma("3º A"), chave_turma("3º B"))


class ObservabilidadeTests(TestCase):
    """O Sentry nunca recebe dados pessoais (LGPD): ver config/observabilidade.py."""

    def test_evento_sai_sem_corpo_query_cookies_cabecalhos_nem_usuario(self):
        from config.observabilidade import _limpar

        evento = {
            "request": {
                "url": "https://memorial.test/api/memorial/alunos/?q=maria+souza",
                "query_string": "q=maria+souza",
                "data": {"email": EMAIL, "nome": "Maria Clara Souza"},
                "cookies": {"sessionid": "segredo"},
                "headers": {"User-Agent": "Chrome", "Cookie": "sessionid=segredo", "X-Forwarded-For": "200.1.2.3"},
                "env": {"REMOTE_ADDR": "200.1.2.3"},
            },
            "user": {"email": EMAIL, "ip_address": "200.1.2.3"},
        }
        evento["exception"] = {"values": [{"type": "SMTPRecipientsRefused", "value": f"{{'{EMAIL}': (550, b'no')}}"}]}
        evento = _limpar(evento)
        limpo = json.dumps(evento)
        for proibido in (EMAIL, "Maria", "maria", "segredo", "200.1.2.3"):
            self.assertNotIn(proibido, limpo)
        self.assertIn("[e-mail]", evento["exception"]["values"][0]["value"])
        self.assertEqual(evento["request"]["url"], "https://memorial.test/api/memorial/alunos/")
        self.assertEqual(evento["request"]["headers"], {"User-Agent": "Chrome"})

    def test_transacao_sai_sem_query_nos_spans(self):
        from config.observabilidade import _limpar

        transacao = {
            "transaction": "/api/memorial/alunos/",
            "spans": [{"op": "http.client", "description": "GET https://memorial.test/api/memorial/alunos/?q=maria+souza"}],
        }
        limpo = json.dumps(_limpar(transacao))
        self.assertNotIn("maria", limpo)
        self.assertIn("GET https://memorial.test/api/memorial/alunos/", limpo)

    @mock.patch.dict(os.environ, {"SENTRY_DSN": ""})
    def test_sem_dsn_nao_liga(self):
        from config.observabilidade import iniciar_sentry

        self.assertFalse(iniciar_sentry())


# ---------------------------------------------------------------- redes sociais (até 3 por pessoa)

class RedesTests(Base):
    def perfil(self, a):
        return self.get(f"/api/memorial/alunos/{a.pk}/").json()

    def test_regras_iguais_as_do_frontend(self):
        from . import redes

        self.assertEqual(redes.validar("tiktok", "@maria.s"), ("tiktok", "maria.s"))
        self.assertEqual(redes.validar("instagram", "https://www.instagram.com/maria.souza/"), ("instagram", "maria.souza"))
        # um link de rede conhecida vale mais que o botão escolhido
        self.assertEqual(redes.validar("facebook", "https://br.linkedin.com/in/maria-souza?trk=x"), ("linkedin", "maria-souza"))
        self.assertEqual(redes.validar("outra", "https://www.Site.com/@maria/?x=1"), ("outra", "site.com/maria"))
        self.assertEqual(redes.validar("facebook", "https://lattes.cnpq.br/123"), ("outra", "lattes.cnpq.br/123"))
        for rede, usuario in [("x", "nome_grande_demais_1"), ("telegram", "abc"), ("outra", "sem-dominio"), ("orkut", "maria"),
                              ("instagram", "com espaço")]:
            with self.subTest(rede=rede, usuario=usuario), self.assertRaises(redes.RedeInvalida):
                redes.validar(rede, usuario)

    def test_formato_antigo_vai_e_volta(self):
        from . import redes

        casos = [
            (("maria.s", ""), [("instagram", "maria.s")]),
            (("", "maria.souza"), [("facebook", "maria.souza")]),
            (("", "facebook.com/maria.souza"), [("facebook", "maria.souza")]),
            (("", "tiktok/maria"), [("tiktok", "maria")]),
            (("", "outra/site.com/maria"), [("outra", "site.com/maria")]),
            (("", "pages/escola"), [("facebook", "pages/escola")]),  # caminho de página continua Facebook
            (("ana", "x/ana_s"), [("instagram", "ana"), ("x", "ana_s")]),
        ]
        for (ig, fb), esperado in casos:
            with self.subTest(ig=ig, fb=fb):
                self.assertEqual(redes.de_campos_antigos(ig, fb), esperado)
                volta = redes.campos_antigos(esperado)
                self.assertEqual(redes.de_campos_antigos(*volta), esperado)

    def test_checkin_do_frontend_atual_vira_rede_com_rotulo_certo(self):
        self.assertEqual(self.checkin(facebook="tiktok/maria.s").status_code, 201)
        a = Aluno.objects.get()
        self.assertEqual([(r.rede, r.usuario) for r in a.redes.all()], [("tiktok", "maria.s")])
        p = self.perfil(a)
        self.assertEqual(p["redes"], [{"rede": "tiktok", "rotulo": "TikTok", "usuario": "maria.s"}])
        self.assertEqual((p["instagram"], p["facebook"]), ("", "tiktok/maria.s"))  # o frontend antigo continua lendo

    def test_checkin_com_lista_de_ate_tres_redes(self):
        lista = [{"rede": "instagram", "usuario": "@maria"}, {"rede": "linkedin", "usuario": "maria-souza"},
                 {"rede": "outra", "usuario": "https://site.com/maria"}]
        self.assertEqual(self.checkin(redes=json.dumps(lista)).status_code, 201)
        a = Aluno.objects.get()
        p = self.perfil(a)
        self.assertEqual([r["rede"] for r in p["redes"]], ["instagram", "linkedin", "outra"])
        self.assertEqual(p["redes"][2]["link"], "https://site.com/maria")
        self.assertEqual((a.instagram, a.facebook), ("maria", "linkedin/maria-souza"))

    def test_checkin_recusa_rede_invalida_ou_mais_de_tres(self):
        r = self.checkin(redes=json.dumps([{"rede": "x", "usuario": "nome com espaço"}]))
        self.assertEqual(r.status_code, 400)
        self.assertIn("X", r.json()["erros"]["redes"])
        quatro = [{"rede": "github", "usuario": f"pessoa{i}"} for i in range(4)]
        self.assertIn("redes", self.checkin(redes=json.dumps(quatro)).json()["erros"])
        self.assertIn("redes", self.checkin(redes="não é json").json()["erros"])
        # formato antigo com prefixo também é conferido pela regra da rede
        self.assertIn("facebook", self.checkin(facebook="telegram/abc").json()["erros"])
        self.assertFalse(Aluno.objects.exists())

    def test_refazer_checkin_nao_troca_as_redes(self):
        self.checkin(instagram="maria", facebook="tiktok/maria")
        self.checkin(facebook="")
        a = Aluno.objects.get()
        self.assertEqual(sorted(a.redes.values_list("rede", flat=True)), ["instagram", "tiktok"])

    def test_cadastro_antigo_sem_rede_cadastrada_le_os_campos(self):
        a = aluno("Ana Antiga Silva", instagram="ana.v", facebook="outra/site.com/ana")
        self.assertEqual([r["rede"] for r in self.perfil(a)["redes"]], ["instagram", "outra"])

    def test_migracao_converte_e_volta(self):
        import importlib

        from django.apps import apps

        from .models import RedeSocial

        migracao = importlib.import_module("memorial.migrations.0014_redes_sociais")
        a = aluno("Ana Antiga Silva", instagram="ana.v", facebook="youtube/canal-ana")
        b = aluno("Beto Antigo Lima", facebook="facebook.com/beto")
        aluno("Caio Sem Redes")
        migracao.campos_para_redes(apps, None)
        self.assertEqual(sorted(RedeSocial.objects.values_list("aluno_id", "rede", "usuario")),
                         sorted([(a.pk, "instagram", "ana.v"), (a.pk, "youtube", "canal-ana"), (b.pk, "facebook", "beto")]))
        Aluno.objects.update(instagram="", facebook="")
        migracao.redes_para_campos(apps, None)
        self.assertEqual(Aluno.objects.filter(pk=a.pk).values_list("instagram", "facebook").get(), ("ana.v", "youtube/canal-ana"))
        self.assertEqual(Aluno.objects.filter(pk=b.pk).values_list("instagram", "facebook").get(), ("", "beto"))

    def test_total_de_colegas(self):
        a = aluno("Ana Turma Silva")
        for i in range(6):
            aluno(f"Colega Numero {chr(65 + i)}")
        aluno("Outra Turma Lima", turma="3º B")
        p = self.perfil(a)
        self.assertEqual((len(p["colegas"]), p["totalColegas"]), (4, 6))

    def test_painel_de_aprovacoes_mostra_o_rotulo_da_rede(self):
        ConfiguracaoMemorial.objects.update(aprovar_perfis=True)
        self.checkin(facebook="tiktok/maria.s")
        self.client.force_login(User.objects.create_superuser("chefe", password="senha-longa-1"))
        pagina = self.client.get("/administracao/")
        self.assertContains(pagina, "TikTok: tiktok.com/@maria.s")
        self.assertNotContains(pagina, "Facebook: tiktok")

    def test_painel_edita_as_redes_e_atualiza_os_campos_antigos(self):
        from .models import RedeSocial

        a = aluno("Ana Painel Silva", instagram="ana.v")
        rede = RedeSocial.objects.create(aluno=a, rede="instagram", usuario="ana.v")
        self.client.force_login(User.objects.create_superuser("chefe", password="senha-longa-1"))
        dados = {
            "nome": a.nome, "ano": a.ano, "turma": a.turma, "status": a.status, "email": a.email,
            **_mgmt("redes", total=3, iniciais=1), **_mgmt("fotos"),
            "redes-0-id": rede.pk, "redes-0-aluno": a.pk, "redes-0-rede": "instagram", "redes-0-usuario": "ana.v", "redes-0-ordem": 0,
            "redes-1-aluno": a.pk, "redes-1-rede": "facebook", "redes-1-usuario": "https://twitter.com/ana_s", "redes-1-ordem": 1,
            "redes-2-aluno": a.pk, "redes-2-rede": "github", "redes-2-usuario": "ana silva", "redes-2-ordem": 2,
        }
        url = f"/administracao/gerir/alunos/{a.pk}/"
        r = self.client.post(url, dados)
        self.assertEqual(r.status_code, 200)  # o GitHub com espaço não passa
        self.assertContains(r, "Confira o GitHub")
        dados["redes-2-usuario"] = "ana-silva"
        r = self.client.post(url, dados)
        self.assertEqual(r.status_code, 302)
        a.refresh_from_db()
        self.assertEqual([(x.rede, x.usuario) for x in a.redes.all()], [("instagram", "ana.v"), ("x", "ana_s"), ("github", "ana-silva")])
        self.assertEqual((a.instagram, a.facebook), ("ana.v", "x/ana_s"))
        # uma quarta rede é recusada
        dados.update({
            **_mgmt("redes", total=4, iniciais=3), "redes-3-aluno": a.pk, "redes-3-rede": "kwai", "redes-3-usuario": "ana", "redes-3-ordem": 3,
        })
        for i, x in enumerate(a.redes.all()):
            dados[f"redes-{i}-id"] = x.pk
        self.assertEqual(self.client.post(url, dados).status_code, 200)
        self.assertEqual(a.redes.count(), 3)

    def test_grupo_administrativo_edita_as_redes(self):
        a = aluno("Ana Grupo Silva")
        adm = User.objects.create_user("adm", password="senha-longa-1", is_staff=True)
        adm.groups.add(Group.objects.get(name="Administrativo"))
        self.client.force_login(adm)
        self.assertContains(self.client.get(f"/administracao/gerir/alunos/{a.pk}/"), "Adicionar rede social")

    def test_remover_ex_aluno_apaga_as_redes(self):
        from .models import RedeSocial

        self.checkin(instagram="maria")
        Aluno.objects.get().delete()
        self.assertFalse(RedeSocial.objects.exists())


# ---------------------------------------------------------------- e-mail de teste (SMTP)

class EmailTesteTests(Base):
    URL = "/administracao/email-teste/"

    def setUp(self):
        super().setUp()
        self.chefe = User.objects.create_superuser("chefe", email="chefe@escola.test", password="senha-longa-1")

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_envia_para_quem_clicou_e_registra(self):
        self.client.force_login(self.chefe)
        self.assertContains(self.client.get("/administracao/"), "Enviar e-mail de teste")
        r = self.client.post(self.URL, follow=True)
        self.assertContains(r, "E-mail de teste enviado")
        self.assertEqual([m.to for m in mail.outbox], [["chefe@escola.test"]])
        self.assertTrue(Registro.objects.filter(tipo="aviso_email", descricao__contains="teste").exists())

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_mostra_o_erro_do_servidor(self):
        import smtplib

        self.client.force_login(self.chefe)
        with mock.patch("django.core.mail.EmailMessage.send", side_effect=smtplib.SMTPAuthenticationError(535, b"no")):
            r = self.client.post(self.URL, follow=True)
        self.assertContains(r, "usuário ou senha recusados")

    def test_sem_email_host_nao_tenta(self):
        self.client.force_login(self.chefe)
        self.assertContains(self.client.post(self.URL, follow=True), "não está configurado")
        self.assertEqual(mail.outbox, [])

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_avisa_quando_ninguem_recebe(self):
        User.objects.update(email="")
        self.client.force_login(self.chefe)
        self.assertContains(self.client.get("/administracao/"), "ninguém recebe o aviso")

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_so_quem_configura_pode_testar(self):
        adm = User.objects.create_user("adm", email="adm@escola.test", password="senha-longa-1", is_staff=True)
        adm.groups.add(Group.objects.get(name="Administrativo"))
        self.client.force_login(adm)
        self.assertNotContains(self.client.get("/administracao/"), "Enviar e-mail de teste")
        self.assertEqual(self.client.post(self.URL).status_code, 403)

    @override_settings(EMAIL_HOST="smtp.escola.test")
    def test_comando_testar_email(self):
        call_command("testar_email", stdout=StringIO())
        self.assertEqual([m.to for m in mail.outbox], [["chefe@escola.test"]])


class SessaoPainelTests(TestCase):
    """/administracao/sessao/: o nginx pergunta se pode entregar fotos e vídeos a quem está fora da rede."""

    URL = "/administracao/sessao/"

    def test_sem_login_403_sem_redirecionar(self):
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 403)

    def test_equipe_logada_204(self):
        from django.contrib.auth.models import User
        User.objects.create_user("equipe", password="senha-longa-1", is_staff=True)
        self.client.login(username="equipe", password="senha-longa-1")
        r = self.client.get(self.URL)
        self.assertEqual(r.status_code, 204)
        self.assertIn("no-cache", r["Cache-Control"])

    def test_usuario_sem_equipe_403(self):
        from django.contrib.auth.models import User
        User.objects.create_user("comum", password="senha-longa-1")
        self.client.login(username="comum", password="senha-longa-1")
        self.assertEqual(self.client.get(self.URL).status_code, 403)

    def test_equipe_inativa_403(self):
        from django.contrib.auth.models import User
        u = User.objects.create_user("antiga", password="senha-longa-1", is_staff=True)
        self.client.force_login(u)
        u.is_active = False
        u.save()
        self.assertEqual(self.client.get(self.URL).status_code, 403)


class EmailVisualTests(TestCase):
    """E-mails com texto + HTML no visual do agendamento e a logo dentro da mensagem."""

    def test_codigo_em_texto_e_html_com_logo(self):
        from memorial.emails import montar
        m = montar("Memorial Dom Bosco: seu código de check-in é 012345", ["a@b.test"], "codigo",
                   {"primeiro": "Rafael", "codigo": "012345", "minutos": 15, "contato": "memorial@escola.test"},
                   "Seu código de confirmação é: 012345")
        [(html, tipo)] = m.alternatives
        self.assertEqual(tipo, "text/html")
        self.assertIn("012345", m.body)
        self.assertIn("012345", html)
        self.assertIn("Olá, Rafael!", html)
        self.assertIn('src="cid:logo"', html)
        self.assertIn("15 minutos", html)
        self.assertIn("mailto:memorial@escola.test", html)
        [logo] = m.attachments
        self.assertEqual(logo["Content-ID"], "<logo>")
        self.assertEqual(m.mixed_subtype, "related")
        # a mensagem montada é MIME válido: multipart/related com o alternative e a imagem
        bruto = m.message()
        self.assertEqual(bruto.get_content_type(), "multipart/related")
        self.assertEqual([p.get_content_type() for p in bruto.get_payload()], ["multipart/alternative", "image/png"])

    def test_html_escapa_o_nome(self):
        from memorial.emails import montar
        m = montar("x", ["a@b.test"], "codigo", {"primeiro": "<b>Ana</b>", "codigo": "1", "minutos": 15}, "x")
        [(html, _)] = m.alternatives
        self.assertIn("&lt;b&gt;Ana&lt;/b&gt;", html)
        self.assertNotIn("<b>Ana</b>", html)
