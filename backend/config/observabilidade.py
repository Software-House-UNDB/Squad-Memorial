"""Sentry: erros e desempenho do backend. Desligado enquanto SENTRY_DSN estiver vazio.

LGPD: o check-in traz nome, e-mail e fotos, e a busca da Sala 06 leva nomes na URL. Nada disso sai do servidor:
`send_default_pii` fica desligado e `_limpar` tira do evento o corpo, a query string, os cookies e os cabeçalhos
da requisição e o usuário, e troca qualquer endereço de e-mail que sobre (em mensagens de erro, por exemplo) por
[e-mail], antes do envio.
"""

import os
import re

CABECALHOS_SEGUROS = {"user-agent", "content-type", "content-length", "accept", "accept-language", "host"}
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
# endereço (absoluto ou /caminho) seguido de ?query: fica só o endereço. Pega também spans e nomes de transação.
QUERY = re.compile(r"((?:https?://|/)[^\s?#\"']*)\?[^\s#\"']*")


def _sem_emails(valor):
    """E-mail vira [e-mail] (um erro de SMTP pode trazer o do visitante) e URL perde a query (a busca leva nomes)."""
    if isinstance(valor, str):
        return QUERY.sub(r"\1", EMAIL.sub("[e-mail]", valor))
    if isinstance(valor, dict):
        return {k: _sem_emails(v) for k, v in valor.items()}
    if isinstance(valor, list):
        return [_sem_emails(v) for v in valor]
    return valor


def _limpar(evento, _hint=None):
    requisicao = evento.get("request")
    if requisicao:
        for chave in ("data", "cookies", "query_string", "env"):
            requisicao.pop(chave, None)
        cabecalhos = requisicao.get("headers") or {}
        requisicao["headers"] = {k: v for k, v in cabecalhos.items() if k.lower() in CABECALHOS_SEGUROS}
        if "url" in requisicao:
            requisicao["url"] = requisicao["url"].split("?", 1)[0]
    evento.pop("user", None)
    return _sem_emails(evento)


def _taxa(nome, padrao):
    try:
        return max(0.0, min(1.0, float(os.environ.get(nome) or padrao)))
    except ValueError:
        return float(padrao)


def iniciar_sentry():
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "producao"),
        release=os.environ.get("SENTRY_RELEASE") or None,
        integrations=[DjangoIntegration()],
        send_default_pii=False,
        max_request_body_size="never",
        traces_sample_rate=_taxa("SENTRY_TRACES_SAMPLE_RATE", "0.1"),
        before_send=_limpar,
        before_send_transaction=_limpar,
    )
    return True
