"""Cadastros do painel (/administracao/gerir/): os mesmos campos do admin do Django, em tela própria.

Tudo vem do ModelAdmin de cada modelo (admin.py): fieldsets, campos só de leitura, inlines, filtros, busca,
ações, permissões e regras de salvar. Um campo novo no admin aparece aqui sem mexer neste arquivo.
"""

from django import forms
from django.contrib.admin.utils import display_for_field, flatten_fieldsets, label_for_field, lookup_field
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.core.paginator import Paginator
from django.db import models, transaction
from django.forms.models import inlineformset_factory, modelform_factory
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_POST

from .administracao import contexto_base
from .models import ConfiguracaoMemorial
from .secoes import POR_SLUG

POR_PAGINA = 24
PREVIAS = {"preview", "preview_grande", "avatar"}  # o campo de imagem já mostra a imagem atual


def _secao(slug):
    if slug not in POR_SLUG:
        raise Http404
    return POR_SLUG[slug]


def _contexto(request, secao):
    return {**contexto_base(request, secao.slug), "secao": secao}


def _exibir(nome, obj, dono):
    """Valor de um campo ou método do admin. Devolve (valor, booleano ou None)."""
    try:
        campo, _, valor = lookup_field(nome, obj, dono)
    except ObjectDoesNotExist:
        return "—", None
    if isinstance(valor, bool):
        return ("Sim" if valor else "Não"), valor
    if campo is not None:
        return display_for_field(valor, campo, "—"), None
    return ("—" if valor is None else valor), None


# ---------------------------------------------------------------- formulários

def _classe_form(modelo, base, nomes):
    meta = getattr(base, "Meta", None)
    widgets = dict(getattr(meta, "widgets", None) or {})
    if any(f.name == "icone" for f in modelo._meta.get_fields()):
        widgets["icone"] = forms.RadioSelect
    if modelo._meta.model_name == "sala":
        widgets["cor"] = forms.TextInput(attrs={"type": "color"})
    return modelform_factory(modelo, form=base, fields=nomes, widgets=widgets)


def _item(nome, form, obj, dono, readonly):
    if nome in readonly:
        valor, booleano = _exibir(nome, obj, dono)
        return {"leitura": True, "rotulo": label_for_field(nome, type(obj), dono), "valor": valor, "booleano": booleano}
    bf = form[nome]
    widget = bf.field.widget
    tipo = "padrao"
    if isinstance(widget, forms.CheckboxInput):
        tipo = "check"
    elif isinstance(widget, forms.RadioSelect):
        tipo = "icone"
    elif getattr(widget, "input_type", "") == "color":
        tipo = "cor"
    atual = form.initial.get(nome)  # o que está salvo, mesmo com erro em outro campo do formulário
    previa = atual.url if isinstance(atual, models.fields.files.ImageFieldFile) and atual else ""
    return {"bf": bf, "tipo": tipo, "previa": previa}


def _blocos(fieldsets, form, obj, dono, readonly):
    tem_imagem = any(isinstance(f, forms.ImageField) for f in form.fields.values())
    blocos = []
    for titulo, opcoes in fieldsets:
        linhas = []
        for linha in opcoes["fields"]:
            nomes = linha if isinstance(linha, (list, tuple)) else (linha,)
            itens = [_item(n, form, obj, dono, readonly) for n in nomes if not (tem_imagem and n in PREVIAS)]
            if itens:
                linhas.append(itens)
        blocos.append({"titulo": titulo, "linhas": linhas})
    return blocos


def _desabilitar(form):
    for campo in form.fields.values():
        campo.disabled = True


def _montar_inline(inline, request, obj, instancia, post):
    fieldsets = inline.get_fieldsets(request, obj)
    readonly = set(inline.get_readonly_fields(request, obj))
    editaveis = [n for n in flatten_fieldsets(fieldsets) if n not in readonly]
    pode_alterar = inline.has_change_permission(request, obj)
    maximo = inline.get_max_num(request, obj)
    conjunto = inlineformset_factory(
        type(instancia), inline.model, form=_classe_form(inline.model, inline.form, editaveis), fk_name=inline.fk_name,
        extra=inline.get_extra(request, obj), max_num=1000 if maximo is None else maximo, validate_max=maximo is not None,
        can_delete=inline.can_delete and inline.has_delete_permission(request, obj),
    )
    formset = conjunto(*post, instance=instancia, queryset=inline.get_queryset(request))
    itens = []
    for form in formset.forms:
        if not pode_alterar and form.instance.pk:
            _desabilitar(form)
        itens.append({
            "form": form, "novo": not form.instance.pk, "resumo": str(form.instance) if form.instance.pk else "Novo",
            "blocos": _blocos(fieldsets, form, form.instance, inline, readonly),
        })
    vazio = formset.empty_form
    return {
        "formset": formset, "titulo": str(inline.verbose_name_plural).capitalize(), "singular": str(inline.verbose_name),
        "itens": itens, "prefixo": formset.prefix, "maximo": maximo or "",
        "pode_adicionar": inline.has_add_permission(request, obj) and (maximo is None or maximo > 1),
        "modelo_vazio": {"form": vazio, "blocos": _blocos(fieldsets, vazio, vazio.instance, inline, readonly)},
    }


