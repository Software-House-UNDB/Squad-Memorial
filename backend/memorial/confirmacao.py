"""Confirmação do check-in por e-mail, só de quem tem acesso a ele.

Cada e-mail faz até CHECKIN_MAX_POR_EMAIL check-ins (3): a mesma pessoa pode ter estudado na escola e na faculdade
do grupo. Cada um é de um ano diferente; para o mesmo e-mail e ano, vale o primeiro.

1. O visitante envia o formulário sem código: os dados são conferidos e um código de 6 dígitos vai para o e-mail.
   Se o e-mail já tem check-in nesse ano, ou já chegou ao limite, vai no lugar um aviso (alterar é com a recepção).
   A resposta é a mesma em todos os casos, para a página não revelar quem já visitou o Memorial.
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
MSG_JA_CADASTRADO = "Este e-mail já tem check-in para este ano no Memorial. Para alterar seus dados, fale com a equipe na recepção."
MSG_LIMITE = "Este e-mail já chegou ao limite de check-ins no Memorial. Para alterar seus dados, fale com a equipe na recepção."
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


def impedimento(email, ano):
    """Por que este e-mail não pode fazer este check-in: "ano" (já tem nesse ano), "limite" (já tem o máximo) ou None."""
    feitos = Aluno.objects.filter(email=email)
    if feitos.filter(ano=ano).exists():
        return "ano"
    if feitos.count() >= settings.CHECKIN_MAX_POR_EMAIL:
        return "limite"
    return None


def pedir_codigo(email, nome, ano, config: ConfiguracaoMemorial):
    """Etapa 1: manda o código (ou o aviso de que não dá). Levanta Recusado se não puder enviar."""
    if not envio_disponivel():
        log.error("Check-in sem confirmação possível: configure o envio de e-mail (EMAIL_HOST).")
        raise Recusado("geral", MSG_SEM_EMAIL, status=503)
    agora = timezone.now()
    ConfirmacaoEmail.objects.filter(criado_em__lt=agora - timedelta(days=1)).delete()  # faxina

    # Os limites de envio valem igual para todo e-mail: a resposta não pode diferenciar quem já tem cadastro.
    recentes = ConfirmacaoEmail.objects.filter(email=email, criado_em__gte=agora - timedelta(hours=1))
    ultimo = recentes.first()
    if ultimo and ultimo.criado_em > agora - timedelta(seconds=settings.CHECKIN_CODIGO_INTERVALO):
        raise Recusado("geral", MSG_ESPERE, status=429)
    if recentes.count() >= settings.CHECKIN_CODIGO_POR_HORA:
        raise Recusado("geral", MSG_ESPERE, status=429)

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    motivo = impedimento(email, ano)
    with transaction.atomic():
        # Um código por vez: pedir outro invalida os anteriores.
        ConfirmacaoEmail.objects.filter(email=email, usado_em__isnull=True).update(expira_em=agora)
        ConfirmacaoEmail.objects.create(
            email=email, codigo_hash=_hash(email, codigo),
            expira_em=agora + timedelta(minutes=settings.CHECKIN_CODIGO_MINUTOS),
        )

    primeiro = nome.split(" ")[0]
    if motivo:
        maximo = settings.CHECKIN_MAX_POR_EMAIL
        explicacao = (
            f"Este e-mail já tem um check-in de {ano} no Memorial Dom Bosco, e cada e-mail faz um check-in por ano"
            if motivo == "ano" else
            f"Este e-mail já tem {maximo} check-ins no Memorial Dom Bosco, o máximo para um mesmo e-mail"
        )
        _enviar(
            "Memorial Dom Bosco: você já fez check-in",
            f"Olá, {primeiro}.\n\n"
            f"Recebemos um pedido de check-in com este e-mail. {explicacao}, então nada foi alterado.\n\n"
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


def confirmar_codigo(email, codigo, ano):
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
    conferir_regras(email, ano)  # cadastrado entre as duas etapas, ou o ano trocado depois do código


def conferir_regras(email, ano):
    """Um check-in por e-mail e ano, até CHECKIN_MAX_POR_EMAIL. Levanta Recusado (409) se não pode.

    No check-in direto (sem código) é a única conferência: a mensagem diz que o e-mail já tem check-in, porque
    sem o código não há como avisar só o dono do e-mail.
    """
    motivo = impedimento(email, ano)
    if motivo:
        raise Recusado("geral", MSG_JA_CADASTRADO if motivo == "ano" else MSG_LIMITE, status=409)
