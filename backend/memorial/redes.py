"""Redes sociais dos ex-alunos (até 3 por pessoa), com as mesmas regras do frontend (frontend/src/dados/redes.ts).

Fonte da verdade: o modelo RedeSocial. Os campos antigos `Aluno.instagram` e `Aluno.facebook` continuam sendo
preenchidos para os totens e celulares com o frontend antigo, no formato que ele grava e lê:

    instagram → campo instagram, só o usuário ("maria.souza")
    facebook  → campo facebook, só o usuário ("maria.souza")
    tiktok, linkedin, x... → campo facebook, "<rede>/<usuario>" ("tiktok/maria")
    outra     → campo facebook, "outra/<site>/<caminho>" ("outra/site.com/maria")

O frontend antigo só mostra um Instagram e uma outra rede: `campos_antigos` escolhe o que cabe neles.
"""

import re
from dataclasses import dataclass

MAX_REDES = 3
MAX_OUTRA = 94  # "outra/" + 94 = 100, o tamanho do campo facebook


@dataclass(frozen=True)
class Rede:
    id: str
    rotulo: str
    dominios: tuple
    usuario: str  # expressão do usuário, sem arroba e sem endereço
    prefixo: str  # como o perfil é mostrado: prefixo + usuário

    def exibir(self, usuario):
        if self.id == "facebook" and "/" in usuario:
            return usuario
        return f"{self.prefixo}{usuario}"


REDES = [
    Rede("instagram", "Instagram", ("instagram.com",), r"[A-Za-z0-9._]{1,30}", "instagram.com/"),
    Rede("tiktok", "TikTok", ("tiktok.com",), r"[A-Za-z0-9._]{2,24}", "tiktok.com/@"),
    Rede("linkedin", "LinkedIn", ("linkedin.com",), r"[A-Za-z0-9\-_]{3,80}", "linkedin.com/in/"),
    Rede("facebook", "Facebook", ("facebook.com",), r"[A-Za-z0-9.\-_/?=]{1,100}", "facebook.com/"),
    Rede("x", "X", ("x.com", "twitter.com"), r"[A-Za-z0-9_]{1,15}", "x.com/"),
    Rede("youtube", "YouTube", ("youtube.com",), r"[A-Za-z0-9._\-]{3,30}", "youtube.com/@"),
    Rede("threads", "Threads", ("threads.net", "threads.com"), r"[A-Za-z0-9._]{1,30}", "threads.net/@"),
    Rede("kwai", "Kwai", ("kwai.com", "kw.ai"), r"[A-Za-z0-9._\-]{2,40}", "kwai.com/@"),
    Rede("pinterest", "Pinterest", ("pinterest.com",), r"[A-Za-z0-9._\-]{2,40}", "pinterest.com/"),
    Rede("snapchat", "Snapchat", ("snapchat.com",), r"[A-Za-z0-9._\-]{3,15}", "snapchat.com/add/"),
    Rede("telegram", "Telegram", ("t.me", "telegram.me"), r"[A-Za-z0-9_]{5,32}", "t.me/"),
    Rede("twitch", "Twitch", ("twitch.tv",), r"[A-Za-z0-9_]{4,25}", "twitch.tv/"),
    Rede("github", "GitHub", ("github.com",), r"[A-Za-z0-9\-]{1,39}", "github.com/"),
    Rede("behance", "Behance", ("behance.net",), r"[A-Za-z0-9._\-]{3,40}", "behance.net/"),
    Rede("outra", "Outra rede", (), r".+", ""),
]
POR_ID = {r.id: r for r in REDES}
ESCOLHAS = [(r.id, r.rotulo) for r in REDES]
# As redes que o frontend antigo guarda com prefixo no campo facebook (PREFIXADA em redes.ts).
PREFIXADAS = [r.id for r in REDES if r.id not in ("instagram", "facebook", "outra")]

_LINK_CURTO = re.compile(r"[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/[A-Za-z0-9._\-/]+")
_ENDERECO = re.compile(r"(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:/(.*))?", re.I)
_PREFIXADA = re.compile(rf"({'|'.join(PREFIXADAS)})/([^/]+)")
_OUTRA = re.compile(r"outra/(.+)")


class RedeInvalida(ValueError):
    pass


def mensagem(rede_id):
    rede = POR_ID.get(rede_id)
    if rede is None:
        return "Escolha uma rede social da lista."
    if rede.id == "outra":
        return "Confira o link: o endereço do perfil, por exemplo site.com/seu-usuario."
    return f"Confira o {rede.rotulo}: só o nome de usuário, sem espaços."


def normalizar_outra(texto):
    """'https://www.Site.com/@maria/?x=1' vira 'site.com/maria'; None se não for um link curto válido."""
    t = re.sub(r"^https?://", "", (texto or "").strip(), flags=re.I)
    t = re.sub(r"^www\.", "", t, flags=re.I)
    t = re.sub(r"[?#].*$", "", t, flags=re.S)
    dominio, _, resto = t.partition("/")
    caminho = "/".join(trecho.removeprefix("@") for trecho in resto.split("/")).rstrip("/")
    limpo = f"{dominio.lower()}/{caminho}"
    return limpo if len(limpo) <= MAX_OUTRA and _LINK_CURTO.fullmatch(limpo) else None