# ---------------------------------------------------------------- lista

def _filtros(ma, request):
    """Os list_filter do admin como seletores. Valores fora da lista são ignorados."""
    filtros, aplicar = [], {}
    for nome in ma.get_list_filter(request):
        campo = ma.model._meta.get_field(nome)
        if campo.is_relation:
            opcoes = [(str(o.pk), str(o)) for o in campo.related_model.objects.all()]
        elif isinstance(campo, models.BooleanField):
            opcoes = [("1", "Sim"), ("0", "Não")]
        elif campo.choices:
            opcoes = [(str(v), str(r)) for v, r in campo.flatchoices]
        else:
            valores = ma.model.objects.order_by(nome).values_list(nome, flat=True).distinct()
            opcoes = [(str(v), str(v)) for v in valores]
        atual = request.GET.get(nome, "")
        if atual not in {v for v, _ in opcoes}:
            atual = ""
        if atual:
            aplicar[nome] = (atual == "1") if isinstance(campo, models.BooleanField) else atual
        rotulo = str(campo.verbose_name).capitalize()
        filtros.append({"nome": nome, "rotulo": rotulo, "opcoes": opcoes, "atual": atual})
    return filtros, aplicar


def _linhas(objetos, ma, secao, colunas, request):
    # No cartão, as colunas que dão nome ao item já estão no título.
    no_titulo = set(ma.get_list_display_links(request, ma.get_list_display(request)) or []) if secao.layout == "grade" else set()
    linhas = []
    for obj in objetos:
        imagem = getattr(obj, secao.imagem, None) if secao.imagem else None
        celulas = []
        for nome, rotulo in colunas:
            if nome in no_titulo:
                continue
            valor, booleano = _exibir(nome, obj, ma)
            celulas.append({"rotulo": rotulo, "valor": valor, "booleano": booleano})
        linhas.append({
            "obj": obj, "titulo": str(obj), "url": reverse("gestao_editar", args=[secao.slug, obj.pk]), "celulas": celulas,
            "imagem": imagem.url if imagem else "", "icone": getattr(obj, "icone", "") or secao.icone,
            "cor": getattr(obj, "cor", "") if secao.slug == "salas" else "",
            "numero": getattr(obj, "numero", "") if secao.slug == "salas" else "",
        })
    return linhas


def _acoes(ma, request):
    if not ma.has_change_permission(request):
        return {}
    acoes = ma.get_actions(request)
    acoes.pop("delete_selected", None)  # o painel tem a própria confirmação (apagar)
    return acoes


@never_cache
@staff_member_required
def lista(request, secao):
    secao = _secao(secao)
    ma = secao.admin
    if not ma.has_view_or_change_permission(request):
        raise PermissionDenied
    if secao.modelo is ConfiguracaoMemorial:
        return redirect("gestao_editar", secao.slug, ConfiguracaoMemorial.atual().pk)

    acoes = _acoes(ma, request)
    if request.method == "POST":
        escolhida = acoes.get(request.POST.get("acao"))
        ids = [i for i in request.POST.getlist("selecionados") if i.isdecimal()]
        if escolhida and ids:
            escolhida[0](ma, request, ma.get_queryset(request).filter(pk__in=ids))
        elif not ids:
            messages.warning(request, "Selecione ao menos um item.")
        return redirect(request.get_full_path())

    filtros, aplicar = _filtros(ma, request)
    qs = ma.get_queryset(request).filter(**aplicar)
    busca = request.GET.get("q", "").strip()
    if busca and ma.get_search_fields(request):
        qs, duplicados = ma.get_search_results(request, qs, busca)
        if duplicados:
            qs = qs.distinct()
    pagina = Paginator(qs, POR_PAGINA).get_page(request.GET.get("pagina"))
    colunas = [(n, str(label_for_field(n, ma.model, ma)).capitalize()) for n in ma.get_list_display(request) if n not in PREVIAS]
    pode_apagar = ma.has_delete_permission(request)
    return render(request, "memorial/gestao_lista.html", {
        **_contexto(request, secao),
        "colunas": colunas,
        "linhas": _linhas(pagina.object_list, ma, secao, colunas, request),
        "pagina": pagina,
        "filtros": filtros,
        "busca": busca,
        "tem_busca": bool(ma.get_search_fields(request)),
        "tem_filtro": bool(busca or aplicar),
        "acoes": [(nome, descricao) for nome, (_, _, descricao) in acoes.items()],
        "pode_adicionar": ma.has_add_permission(request),
        "pode_apagar": pode_apagar,
        "com_selecao": bool(acoes) or pode_apagar,
    })


