"""Painel da administração (/administracao/): aprovação de fotos e cadastros, e as entradas e saídas.

Os cadastros (salas, marcos, fotos...) ficam em gestao.py.

Fora das salas e do service worker do totem. Usa o login do admin do Django: precisa de usuário da
equipe (is_staff) com as permissões de cada tela (o grupo "Administrativo" já tem todas).
"""

import csv
from datetime import date
from functools import wraps

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST

from .models import Aluno, ConfiguracaoMemorial, FotoAluno, Registro, normalizar
from .notificacoes import ErroEmail, destinatarios, email_configurado, enviar_teste
from .registro import alterar_em_lote, registrar
from .secoes import menu

POR_PAGINA = 50
FILA_MAXIMA = 60  # itens por tela de aprovação, os mais antigos primeiro; os seguintes entram ao decidir estes
VER_REGISTRO = "memorial.view_registro"
APROVAR_FOTOS = "memorial.change_fotoaluno"
APROVAR_CADASTROS = "memorial.change_aluno"
CONFIGURAR = "memorial.change_configuracaomemorial"


def _exige(*permissoes):
    """Usuário da equipe com ao menos uma das permissões."""

    def decorador(view):
        @wraps(view)
        def interna(request, *args, **kwargs):
            if not any(request.user.has_perm(p) for p in permissoes):
                return HttpResponseForbidden(
                    "Seu usuário não tem acesso a esta tela. Peça à equipe para incluí-lo no grupo Administrativo.",
                    content_type="text/plain; charset=utf-8",
                )
            return view(request, *args, **kwargs)

        return never_cache(staff_member_required(interna))

    return decorador


def _fotos_pendentes():
    return FotoAluno.objects.filter(status=FotoAluno.Status.PENDENTE, aluno__demonstrativo=False)


def _cadastros_pendentes():
    return Aluno.objects.filter(status=Aluno.Status.PENDENTE, demonstrativo=False)


def _contagem_pendencias(user):
    fotos = _fotos_pendentes().count() if user.has_perm(APROVAR_FOTOS) else 0
    cadastros = _cadastros_pendentes().count() if user.has_perm(APROVAR_CADASTROS) else 0
    return {"fotos": fotos, "cadastros": cadastros, "total": fotos + cadastros}


def contexto_base(request, tela):
    return {
        "tela": tela,
        "pendentes": _contagem_pendencias(request.user),
        "pode_aprovar": request.user.has_perm(APROVAR_FOTOS) or request.user.has_perm(APROVAR_CADASTROS),
        "pode_registro": request.user.has_perm(VER_REGISTRO),
        "menu": menu(request),
    }


# ---------------------------------------------------------------- aprovações

@require_GET
@_exige(APROVAR_FOTOS, APROVAR_CADASTROS, VER_REGISTRO)
def aprovacoes(request):
    if not (request.user.has_perm(APROVAR_FOTOS) or request.user.has_perm(APROVAR_CADASTROS)):
        return redirect("administracao_registro")
    pode_fotos = request.user.has_perm(APROVAR_FOTOS)
    pode_cadastros = request.user.has_perm(APROVAR_CADASTROS)
    return render(request, "memorial/administracao_aprovacoes.html", {
        **contexto_base(request, "aprovacoes"),
        "pode_fotos": pode_fotos,
        "pode_cadastros": pode_cadastros,
        "fotos": _fotos_pendentes().select_related("aluno").order_by("criado_em", "id")[:FILA_MAXIMA] if pode_fotos else [],
        "cadastros": _cadastros_pendentes().annotate(
            qtd_fotos=Count("fotos", filter=Q(fotos__status=FotoAluno.Status.PENDENTE)),
        ).prefetch_related("redes").order_by("checkin_em", "id")[:FILA_MAXIMA] if pode_cadastros else [],
        "fila_maxima": FILA_MAXIMA,
        "aprovar_perfis": ConfiguracaoMemorial.atual().aprovar_perfis,
        "pode_configurar": request.user.has_perm(CONFIGURAR),
        "email_configurado": email_configurado(),
        "destinatarios": destinatarios() if email_configurado() else [],
        "pode_testar_email": request.user.has_perm(CONFIGURAR),
    })


def _decidir(request, pendentes, acoes):
    """Só mexe no que ainda está pendente: outra pessoa da equipe pode ter decidido antes."""
    acao = acoes.get(request.POST.get("acao"))
    ids = [i for i in request.POST.getlist("selecionados") if i.isdecimal()]
    if not acao:
        messages.error(request, "Ação desconhecida. Nada foi alterado.")
    elif not ids:
        messages.warning(request, "Selecione ao menos um item antes de aprovar ou recusar.")
    else:
        rotulo, status, resumo = acao
        n = alterar_em_lote(pendentes.filter(pk__in=ids), rotulo, status=status)
        messages.success(request, f"{n} {resumo}.")
        if n < len(set(ids)):
            messages.warning(request, f"{len(set(ids)) - n} já tinha(m) sido decidido(s) por outra pessoa da equipe.")
    return redirect("administracao")


@require_POST
@_exige(APROVAR_FOTOS)
def decidir_fotos(request):
    return _decidir(request, _fotos_pendentes(), {
        "aprovar": ("Foto aprovada", FotoAluno.Status.APROVADA, "foto(s) aprovada(s): já aparecem no perfil"),
        "recusar": ("Foto recusada", FotoAluno.Status.RECUSADA, "foto(s) recusada(s): não aparecem nos totens"),
    })