def ler_entrada(rede_id, texto):
    """Mesma regra de lerEntrada/normalizarRede do frontend: um link de rede conhecida vale mais que a rede escolhida.

    Devolve (rede, usuario) já limpos, ainda sem validar.
    """
    original = (texto or "").strip()
    limpo = re.sub(r"[?#].*$", "", original, flags=re.S)
    achou = _ENDERECO.fullmatch(limpo)
    if achou and (re.match(r"https?://", limpo, re.I) or achou.group(2) is not None):
        host = achou.group(1).lower()
        rede = next((r for r in REDES if any(host == d or host.endswith(f".{d}") for d in r.dominios)), None)
        if rede is None:
            return "outra", normalizar_outra(original) or original
        usuario = (achou.group(2) or "").lstrip("/")
        usuario = re.sub(r"^(in|user|add)/", "", usuario, flags=re.I).removeprefix("@").rstrip("/").strip()
        return rede.id, usuario
    usuario = limpo.removeprefix("@").strip()
    if rede_id == "outra":
        return "outra", normalizar_outra(usuario) or usuario
    return rede_id, usuario


def validar(rede_id, texto):
    """(rede, usuario) prontos para guardar, ou RedeInvalida com a mensagem para o visitante."""
    rede_id = (rede_id or "").strip().lower()
    if rede_id not in POR_ID:
        raise RedeInvalida(mensagem(rede_id))
    rede_id, usuario = ler_entrada(rede_id, texto)
    if rede_id == "outra":
        usuario = normalizar_outra(usuario)
        if not usuario:
            raise RedeInvalida(mensagem("outra"))
    elif not re.fullmatch(POR_ID[rede_id].usuario, usuario):
        raise RedeInvalida(mensagem(rede_id))
    return rede_id, usuario


def link(rede_id, usuario):
    """Endereço completo do perfil, como texto (o totem nunca o torna clicável)."""
    return f"https://{POR_ID[rede_id].exibir(usuario)}" if rede_id in POR_ID else ""


# ---------------------------------------------------------------- campos antigos (instagram e facebook)

def de_campos_antigos(instagram, facebook):
    """O inverso do que o frontend antigo grava (lerRedes em redes.ts). Valores fora do padrão continuam Facebook."""
    lista = []
    instagram = (instagram or "").strip()
    facebook = re.sub(r"^(https?://)?(www\.|m\.)?facebook\.com/", "", (facebook or "").strip(), flags=re.I)
    if instagram:
        lista.append(("instagram", instagram))
    prefixada = _PREFIXADA.fullmatch(facebook)
    outra = _OUTRA.fullmatch(facebook)
    if prefixada:
        lista.append((prefixada.group(1), prefixada.group(2)))
    elif outra:
        lista.append(("outra", outra.group(1)))
    elif facebook:
        lista.append(("facebook", facebook))
    return lista


def campos_antigos(redes):
    """(instagram, facebook) para o frontend antigo: o primeiro Instagram e a primeira das outras redes."""
    instagram = next((u for r, u in redes if r == "instagram"), "")
    outra = next(((r, u) for r, u in redes if r != "instagram"), None)
    if outra is None:
        facebook = ""
    elif outra[0] == "facebook":
        facebook = outra[1]
    else:
        facebook = f"{outra[0]}/{outra[1]}"
    return instagram[:60], facebook[:100]


def do_aluno(aluno):
    """As redes de um ex-aluno como [(rede, usuario)]. Sem RedeSocial cadastrada, lê os campos antigos."""
    linhas = [(r.rede, r.usuario) for r in aluno.redes.all()]
    return linhas or de_campos_antigos(aluno.instagram, aluno.facebook)


def gravar(aluno, redes):
    """Troca as redes do ex-aluno pela lista dada e atualiza os campos antigos. Não dispara o registro do Aluno."""
    from .models import RedeSocial

    RedeSocial.objects.filter(aluno=aluno).delete()
    RedeSocial.objects.bulk_create(
        [RedeSocial(aluno=aluno, rede=r, usuario=u, ordem=i) for i, (r, u) in enumerate(redes[:MAX_REDES])]
    )
    sincronizar_campos_antigos(aluno)


def sincronizar_campos_antigos(aluno):
    """Depois de editar as redes (check-in, admin ou painel): reescreve instagram e facebook a partir delas."""
    from .models import Aluno, RedeSocial

    linhas = RedeSocial.objects.filter(aluno=aluno).order_by("ordem", "id").values_list("rede", "usuario")
    aluno.instagram, aluno.facebook = campos_antigos(list(linhas))
    Aluno.objects.filter(pk=aluno.pk).update(instagram=aluno.instagram, facebook=aluno.facebook)
