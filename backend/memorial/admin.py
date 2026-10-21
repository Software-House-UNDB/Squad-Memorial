from django import forms
from django.contrib import admin, messages
from django.utils.html import format_html

from .models import ConfiguracaoTotem, Foto, Periodo, Video

CODECS_OK = {"h264", "vp8", "vp9"}


def _thumb(campo, altura=60):
    if not campo:
        return "—"
    return format_html('<img src="{}" style="height:{}px;border-radius:4px">', campo.url, altura)


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


class PeriodoForm(forms.ModelForm):
    enviar_fotos = MultiplasImagensField(
        required=False, label="Adicionar fotos",
        help_text="Selecione várias imagens de uma vez (Ctrl/Shift). JPG, PNG ou WEBP.",
    )

    class Meta:
        model = Periodo
        fields = "__all__"


class FotoInline(admin.TabularInline):
    model = Foto
    extra = 0
    fields = ["preview", "imagem", "legenda", "credito", "destaque", "ordem", "publicado"]
    readonly_fields = ["preview"]

    @admin.display(description="prévia")
    def preview(self, obj):
        return _thumb(obj.miniatura)


@admin.register(Periodo)
class PeriodoAdmin(admin.ModelAdmin):
    form = PeriodoForm
    list_display = ["ano", "titulo", "icone", "qtd_fotos", "publicado"]
    list_display_links = ["ano", "titulo"]
    list_editable = ["publicado"]
    list_filter = ["publicado", "icone"]
    search_fields = ["titulo", "descricao"]
    inlines = [FotoInline]
    fieldsets = [
        (None, {"fields": ["ano", "titulo", "icone", "descricao", "resumo_galeria"]}),
        ("Fotos", {"fields": ["enviar_fotos"]}),
        ("Exibição", {"fields": ["ordem", "publicado"]}),
    ]

    @admin.display(description="fotos")
    def qtd_fotos(self, obj):
        return obj.fotos.count()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        arquivos = form.cleaned_data.get("enviar_fotos") or []
        base = (form.instance.fotos.order_by("-ordem").values_list("ordem", flat=True).first() or 0)
        for i, arq in enumerate(arquivos, start=1):
            Foto.objects.create(periodo=form.instance, imagem=arq, ordem=base + i)
        if arquivos:
            messages.success(request, f"{len(arquivos)} foto(s) adicionada(s).")


@admin.register(Foto)
class FotoAdmin(admin.ModelAdmin):
    list_display = ["preview", "__str__", "periodo", "destaque", "publicado"]
    list_filter = ["periodo", "destaque", "publicado"]
    list_editable = ["destaque", "publicado"]
    search_fields = ["legenda", "credito"]
    readonly_fields = ["preview_grande", "largura", "altura"]

    @admin.display(description="prévia")
    def preview(self, obj):
        return _thumb(obj.miniatura, 48)

    @admin.display(description="prévia")
    def preview_grande(self, obj):
        return _thumb(obj.miniatura, 200)


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ["preview", "titulo", "categoria", "periodo", "duracao", "aviso_codec", "publicado"]
    list_display_links = ["preview", "titulo"]
    list_filter = ["categoria", "periodo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "descricao"]
    readonly_fields = ["preview_grande", "duracao", "aviso_codec"]
    fields = [
        "titulo", "descricao", "categoria", "periodo", "arquivo",
        "capa", "preview_grande", "duracao", "aviso_codec", "ordem", "publicado",
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


@admin.register(ConfiguracaoTotem)
class ConfiguracaoAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not ConfiguracaoTotem.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