@require_POST
@_exige(APROVAR_CADASTROS)
def decidir_cadastros(request):
    return _decidir(request, _cadastros_pendentes(), {
        "aprovar": ("Perfil aprovado", Aluno.Status.APROVADO, "cadastro(s) aprovado(s): já aparecem na Sala 06"),
        "ocultar": ("Perfil oculto", Aluno.Status.OCULTO, "cadastro(s) oculto(s): não aparecem na Sala 06"),
    })


@require_POST
@_exige(CONFIGURAR)
def email_teste(request):
    """Confere o SMTP do servidor mandando uma mensagem a quem clicou. Mostra o erro do servidor, se houver."""
    if not email_configurado():
        messages.error(request, "O e-mail não está configurado no servidor (EMAIL_HOST vazio).")
    elif not request.user.email:
        messages.error(request, "Seu usuário não tem e-mail cadastrado. Cadastre em Admin do Django › Usuários.")
    else:
        try:
            enviar_teste(request.user.email, request.build_absolute_uri(reverse("administracao")))
        except ErroEmail as exc:
            messages.error(request, f"O e-mail de teste não foi enviado: {exc}")
        else:
            messages.success(request, f"E-mail de teste enviado para {request.user.email}. Confira a caixa de entrada e o spam.")
    return redirect("administracao")


@require_GET
@_exige(APROVAR_FOTOS, APROVAR_CADASTROS, VER_REGISTRO)
def pendencias(request):
    """Consultado pelo painel aberto, para avisar quando chega algo novo."""
    return JsonResponse(_contagem_pendencias(request.user))


# ---------------------------------------------------------------- entradas e saídas

def _data(valor):
    try:
        return date.fromisoformat(valor or "")
    except ValueError:
        return None


def _ler_filtros(parametros):
    """Valores inválidos na URL são ignorados, em vez de virar erro."""
    direcao = parametros.get("direcao", "")
    tipo = parametros.get("tipo", "")
    return {
        "q": parametros.get("q", "").strip(),
        "direcao": direcao if direcao in Registro.Direcao.values else "",
        "tipo": tipo if tipo in Registro.Tipo.values else "",
        "de": _data(parametros.get("de")),
        "ate": _data(parametros.get("ate")),
    }


def _sem_direcao(f):
    """Tudo que os filtros pedem, menos a direção: base da contagem de cada botão."""
    qs = Registro.objects.all()
    for palavra in normalizar(f["q"]).split():
        qs = qs.filter(busca__contains=palavra)
    if f["tipo"]:
        qs = qs.filter(tipo=f["tipo"])
    if f["de"]:
        qs = qs.filter(em__date__gte=f["de"])
    if f["ate"]:
        qs = qs.filter(em__date__lte=f["ate"])
    return qs


def _aplicar(f):
    qs = _sem_direcao(f)
    return qs.filter(direcao=f["direcao"]) if f["direcao"] else qs


@require_GET
@_exige(VER_REGISTRO)
def registro(request):
    f = _ler_filtros(request.GET)
    contagem = _sem_direcao(f).aggregate(
        todas=Count("id"),
        entradas=Count("id", filter=Q(direcao=Registro.Direcao.ENTRADA)),
        saidas=Count("id", filter=Q(direcao=Registro.Direcao.SAIDA)),
    )
    hoje = Registro.objects.filter(em__date=timezone.localdate()).aggregate(
        entradas=Count("id", filter=Q(direcao=Registro.Direcao.ENTRADA)),
        saidas=Count("id", filter=Q(direcao=Registro.Direcao.SAIDA)),
    )
    pagina = Paginator(_aplicar(f), POR_PAGINA).get_page(request.GET.get("pagina"))
    return render(request, "memorial/administracao_registro.html", {
        **contexto_base(request, "registro"),
        "filtros": f,
        "contagem": contagem,
        "hoje": hoje,
        "checkins": Aluno.objects.filter(origem=Aluno.Origem.CHECKIN, demonstrativo=False).count(),
        "pagina": pagina,
        "tipos": Registro.Tipo.choices,
        "tem_filtro": any(f.values()),
    })


def _celula(valor):
    """Nomes vêm do público: uma célula que começa com = + - @ viraria fórmula no Excel."""
    texto = str(valor)
    return f"'{texto}" if texto[:1] in ("=", "+", "-", "@", "\t", "\r") else texto


@require_GET
@_exige(VER_REGISTRO)
def exportar(request):
    f = _ler_filtros(request.GET)
    registros = _aplicar(f)
    total = registros.count()
    linhas = list(registros)  # antes de registrar: a própria exportação não entra no arquivo
    registrar(Registro.Tipo.EXPORTACAO, f"Exportação em CSV de {total} registro(s)")

    resposta = HttpResponse(content_type="text/csv; charset=utf-8")
    resposta["Content-Disposition"] = f'attachment; filename="entradas-e-saidas-{timezone.localdate().isoformat()}.csv"'
    resposta.write("﻿")  # o Excel só reconhece os acentos com este marcador
    saida = csv.writer(resposta, delimiter=";")
    saida.writerow(["Data e hora", "Direção", "Tipo", "Descrição", "Quem"])
    for r in linhas:
        saida.writerow([
            timezone.localtime(r.em).strftime("%d/%m/%Y %H:%M:%S"), r.get_direcao_display(), r.get_tipo_display(),
            _celula(r.descricao), _celula(r.autor),
        ])
    return resposta
