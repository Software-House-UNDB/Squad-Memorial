"""Testes da API do Memorial: busca, privacidade, check-in e versão por sala.

    python manage.py test memorial
"""

import json
import shutil
import tempfile
from datetime import timedelta
from io import BytesIO

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from .models import Aluno, ConfiguracaoMemorial, Foto, FotoAluno, Marco, Sala, chave_turma, normalizar

from django.conf import settings

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


@override_settings(MEDIA_ROOT=MEDIA, CACHES=CACHE, REST_FRAMEWORK=limites("1000/min"))
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
        return self.client.post("/api/memorial/checkin/", base)


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


class CheckinTests(Base):
    def test_cria_e_aparece_na_sala_5(self):
        r = self.checkin(instagram="@maria.souza")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json(), {"ok": True})  # sem eco de dados
        a = Aluno.objects.get()
        self.assertEqual((a.nome, a.ano, a.turma, a.instagram, a.status), ("Maria Clara Souza", 1998, "3º A", "maria.souza", "aprovado"))
        self.assertEqual(a.consentimento_versao, ConfiguracaoMemorial.atual().termo_versao)
        self.assertEqual(self.get("/api/memorial/alunos/", q="maria clara").json()["total"], 1)

    def test_mesmo_email_e_ano_atualiza(self):
        self.checkin()
        r = self.checkin(nome="Maria Clara Souza Lima", turma="3º B", email=EMAIL.upper())
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Aluno.objects.count(), 1)
        self.assertEqual(Aluno.objects.get().nome, "Maria Clara Souza Lima")
        self.checkin(ano="1999")
        self.assertEqual(Aluno.objects.count(), 2)

    def test_perfil_oculto_continua_oculto(self):
        self.checkin()
        Aluno.objects.update(status=Aluno.Status.OCULTO)
        self.checkin()
        self.assertEqual(Aluno.objects.get().status, Aluno.Status.OCULTO)

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
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Aluno.objects.count(), 0)

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

    @override_settings(REST_FRAMEWORK=limites("5/min", "30/hour"))
    def test_limite_de_frequencia(self):
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
        Marco.objects.create(sala=self.s1, ano=1958, titulo="A", descricao="a", destaque=True)
        Marco.objects.create(sala=self.s1, ano=1970, titulo="B", descricao="b", destaque=True)
        Foto.objects.create(sala=self.s1, ano=1960, legenda="Com imagem", imagem=png())
        Foto.objects.create(sala=self.s1, ano=1961, legenda="Rascunho", publicado=False)

    def test_sala_traz_tudo_com_urls_relativas(self):
        r = self.get("/api/memorial/sala/1/").json()
        self.assertEqual(r["sala"]["nome"], "Educação")
        self.assertEqual(r["config"]["anoInicial"], 1958)
        self.assertEqual([m["titulo"] for m in r["marcos"]], ["A", "B"])
        self.assertEqual([m["destaque"] for m in r["marcos"]], [False, True])  # um destaque por sala
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
        Marco.objects.create(sala=self.s2, ano=1990, titulo="C", descricao="c")
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
            self.assertEqual(Marco.objects.count(), 32)
            self.assertEqual(Aluno.objects.filter(demonstrativo=True).count(), 22)
            self.assertEqual(Marco.objects.filter(destaque=True).count(), 4)
            r = self.get("/api/memorial/sala/1/").json()
            self.assertTrue(r["demonstrativo"])
            self.assertGreater(len(r["fotos"]), 100)
            self.assertEqual(self.get("/api/memorial/alunos/", q="joao sil").json()["resultados"][0]["nome"],
                             "João Pedro da Silva Sales")
            call_command("carregar_exemplo", "--remover", stdout=nada)
        self.assertEqual(Marco.objects.count() + Foto.objects.count(), 0)
        self.assertEqual(list(Aluno.objects.all()), [real])


class UtilTests(TestCase):
    def test_normalizar_e_turma(self):
        self.assertEqual(normalizar("  João  PEDRO  "), "joao pedro")
        self.assertEqual({chave_turma(t) for t in ("3º A", "3o a", "3ª A", "3 A", "3A")}, {"3a"})
        self.assertNotEqual(chave_turma("3º A"), chave_turma("3º B"))
