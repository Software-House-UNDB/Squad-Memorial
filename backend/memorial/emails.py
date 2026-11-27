"""Montagem dos e-mails do Memorial: texto simples + HTML com a logo embutida.

Todos os e-mails seguem o visual do agendamento (faixa dourada, título em serifa, quadro de dados, botão dourado):
templates/memorial/email/base.html e um modelo por e-mail. A logo e as fotos vão dentro da mensagem (Content-ID),
não como link para o servidor: aparecem mesmo nos clientes que bloqueiam imagens externas e não dependem de a
página estar acessível de fora da rede.
"""

from email.mime.image import MIMEImage
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

LOGO = Path(__file__).resolve().parent / "email" / "logo.png"
_logo_cache = None


def _logo():
    global _logo_cache
    if _logo_cache is None:
        _logo_cache = LOGO.read_bytes()
    return _logo_cache


def _imagem(cid, dados, subtipo):
    img = MIMEImage(dados, _subtype=subtipo)
    img.add_header("Content-ID", f"<{cid}>")
    img.add_header("Content-Disposition", "inline", filename=f"{cid}.{'jpg' if subtipo == 'jpeg' else subtipo}")
    return img


def montar(assunto, para, modelo, contexto, texto, fotos=(), connection=None, reply_to=None):
    """EmailMultiAlternatives pronto para enviar.

    `modelo`: nome do arquivo em templates/memorial/email/ (sem .html). `texto`: a versão em texto simples, que
    continua sendo a referência (clientes sem HTML, leitores de tela, filtros de spam). `fotos`: bytes JPEG, que o
    modelo mostra como cid:foto-1, cid:foto-2…
    """
    ctx = {"assunto": assunto, "fotos_cids": [f"foto-{i}" for i in range(1, len(fotos) + 1)], **contexto}
    html = render_to_string(f"memorial/email/{modelo}.html", ctx)
    msg = EmailMultiAlternatives(
        assunto, texto, from_email=settings.DEFAULT_FROM_EMAIL, to=list(para),
        connection=connection, reply_to=reply_to,
    )
    msg.attach_alternative(html, "text/html")
    msg.mixed_subtype = "related"  # texto/HTML e as imagens que o HTML referencia formam uma só mensagem
    msg.attach(_imagem("logo", _logo(), "png"))
    for cid, dados in zip(ctx["fotos_cids"], fotos, strict=True):
        msg.attach(_imagem(cid, dados, "jpeg"))
    return msg
