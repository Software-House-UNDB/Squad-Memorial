"""Formatos da API pública, iguais a frontend/src/dados/tipos.ts.

Regra de privacidade: nada aqui lê `email`, IP ou dados de consentimento de um Aluno. Os testes
(tests.py) conferem que nenhuma resposta da API contém e-mail.
"""

import json
import re

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from . import redes as redes_sociais
from .models import Aluno, ConfiguracaoMemorial, FotoAluno, Registro, ano_atual
from .notificacoes import avisar_equipe
from .registro import VISITANTE, registrar, sem_registro


def _url(campo):
    # URL relativa (/media/...): o navegador resolve contra a origem do app, que pode ser o nginx
    # do compose ou o Vercel (que repassa /media ao servidor). Absoluta quebraria atrás de túnel/proxy.
    return campo.url if campo else None


# ---------------------------------------------------------------- totem

def montar_config(c: ConfiguracaoMemorial):
    return {
        "nome": c.nome,
        "anoInicial": c.ano_inicial,
        "segundosInatividade": c.segundos_inatividade,
        "segundosContagem": c.segundos_contagem,
        "segundosLightbox": c.segundos_lightbox,
        "segundosAtualizacao": c.segundos_atualizacao,
        "videosComSom": c.videos_com_som,
        "urlCheckin": c.url_checkin,
    }


def montar_sala(s):
    return {
        "numero": s.numero, "slug": s.slug, "nome": s.nome, "titulo": s.titulo,
        "subtitulo": s.subtitulo, "cor": s.cor.upper(), "tipo": s.tipo,
    }


def montar_marco(m):
    return {
        "id": m.pk, "ano": m.ano, "titulo": m.titulo, "descricao": m.descricao,
        "icone": m.icone, "destaque": m.destaque, "foto": _url(m.foto), "texto": m.texto,
    }


def montar_apresentacao(a):
    return {"titulo": a.titulo, "texto": a.paragrafos, "foto": _url(a.foto), "legenda": a.legenda, "icone": a.icone}


def montar_decada(d):
    return {
        "id": d.pk, "rotulo": d.rotulo, "periodo": d.periodo, "titulo": d.titulo, "resumo": d.resumo,
        "icone": d.icone, "foto": _url(d.foto),
        "acontecimentos": [{"ano": e.ano, "texto": e.texto} for e in d.acontecimentos.all()],
    }


def montar_foto(f):
    return {
        "id": f.pk, "ano": f.ano, "legenda": f.legenda, "credito": f.credito, "alt": f.alt or f.legenda,
        "src": _url(f.exibicao), "miniatura": _url(f.miniatura), "largura": f.largura, "altura": f.altura,
    }


def montar_video(v):
    return {
        "id": v.pk, "titulo": v.titulo, "descricao": v.descricao, "tipo": v.tipo,
        "src": _url(v.arquivo), "capa": _url(v.capa), "duracao": v.duracao_segundos,
        "destaque": v.destaque, "legenda": _url(v.legenda),
    }


# ---------------------------------------------------------------- Sala 06

def montar_aluno_resumo(a: Aluno):
    return {
        "id": a.pk, "nome": a.nome, "ano": a.ano, "turma": a.turma, "foto": _url(a.foto),
        "checkinEm": timezone.localtime(a.checkin_em).isoformat(), "novo": a.novo,
    }


def montar_rede(rede, usuario):
    """`link` só em "outra": o endereço vem da pessoa, e o totem o mostra como texto, nunca clicável."""
    item = {"rede": rede, "rotulo": redes_sociais.POR_ID[rede].rotulo if rede in redes_sociais.POR_ID else rede, "usuario": usuario}
    if rede == "outra":
        item["link"] = f"https://{usuario}"
    return item


