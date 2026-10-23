from django import forms
from django.contrib import admin, messages
from django.utils.html import format_html

from .models import (
    ConfiguracaoTotem, Depoimento, Documento, Foto, Marco, PaginaDocumento, Periodo, Pessoa, Video,
)

CODECS_OK = {"h264", "vp8", "vp9"}

CAMPOS_FONTE = ("Fonte e publicação", {
    "fields": ["fonte", "fonte_url", "demonstrativo", "publicado", "ordem"],
    "classes": ["collapse"],
})


def _thumb(campo, altura=60):
    if not campo:
        return "—"
    return format_html('<img src="{}" style="height:{}px;border-radius:4px">', campo.url, altura)


class AcervoAdmin(admin.ModelAdmin):
    """Ações comuns: publicar, despublicar e marcar como conteúdo oficial."""

    actions = ["publicar", "despublicar", "marcar_oficial"]

    @admin.action(description="Publicar no totem")
    def publicar(self, request, qs):
        qs.update(publicado=True)

    @admin.action(description="Tirar do totem")
    def despublicar(self, request, qs):
        qs.update(publicado=False)

    @admin.action(description="Marcar como conteúdo oficial (não demonstrativo)")
    def marcar_oficial(self, request, qs):
        qs.update(demonstrativo=False)


# ---------- envio de várias fotos de uma vez ----------

class MultiplosArquivosInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class MultiplasImagensField(forms.ImageField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultiplosArquivosInput(attrs={"accept": "image/*"}))
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        unico = super().clean
        if isinstance(data, (list, tuple)):
            return [unico(d, initial) for d in data]
        return [unico(data, initial)] if data else []


class MarcoForm(forms.ModelForm):
    enviar_fotos = MultiplasImagensField(
        required=False, label="Adicionar fotos",
        help_text="Selecione várias imagens de uma vez (Ctrl/Shift). A legenda de cada uma começa com o "
        "título do marco e pode ser editada depois.",
    )

    class Meta:
        model = Marco
        fields = "__all__"


class FotoInline(admin.TabularInline):
    model = Foto
    fk_name = "marco"
    extra = 0
    fields = ["preview", "imagem", "legenda", "data_texto", "credito", "destaque", "ordem", "publicado"]
    readonly_fields = ["preview"]
    show_change_link = True

    @admin.display(description="prévia")
    def preview(self, obj):
        return _thumb(obj.miniatura)


class VideoInline(admin.TabularInline):
    model = Video
    fk_name = "marco"
    extra = 0
    fields = ["titulo", "arquivo", "ordem", "publicado"]
    show_change_link = True


class DocumentoInline(admin.TabularInline):
    model = Documento
    extra = 0
    fields = ["titulo", "tipo", "data_texto", "publicado"]
    show_change_link = True


class DepoimentoInline(admin.StackedInline):
    model = Depoimento
    extra = 0
    fields = ["texto", "autor", "vinculo", "autorizado", "publicado"]


