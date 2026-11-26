"""Confirmação do check-in por e-mail: um check-in por e-mail, e só de quem tem acesso a ele.

1. O visitante envia o formulário sem código: os dados são conferidos e um código de 6 dígitos vai para o e-mail.
   Se o e-mail já tem cadastro, vai no lugar um aviso de que o check-in já foi feito (e de que alterar é com a
   recepção). A resposta é a mesma nos dois casos, para a página não revelar quem já visitou o Memorial.
2. O visitante envia o formulário de novo, com o código: só então o check-in é gravado.

Nada do formulário fica guardado entre as duas etapas: o celular reenvia tudo. Do código fica só o hash.
"""

import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.db import transaction
from django.utils import timezone

from .models import Aluno, ConfiguracaoMemorial, ConfirmacaoEmail

log = logging.getLogger(__name__)

MSG_CODIGO = {
    "vazio": "Digite o código de 6 números que enviamos para o seu e-mail.",
    "errado": "Código incorreto. Confira o e-mail e tente de novo.",
    "expirado": "Este código não vale mais. Toque em “Enviar outro código”.",
    "bloqueado": "Muitas tentativas com este código. Toque em “Enviar outro código”.",
}
MSG_JA_CADASTRADO = "Este e-mail já tem check-in no Memorial. Para alterar seus dados, fale com a equipe na recepção."
MSG_ESPERE = "Já enviamos um código para este e-mail há pouco. Confira a caixa de entrada e o spam, ou espere um pouco para pedir outro."
MSG_SEM_EMAIL = "Não conseguimos enviar o código agora. Tente de novo em instantes ou fale com a equipe na recepção."


class Recusado(Exception):
    """O pedido não segue. `campo` e `mensagem` vão para a resposta da API; `status` é o código HTTP."""

    def __init__(self, campo, mensagem, status=400):
        super().__init__(mensagem)
        self.campo, self.mensagem, self.status = campo, mensagem, status


def envio_disponivel():
    """Há como mandar e-mail? Em produção, EMAIL_HOST. Em desenvolvimento e nos testes, um backend que não é SMTP."""
    return bool(settings.EMAIL_HOST) or not settings.EMAIL_BACKEND.endswith("smtp.EmailBackend")


def _hash(email, codigo):
    chave = settings.SECRET_KEY.encode()
    return hmac.new(chave, f"checkin:{email}:{codigo}".encode(), hashlib.sha256).hexdigest()


def _rodape(config):
    contato = f" ou escreva para {config.email_contato}" if config.email_contato else ""
    return (
        f"Para corrigir ou remover seus dados, fale com a equipe do Memorial na recepção{contato}.\n\n"
        "Se não foi você que pediu, ignore este e-mail: nada foi gravado.\n"
    )


def _enviar(assunto, corpo, email):
    try:
        enviados = EmailMessage(assunto, corpo, to=[email]).send()
    except Exception:  # SMTP fora do ar, senha errada, destinatário recusado...
        log.exception("Código de confirmação do check-in não enviado.")
        enviados = 0
    if not enviados:
        raise Recusado("geral", MSG_SEM_EMAIL, status=503)


def pedir_codigo(email, nome, config: ConfiguracaoMemorial):
    """Etapa 1: manda o código (ou o aviso de cadastro existente). Levanta Recusado se não puder enviar."""
    if not envio_disponivel():
        log.error("Check-in sem confirmação possível: configure o envio de e-mail (EMAIL_HOST).")
        raise Recusado("geral", MSG_SEM_EMAIL, status=503)
    agora = timezone.now()
    ConfirmacaoEmail.objects.filter(criado_em__lt=agora - timedelta(days=1)).delete()  # faxina

    # Os limites valem igual para e-mail novo e já cadastrado: a resposta não pode diferenciar os dois.
    recentes = ConfirmacaoEmail.objects.filter(email=email, criado_em__gte=agora - timedelta(hours=1))
    ultimo = recentes.first()
    if ultimo and ultimo.criado_em > agora - timedelta(seconds=settings.CHECKIN_CODIGO_INTERVALO):
        raise Recusado("geral", MSG_ESPERE, status=429)
    if recentes.count() >= settings.CHECKIN_CODIGO_POR_HORA:
        raise Recusado("geral", MSG_ESPERE, status=429)

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    ja_cadastrado = Aluno.objects.filter(email=email).exists()
    with transaction.atomic():
        # Um código por vez: pedir outro invalida os anteriores.
        ConfirmacaoEmail.objects.filter(email=email, usado_em__isnull=True).update(expira_em=agora)
        ConfirmacaoEmail.objects.create(
            email=email, codigo_hash=_hash(email, codigo),
            expira_em=agora + timedelta(minutes=settings.CHECKIN_CODIGO_MINUTOS),
        )

    primeiro = nome.split(" ")[0]
    if ja_cadastrado:
        _enviar(
            "Memorial Dom Bosco: você já fez check-in",
            f"Olá, {primeiro}.\n\n"
            "Recebemos um pedido de check-in com este e-mail, mas ele já tem um cadastro no Memorial Dom Bosco. "
            "Cada e-mail faz um check-in só, então nada foi alterado.\n\n"
            "Se quiser mudar algum dado do seu cadastro, fale com a equipe na recepção.\n\n" + _rodape(config),
            email,
        )
    else:
        _enviar(
            f"Memorial Dom Bosco: seu código de check-in é {codigo}",
            f"Olá, {primeiro}.\n\n"
            f"Seu código de confirmação é: {codigo}\n\n"
            f"Digite-o na página do check-in para concluir. Ele vale por {settings.CHECKIN_CODIGO_MINUTOS} minutos.\n\n"
            + _rodape(config),
            email,
        )


def confirmar_codigo(email, codigo):
    """Etapa 2: o código confere? Marca como usado. Levanta Recusado se não.

    O cadastro existente só é verificado depois do código certo: antes disso, a resposta revelaria
    a quem não tem acesso ao e-mail que aquela pessoa já fez check-in.
    """
    codigo = "".join(c for c in (codigo or "") if c.isdigit())
    if len(codigo) != 6:
        raise Recusado("codigo", MSG_CODIGO["vazio"])
    agora = timezone.now()
    erro = None
    with transaction.atomic():  # a tentativa errada fica gravada: o erro só é levantado depois do commit
        conf = ConfirmacaoEmail.objects.select_for_update().filter(email=email, usado_em__isnull=True).first()
        if conf is None or conf.expira_em <= agora:
            erro = "expirado"
        elif conf.tentativas >= settings.CHECKIN_CODIGO_TENTATIVAS:
            erro = "bloqueado"
        elif not hmac.compare_digest(conf.codigo_hash, _hash(email, codigo)):
            conf.tentativas += 1
            conf.save(update_fields=["tentativas"])
            erro = "bloqueado" if conf.tentativas >= settings.CHECKIN_CODIGO_TENTATIVAS else "errado"
        else:
            conf.usado_em = agora
            conf.save(update_fields=["usado_em"])
    if erro:
        raise Recusado("codigo", MSG_CODIGO[erro])
    if Aluno.objects.filter(email=email).exists():  # cadastrado entre as duas etapas
        raise Recusado("geral", MSG_JA_CADASTRADO, status=409)