def montar_aluno_perfil(a: Aluno, fotos, colegas, total_colegas=None):
    return {
        **montar_aluno_resumo(a),
        "recente": a.recente,
        # Campos antigos: o frontend até a versão de novembro de 2026 lê só estes dois.
        "instagram": a.instagram,
        "facebook": a.facebook,
        "redes": [montar_rede(r, u) for r, u in redes_sociais.do_aluno(a)],
        "fotos": [
            {"id": f.pk, "src": _url(f.imagem), "miniatura": _url(f.miniatura), "legenda": f.legenda, "ano": f.ano}
            for f in fotos
        ],
        "colegas": [montar_aluno_resumo(c) for c in colegas],
        "totalColegas": len(colegas) if total_colegas is None else total_colegas,
    }


def montar_config_checkin(c: ConfiguracaoMemorial):
    return {
        "anoInicial": c.ano_inicial,
        "anoAtual": ano_atual(),
        "termoTexto": c.termo_texto,
        "termoVersao": c.termo_versao,
        "emailContato": c.email_contato,
    }


# ---------------------------------------------------------------- check-in (entrada)

MSG = {
    "nome": "Escreva nome e sobrenome.",
    "ano": "Escolha o ano em que estudou.",
    "turma": "Informe a turma, por exemplo 3º A.",
    "email": "Informe um e-mail válido, por exemplo nome@email.com.",
    "instagram": "Confira o Instagram: só o nome de usuário, sem espaços.",
    "facebook": "Confira o Facebook: só o nome de usuário ou o endereço do perfil.",
    "consentimento": "Marque a autorização para aparecer nos totens.",
    "redes": "Confira as redes sociais.",
    "redes_max": f"Informe no máximo {redes_sociais.MAX_REDES} redes sociais.",
}


def _so_usuario(valor, dominio):
    """'@fulano', 'instagram.com/fulano/' e 'https://www.instagram.com/fulano' viram 'fulano'."""
    v = (valor or "").strip()
    v = re.sub(rf"^(https?://)?(www\.|m\.)?{dominio}\.com/", "", v, flags=re.I)
    return v.strip("/").lstrip("@").strip()


class CheckinSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=120, allow_blank=True, error_messages={"max_length": MSG["nome"]})
    ano = serializers.CharField(max_length=4, allow_blank=True)
    turma = serializers.CharField(max_length=30, allow_blank=True, error_messages={"max_length": MSG["turma"]})
    email = serializers.CharField(max_length=254, allow_blank=True)
    instagram = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    facebook = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    # Novo: lista de até 3 redes em JSON, [{"rede": "tiktok", "usuario": "maria"}]. Quando vem, vale mais que
    # instagram e facebook (que o frontend antigo continua enviando).
    redes = serializers.CharField(required=False, allow_blank=True, default="")
    consentimento = serializers.BooleanField(required=False, default=False)
    site = serializers.CharField(required=False, allow_blank=True, default="")  # isca anti-robô

    def __init__(self, *args, config: ConfiguracaoMemorial, **kwargs):
        super().__init__(*args, **kwargs)
        self.config = config

    def validate_nome(self, v):
        partes = [p for p in re.sub(r"\s+", " ", v).strip().split(" ") if re.search(r"[^\W\d_]", p)]
        if len(partes) < 2 or len(" ".join(partes)) < 4:
            raise serializers.ValidationError(MSG["nome"])
        return " ".join(partes)

    def validate_ano(self, v):
        try:
            ano = int(v)
        except (TypeError, ValueError):
            raise serializers.ValidationError(MSG["ano"])
        if not self.config.ano_inicial <= ano <= ano_atual():
            raise serializers.ValidationError(MSG["ano"])
        return ano

    def validate_turma(self, v):
        v = re.sub(r"\s+", " ", v).strip()
        if not v:
            raise serializers.ValidationError(MSG["turma"])
        return v

    def validate_email(self, v):
        v = v.strip().lower()
        try:
            serializers.EmailField().run_validation(v)
        except serializers.ValidationError:
            raise serializers.ValidationError(MSG["email"])
        return v

    def validate_instagram(self, v):
        v = _so_usuario(v, "instagram")
        if v and not re.fullmatch(r"[A-Za-z0-9._]{1,30}", v):
            raise serializers.ValidationError(MSG["instagram"])
        return v

    def validate_facebook(self, v):
        """Formato do frontend antigo: Facebook sem prefixo, "<rede>/<usuario>" ou "outra/<site>/<caminho>"."""
        v = _so_usuario(v, "facebook")
        if not v:
            return v
        if not re.fullmatch(r"[A-Za-z0-9.\-_/?=]{1,100}", v):
            raise serializers.ValidationError(MSG["facebook"])
        for rede, usuario in redes_sociais.de_campos_antigos("", v):
            try:
                redes_sociais.validar(rede, usuario)
            except redes_sociais.RedeInvalida as exc:
                raise serializers.ValidationError(str(exc))
        return v

    def validate_redes(self, v):
        if not v.strip():
            return None
        try:
            lista = json.loads(v)
        except ValueError:
            raise serializers.ValidationError(MSG["redes"])
        if not isinstance(lista, list) or not all(isinstance(i, dict) for i in lista):
            raise serializers.ValidationError(MSG["redes"])
        lista = [i for i in lista if str(i.get("usuario") or "").strip()]
        if len(lista) > redes_sociais.MAX_REDES:
            raise serializers.ValidationError(MSG["redes_max"])
        limpas = []
        for item in lista:
            try:
                par = redes_sociais.validar(str(item.get("rede") or ""), str(item.get("usuario") or ""))
            except redes_sociais.RedeInvalida as exc:
                raise serializers.ValidationError(str(exc))
            if par not in limpas:
                limpas.append(par)
        return limpas

    def validate(self, dados):
        if dados.get("redes") is None:
            # Já validados em validate_instagram e validate_facebook. O Facebook fica como veio (pode ter caminho e ?id=).
            dados["redes"] = [
                (r, u) if r == "facebook" else redes_sociais.validar(r, u)
                for r, u in redes_sociais.de_campos_antigos(dados.get("instagram"), dados.get("facebook"))
            ]
        dados["instagram"], dados["facebook"] = redes_sociais.campos_antigos(dados["redes"])
        return dados

    def validate_consentimento(self, v):
        if not v:
            raise serializers.ValidationError(MSG["consentimento"])
        return v


