"""Avisa os administradores, por e-mail, de fotos e cadastros que aguardam aprovação.

O e-mail é um aviso a mais: o painel (/administracao/) mostra as pendências mesmo sem ele. Sem EMAIL_HOST
configurado nada é enviado. Uma falha no envio nunca derruba o check-in do visitante.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage, get_connection
from django.db.models import Q

from .models import Aluno, Registro
from .registro import SISTEMA, registrar

log = logging.getLogger(__name__)
GRUPO_ADMINISTRATIVO = "Administrativo"


class ErroEmail(Exception):
    """Falha ao falar com o servidor de e-mail, com uma mensagem que a equipe consegue entender."""


def email_configurado():
    return bool(settings.EMAIL_HOST)


def _explicar(exc):
    """Mensagem curta do erro de SMTP. Nunca inclui a senha (o smtplib não a põe nas exceções)."""
    import smtplib
    import socket
    import ssl

    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "usuário ou senha recusados pelo servidor de e-mail (confira EMAIL_HOST_USER e EMAIL_HOST_PASSWORD)."
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return f"o servidor recusou o remetente {settings.DEFAULT_FROM_EMAIL} (confira DEFAULT_FROM_EMAIL)."
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "o servidor recusou o destinatário."
    if isinstance(exc, smtplib.SMTPException) and not isinstance(exc, smtplib.SMTPServerDisconnected):
        return f"o servidor de e-mail respondeu com erro ({exc.__class__.__name__})."
    if isinstance(exc, ssl.SSLError):
        return "falha no TLS/SSL (porta 587 usa EMAIL_USE_TLS=1; porta 465 usa EMAIL_USE_SSL=1)."
    if isinstance(exc, (socket.timeout, TimeoutError)):
        return f"o servidor {settings.EMAIL_HOST}:{settings.EMAIL_PORT} não respondeu a tempo."
    if isinstance(exc, (ConnectionError, socket.gaierror, OSError)):
        return f"não foi possível conectar a {settings.EMAIL_HOST}:{settings.EMAIL_PORT} ({exc.__class__.__name__})."
    return f"{exc.__class__.__name__}: {exc}"[:200]


def enviar_teste(para, url_painel):
    """E-mail de teste do painel e do comando testar_email. Levanta ErroEmail se não sair."""
    corpo = (
        "Este é um e-mail de teste do Memorial Dom Bosco.\n\n"
        "Se você recebeu, os avisos de fotos e cadastros para aprovar vão chegar à equipe.\n"
        f"Painel: {url_painel}\n"
    )
    try:
        enviados = EmailMessage("Memorial: e-mail de teste", corpo, to=[para]).send()
    except Exception as exc:
        log.warning("E-mail de teste não enviado: %s", exc.__class__.__name__)
        raise ErroEmail(_explicar(exc)) from exc
    if not enviados:
        raise ErroEmail("o servidor de e-mail não aceitou a mensagem.")
    registrar(Registro.Tipo.AVISO_EMAIL, "E-mail de teste enviado a 1 pessoa da equipe")
    return enviados


def destinatarios():
    usuarios = get_user_model().objects.filter(is_active=True).exclude(email="")
    usuarios = usuarios.filter(Q(is_superuser=True) | Q(groups__name=GRUPO_ADMINISTRATIVO)).distinct()
    return sorted(set(usuarios.values_list("email", flat=True)))


def avisar_equipe(aluno, fotos, novo, url_painel):
    """Um e-mail por check-in que deixou algo pendente, com as miniaturas das fotos em anexo."""
    perfil_pendente = novo and aluno.status == Aluno.Status.PENDENTE
    if not (fotos or perfil_pendente) or not email_configurado():
        return 0
    para = destinatarios()
    if not para:
        return 0

    pendencias = []
    if fotos:
        pendencias.append(f"{len(fotos)} foto(s) para aprovar")
    if perfil_pendente:
        pendencias.append("cadastro para aprovar")
    corpo = (
        f"{aluno.nome} ({aluno.ano}, {aluno.turma}) fez check-in no Memorial: {' e '.join(pendencias)}.\n\n"
        f"Nada aparece nos totens antes da aprovação. Aprove ou recuse em:\n{url_painel}\n"
    )
    try:
        anexos = []
        for i, foto in enumerate(fotos, start=1):
            with foto.miniatura.open("rb") as arquivo:
                anexos.append((f"foto-{i}.jpg", arquivo.read(), "image/jpeg"))
        conexao = get_connection()
        mensagens = [
            EmailMessage(f"Memorial: aprovação pendente de {aluno.nome}", corpo, to=[e], attachments=anexos, connection=conexao)
            for e in para
        ]
        enviados = conexao.send_messages(mensagens) or 0
    except Exception:  # SMTP fora do ar, senha errada, destinatário recusado...
        log.exception("Aviso por e-mail não enviado (aluno nº %s).", aluno.pk)
        return 0
    registrar(
        Registro.Tipo.AVISO_EMAIL, f"Aviso de aprovação por e-mail a {enviados} pessoa(s): {aluno.nome}",
        autor=SISTEMA, aluno_ref=aluno.pk,
    )
    return enviados