@admin.register(Periodo)
class PeriodoAdmin(AcervoAdmin):
    list_display = ["inicio", "fim", "titulo", "qtd_marcos", "capa", "demonstrativo", "publicado"]
    list_display_links = ["inicio", "titulo"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "descricao"]
    autocomplete_fields = ["foto_capa"]
    fieldsets = [
        (None, {"fields": ["inicio", "fim", "titulo", "descricao", "foto_capa"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="marcos")
    def qtd_marcos(self, obj):
        return obj.marcos.count()

    @admin.display(description="capa")
    def capa(self, obj):
        return _thumb(obj.foto_capa.miniatura if obj.foto_capa else None, 40)


@admin.register(Marco)
class MarcoAdmin(AcervoAdmin):
    form = MarcoForm
    list_display = ["ano", "titulo", "periodo", "tipo", "conquista", "qtd_fotos", "demonstrativo", "publicado"]
    list_display_links = ["ano", "titulo"]
    list_editable = ["conquista", "publicado"]
    list_filter = ["periodo", "tipo", "conquista", "demonstrativo", "publicado"]
    search_fields = ["titulo", "resumo", "narrativa"]
    autocomplete_fields = ["pessoas"]
    inlines = [FotoInline, VideoInline, DocumentoInline, DepoimentoInline]
    fieldsets = [
        (None, {"fields": ["ano", "data_texto", "periodo", "titulo", "tipo", "conquista"]}),
        ("Texto", {"fields": ["resumo", "lede", "narrativa"]}),
        ("Ligações", {"fields": ["pessoas", "enviar_fotos"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="fotos")
    def qtd_fotos(self, obj):
        return obj.fotos.count()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        arquivos = form.cleaned_data.get("enviar_fotos") or []
        m = form.instance
        base = m.fotos.order_by("-ordem").values_list("ordem", flat=True).first() or 0
        for i, arq in enumerate(arquivos, start=1):
            Foto.objects.create(
                marco=m, imagem=arq, ordem=base + i, legenda=f"{m.titulo}: fotografia {base + i}",
                demonstrativo=m.demonstrativo,
            )
        if arquivos:
            messages.success(request, f"{len(arquivos)} foto(s) adicionada(s). Revise as legendas.")


@admin.register(Foto)
class FotoAdmin(AcervoAdmin):
    list_display = ["preview", "__str__", "marco", "periodo", "destaque", "demonstrativo", "publicado"]
    list_filter = ["periodo", "marco", "destaque", "demonstrativo", "publicado"]
    list_editable = ["destaque", "publicado"]
    search_fields = ["legenda", "credito", "alt"]
    autocomplete_fields = ["marco", "pessoas"]
    readonly_fields = ["preview_grande", "largura", "altura"]
    fieldsets = [
        (None, {"fields": ["imagem", "preview_grande", "legenda", "alt", "credito"]}),
        ("Quando e onde", {"fields": ["marco", "periodo", "data_texto", "ano"]}),
        ("Quem aparece", {"fields": ["pessoas"]}),
        ("Exibição", {"fields": ["destaque", "largura", "altura"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="prévia")
    def preview(self, obj):
        return _thumb(obj.miniatura, 48)

    @admin.display(description="prévia")
    def preview_grande(self, obj):
        return _thumb(obj.miniatura, 200)


@admin.register(Video)
class VideoAdmin(AcervoAdmin):
    list_display = ["preview", "titulo", "marco", "periodo", "duracao", "aviso_codec", "demonstrativo", "publicado"]
    list_display_links = ["preview", "titulo"]
    list_filter = ["periodo", "demonstrativo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "descricao"]
    autocomplete_fields = ["marco"]
    readonly_fields = ["preview_grande", "duracao", "aviso_codec"]
    fieldsets = [
        (None, {"fields": ["titulo", "descricao", "arquivo", "capa", "preview_grande", "duracao", "aviso_codec"]}),
        ("Quando e onde", {"fields": ["marco", "periodo", "data_texto", "ano"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="capa")
    def preview(self, obj):
        return _thumb(obj.capa, 48)

    @admin.display(description="capa atual")
    def preview_grande(self, obj):
        return _thumb(obj.capa, 180)

    @admin.display(description="duração")
    def duracao(self, obj):
        s = obj.duracao_segundos
        return f"{s // 60}:{s % 60:02d}" if s else "—"

    @admin.display(description="formato")
    def aviso_codec(self, obj):
        if not obj.codec:
            return "—"
        if obj.codec in CODECS_OK:
            return format_html('<span style="color:#2e7d32">{} ✓</span>', obj.codec)
        return format_html(
            '<span style="color:#c62828" title="Pode não tocar no totem. Converta para MP4 H.264.">'
            "{} ⚠</span>", obj.codec,
        )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        obj.refresh_from_db()
        if obj.codec and obj.codec not in CODECS_OK:
            messages.warning(
                request,
                f"O vídeo usa o codec '{obj.codec}', que pode não tocar no Android. "
                "Converta para MP4 H.264 (veja o README).",
            )


class PaginaInline(admin.TabularInline):
    model = PaginaDocumento
    extra = 1
    fields = ["arquivo", "alt", "ordem"]


@admin.register(Documento)
class DocumentoAdmin(AcervoAdmin):
    list_display = ["titulo", "tipo", "data_texto", "marco", "qtd_paginas", "demonstrativo", "publicado"]
    list_filter = ["tipo", "demonstrativo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "codigo_acervo", "transcricao"]
    autocomplete_fields = ["marco"]
    inlines = [PaginaInline]
    fieldsets = [
        (None, {"fields": ["titulo", "tipo", "data_texto", "ano", "codigo_acervo", "marco"]}),
        ("Transcrição", {"fields": ["transcricao"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="páginas")
    def qtd_paginas(self, obj):
        n = obj.paginas.count()
        return n or "não digitalizado"


@admin.register(Pessoa)
class PessoaAdmin(AcervoAdmin):
    list_display = ["preview", "nome", "papel", "verificado", "autorizacao_imagem", "demonstrativo", "publicado"]
    list_display_links = ["preview", "nome"]
    list_filter = ["verificado", "autorizacao_imagem", "demonstrativo", "publicado"]
    search_fields = ["nome", "papel"]
    autocomplete_fields = ["retrato"]
    fieldsets = [
        (None, {"fields": ["nome", "papel", "biografia"]}),
        ("Retrato", {"fields": ["retrato", "autorizacao_imagem"]}),
        ("Validação", {"fields": ["verificado"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="retrato")
    def preview(self, obj):
        return _thumb(obj.retrato.miniatura if obj.retrato else None, 40)


@admin.register(Depoimento)
class DepoimentoAdmin(AcervoAdmin):
    list_display = ["autor", "vinculo", "trecho", "marco", "autorizado", "demonstrativo", "publicado"]
    list_filter = ["autorizado", "demonstrativo", "publicado"]
    list_editable = ["autorizado", "publicado"]
    search_fields = ["texto", "autor", "vinculo"]
    autocomplete_fields = ["marco"]
    fieldsets = [
        (None, {"fields": ["texto", "autor", "vinculo", "marco", "autorizado"]}),
        CAMPOS_FONTE,
    ]

    @admin.display(description="depoimento")
    def trecho(self, obj):
        return obj.texto[:80]


@admin.register(ConfiguracaoTotem)
class ConfiguracaoAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not ConfiguracaoTotem.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False