def registrar_checkin(dados, imagens, config: ConfiguracaoMemorial, url_painel):
    """Cria ou atualiza o cadastro (mesmo e-mail + mesmo ano = mesma pessoa) e guarda as fotos.

    Um perfil oculto pela equipe continua oculto: refazer o check-in não o traz de volta.
    """
    agora = timezone.now()
    campos = {
        "nome": dados["nome"],
        "turma": dados["turma"],
        "instagram": dados["instagram"],
        "facebook": dados["facebook"],
        "consentimento": True,
        "consentimento_em": agora,
        "consentimento_versao": config.termo_versao,
        "checkin_em": agora,
        "origem": Aluno.Origem.CHECKIN,
    }
    aluno = Aluno.objects.filter(email=dados["email"], ano=dados["ano"]).first()
    novo = aluno is None
    if aluno:
        for k, v in campos.items():
            setattr(aluno, k, v)
    else:
        status = Aluno.Status.PENDENTE if config.aprovar_perfis else Aluno.Status.APROVADO
        aluno = Aluno(email=dados["email"], ano=dados["ano"], status=status, **campos)
    # Registrado aqui, como check-in do visitante, e não como cadastro genérico pelos signals.
    # Tudo ou nada: uma foto que falhe no meio não deixa um cadastro pela metade.
    with sem_registro(), transaction.atomic():
        aluno.save()
        redes_sociais.gravar(aluno, dados["redes"])
        fotos = [FotoAluno.objects.create(aluno=aluno, imagem=imagem, ano=dados["ano"]) for imagem in imagens]
    tipo = Registro.Tipo.CHECKIN_NOVO if novo else Registro.Tipo.CHECKIN_ATUALIZADO
    registrar(tipo, f"Check-in: {aluno}", autor=VISITANTE, aluno_ref=aluno.pk)
    for _ in imagens:
        registrar(Registro.Tipo.FOTO_ENVIADA, f"Foto enviada por {aluno.nome}", autor=VISITANTE, aluno_ref=aluno.pk)
    avisar_equipe(aluno, fotos, novo, url_painel)
    return aluno