# ---------------------------------------------------------------- criar e alterar

@never_cache
@staff_member_required
def editar(request, secao, pk=None):
    secao = _secao(secao)
    ma = secao.admin
    obj = get_object_or_404(ma.get_queryset(request), pk=pk) if pk else None
    if obj is None and not ma.has_add_permission(request):
        raise PermissionDenied
    if obj is not None and not ma.has_view_or_change_permission(request, obj):
        raise PermissionDenied
    pode_salvar = obj is None or ma.has_change_permission(request, obj)
    if request.method == "POST" and not pode_salvar:
        raise PermissionDenied

    fieldsets = ma.get_fieldsets(request, obj)
    readonly = set(ma.get_readonly_fields(request, obj))
    classe = _classe_form(ma.model, ma.form, [n for n in flatten_fieldsets(fieldsets) if n not in readonly])
    post = (request.POST, request.FILES) if request.method == "POST" else ()
    form = classe(*post, instance=obj)
    if not pode_salvar:
        _desabilitar(form)

    if post and form.is_valid():
        instancia = ma.save_form(request, form, change=obj is not None)
        form_ok = True
    else:
        instancia, form_ok = form.instance, False
    inlines = [_montar_inline(i, request, obj, instancia, post) for i in ma.get_inline_instances(request, obj)]

    if post and form_ok and all(i["formset"].is_valid() for i in inlines):
        formsets = [i["formset"] for i in inlines]
        with transaction.atomic():
            ma.save_model(request, instancia, form, change=obj is not None)
            ma.save_related(request, form, formsets, change=obj is not None)
            mensagem = ma.construct_change_message(request, form, formsets, add=obj is None)
            (ma.log_addition if obj is None else ma.log_change)(request, instancia, mensagem)
        messages.success(request, f"Salvo: {instancia}.")
        if "_continuar" in request.POST or secao.modelo is ConfiguracaoMemorial:
            return redirect("gestao_editar", secao.slug, instancia.pk)
        return redirect("gestao_lista", secao.slug)

    return render(request, "memorial/gestao_form.html", {
        **_contexto(request, secao),
        "obj": obj,
        "form": form,
        "blocos": _blocos(fieldsets, form, form.instance, ma, readonly),
        "inlines": inlines,
        "com_erros": bool(post),
        "pode_salvar": pode_salvar,
        "pode_apagar": obj is not None and ma.has_delete_permission(request, obj),
        "e_unico": secao.modelo is ConfiguracaoMemorial,
    })


# ---------------------------------------------------------------- apagar

@require_POST
@never_cache
@staff_member_required
def apagar(request, secao):
    """Sempre em duas etapas: mostra o que será apagado (inclusive em cascata) e pede confirmação."""
    secao = _secao(secao)
    ma = secao.admin
    if not ma.has_delete_permission(request):
        raise PermissionDenied
    ids = [i for i in request.POST.getlist("selecionados") if i.isdecimal()]
    qs = ma.get_queryset(request).filter(pk__in=ids)
    objetos = list(qs)
    if not objetos:
        messages.warning(request, "Selecione ao menos um item.")
        return redirect("gestao_lista", secao.slug)
    _, contagem, sem_permissao, protegidos = ma.get_deleted_objects(objetos, request)
    if "confirmar" in request.POST and not sem_permissao and not protegidos:
        n = len(objetos)
        ma.log_deletions(request, objetos)
        ma.delete_queryset(request, qs)
        messages.success(request, f"{n} item(ns) apagado(s).")
        return redirect("gestao_lista", secao.slug)
    return render(request, "memorial/gestao_apagar.html", {
        **_contexto(request, secao),
        "objetos": objetos,
        "contagem": sorted(contagem.items()),
        "bloqueado": bool(sem_permissao or protegidos),
    })
