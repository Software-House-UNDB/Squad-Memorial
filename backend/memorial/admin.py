from io import BytesIO

from django import forms
from django.contrib import admin, messages
from django.http import HttpResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import Aluno, ConfiguracaoMemorial, Foto, FotoAluno, Marco, Sala, Video

CODECS_OK = {"h264", "vp8", "vp9"}
TIPOS_VIDEO = ["Depoimento", "Documentário", "Acervo", "Institucional"]


def _thumb(campo, altura=60):
    if not campo:
        return "—"
    return format_html('<img src="{}" style="height:{}px;border-radius:4px">', campo.url, altura)


def _duracao(segundos):
    return f"{segundos // 60}:{segundos % 60:02d}" if segundos else "—"


class ConteudoAdmin(admin.ModelAdmin):
    """Ações comuns ao conteúdo das salas."""

    actions = ["publicar", "despublicar", "marcar_oficial"]

    @admin.action(description="Publicar no totem")
    def publicar(self, request, qs):
        qs.update(publicado=True)

    @admin.action(description="Tirar do totem")
    def despublicar(self, request, qs):
        qs.update(publicado=False)

    @admin.action(description="Marcar como conteúdo oficial (não é exemplo)")
    def marcar_oficial(self, request, qs):
        qs.update(demonstrativo=False)


class ListaSugestoes(forms.TextInput):
    """Campo de texto livre com sugestões (datalist do HTML)."""

    def __init__(self, opcoes, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.opcoes = opcoes

    def render(self, name, value, attrs=None, renderer=None):
        lista = f"{attrs.get('id', name)}_sugestoes" if attrs else f"{name}_sugestoes"
        attrs = {**(attrs or {}), "list": lista}
        campo = super().render(name, value, attrs, renderer)
        opcoes = "".join(format_html('<option value="{}">', o) for o in self.opcoes)
        return format_html('{}<datalist id="{}">{}</datalist>', campo, lista, format_html(opcoes))


# ---------------------------------------------------------------- envio de várias fotos

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


class SalaForm(forms.ModelForm):
    enviar_fotos = MultiplasImagensField(
        required=False, label="Adicionar fotos",
        help_text="Selecione várias imagens de uma vez (Ctrl/Shift). Todas recebem o ano abaixo; "
        "revise as legendas depois em Fotos.",
    )
    ano_das_fotos = forms.IntegerField(
        required=False, label="Ano das fotos", min_value=1900,
        help_text="Obrigatório ao adicionar fotos: define o período de 5 anos em que elas aparecem.",
    )

    class Meta:
        model = Sala
        fields = "__all__"

    def clean(self):
        dados = super().clean()
        if dados.get("enviar_fotos") and not dados.get("ano_das_fotos"):
            self.add_error("ano_das_fotos", "Informe o ano das fotos enviadas.")
        return dados


# ---------------------------------------------------------------- salas

class MarcoInline(admin.TabularInline):
    model = Marco
    extra = 0
    fields = ["ano", "titulo", "descricao", "icone", "destaque", "ordem", "publicado", "demonstrativo"]
    show_change_link = True


class VideoForm(forms.ModelForm):
    class Meta:
        model = Video
        fields = "__all__"
        widgets = {"tipo": ListaSugestoes(TIPOS_VIDEO)}


class VideoInline(admin.StackedInline):
    model = Video
    form = VideoForm
    extra = 0
    fields = [("titulo", "tipo"), "descricao", "arquivo", ("destaque", "publicado", "demonstrativo", "ordem")]
    show_change_link = True


@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    form = SalaForm
    list_display = ["numero", "nome", "cor_amostra", "tipo", "qtd_marcos", "qtd_fotos", "qtd_videos", "ativa"]
    list_display_links = ["numero", "nome"]
    readonly_fields = ["endereco_totem"]
    fieldsets = [
        (None, {"fields": ["numero", "slug", "nome", "titulo", "subtitulo", "cor", "tipo", "ativa", "endereco_totem"]}),
        ("Fotos", {"fields": ["enviar_fotos", "ano_das_fotos"]}),
    ]

    def has_add_permission(self, request):
        return Sala.objects.count() < 5

    def get_fieldsets(self, request, obj=None):
        if obj and obj.tipo == Sala.Tipo.FECHAMENTO:
            return self.fieldsets[:1]
        return self.fieldsets

    def get_inlines(self, request, obj):
        if obj and obj.tipo == Sala.Tipo.FECHAMENTO:
            return []
        return [MarcoInline, VideoInline]

    @admin.display(description="cor")
    def cor_amostra(self, obj):
        return format_html(
            '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:{};'
            'vertical-align:middle"></span> {}', obj.cor, obj.cor,
        )

    @admin.display(description="endereço do totem")
    def endereco_totem(self, obj):
        if not obj or not obj.pk:
            return "—"
        return format_html("<code>/?sala={}</code> (abra este endereço no navegador quiosque do totem)", obj.numero)

    @admin.display(description="marcos")
    def qtd_marcos(self, obj):
        return obj.marco_set.count()

    @admin.display(description="fotos")
    def qtd_fotos(self, obj):
        return obj.foto_set.count()

    @admin.display(description="vídeos")
    def qtd_videos(self, obj):
        return obj.video_set.count()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        arquivos = form.cleaned_data.get("enviar_fotos") or []
        ano = form.cleaned_data.get("ano_das_fotos")
        sala = form.instance
        base = sala.foto_set.order_by("-ordem").values_list("ordem", flat=True).first() or 0
        for i, arq in enumerate(arquivos, start=1):
            Foto.objects.create(sala=sala, imagem=arq, ano=ano, ordem=base + i, legenda=f"Foto de {ano}")
        if arquivos:
            messages.success(request, f"{len(arquivos)} foto(s) de {ano} adicionada(s). Revise as legendas em Fotos.")


@admin.register(Marco)
class MarcoAdmin(ConteudoAdmin):
    list_display = ["ano", "titulo", "sala", "icone", "destaque", "demonstrativo", "publicado"]
    list_display_links = ["ano", "titulo"]
    list_filter = ["sala", "destaque", "demonstrativo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "descricao"]
    fields = ["sala", "ano", "titulo", "descricao", "icone", "destaque", "ordem", "publicado", "demonstrativo"]


@admin.register(Foto)
class FotoAdmin(ConteudoAdmin):
    list_display = ["preview", "ano", "legenda", "sala", "demonstrativo", "publicado"]
    list_display_links = ["preview", "legenda"]
    list_filter = ["sala", "ano", "demonstrativo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["legenda", "credito", "alt"]
    readonly_fields = ["preview_grande", "largura", "altura"]
    fieldsets = [
        (None, {"fields": ["sala", "imagem", "preview_grande", "ano", "legenda", "alt", "credito"]}),
        ("Exibição", {"fields": ["ordem", "publicado", "demonstrativo", "largura", "altura"]}),
    ]

    @admin.display(description="prévia")
    def preview(self, obj):
        return _thumb(obj.miniatura, 48)

    @admin.display(description="prévia")
    def preview_grande(self, obj):
        return _thumb(obj.miniatura, 200)


@admin.register(Video)
class VideoAdmin(ConteudoAdmin):
    form = VideoForm
    list_display = ["preview", "titulo", "tipo", "sala", "duracao", "aviso_codec", "destaque", "demonstrativo", "publicado"]
    list_display_links = ["preview", "titulo"]
    list_filter = ["sala", "tipo", "destaque", "demonstrativo", "publicado"]
    list_editable = ["publicado"]
    search_fields = ["titulo", "descricao"]
    readonly_fields = ["preview_grande", "duracao", "aviso_codec"]
    fieldsets = [
        (None, {"fields": ["sala", "titulo", "tipo", "descricao", "destaque"]}),
        ("Arquivos", {"fields": ["arquivo", "capa", "preview_grande", "legenda", "duracao", "aviso_codec"]}),
        ("Exibição", {"fields": ["ordem", "publicado", "demonstrativo"]}),
    ]

    @admin.display(description="capa")
    def preview(self, obj):
        return _thumb(obj.capa, 48)

    @admin.display(description="capa atual")
    def preview_grande(self, obj):
        return _thumb(obj.capa, 180)

    @admin.display(description="duração")
    def duracao(self, obj):
        return _duracao(obj.duracao_segundos)

    @admin.display(description="formato")
    def aviso_codec(self, obj):
        if not obj.codec:
            return "—"
        if obj.codec in CODECS_OK:
            return format_html('<span style="color:#2e7d32">{} ✓</span>', obj.codec)
        return format_html(
            '<span style="color:#c62828" title="Pode não tocar no totem. Converta para MP4 H.264.">{} ⚠</span>',
            obj.codec,
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


# ---------------------------------------------------------------- ex-alunos

class FotoAlunoInline(admin.TabularInline):
    model = FotoAluno
    extra = 0
    fields = ["preview", "legenda", "ano", "status"]
    readonly_fields = ["preview"]
    can_delete = True

    def has_add_permission(self, request, obj=None):
        return False  # fotos de ex-alunos chegam só pelo check-in

    @admin.display(description="foto")
    def preview(self, obj):
        return _thumb(obj.miniatura, 80)


@admin.register(Aluno)
class AlunoAdmin(admin.ModelAdmin):
    """Ex-alunos. Excluir apaga também a foto de perfil e as fotos enviadas (pedido de remoção / LGPD)."""

    list_display = ["nome", "ano", "turma", "status", "checkin_em", "fotos_pendentes", "origem", "demonstrativo"]
    list_filter = ["status", "ano", "origem", "demonstrativo"]
    search_fields = ["nome", "email"]
    date_hierarchy = "checkin_em"
    actions = ["aprovar", "ocultar"]
    inlines = [FotoAlunoInline]
    readonly_fields = ["avatar", "consentimento", "consentimento_em", "consentimento_versao", "checkin_em", "origem"]
    fieldsets = [
        (None, {"fields": ["nome", "ano", "turma", "status"]}),
        ("Contato (privado, nunca aparece no totem)", {"fields": ["email"]}),
        ("Redes sociais (aparecem no perfil)", {"fields": ["instagram", "facebook"]}),
        ("Foto de perfil", {"fields": ["foto", "avatar"]}),
        ("Registro", {"fields": ["checkin_em", "origem", "consentimento", "consentimento_em", "consentimento_versao", "demonstrativo"]}),
    ]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("fotos")

    @admin.display(description="fotos pendentes")
    def fotos_pendentes(self, obj):
        n = sum(1 for f in obj.fotos.all() if f.status == FotoAluno.Status.PENDENTE)
        return n or "—"

    @admin.display(description="avatar")
    def avatar(self, obj):
        return _thumb(obj.foto, 96)

    @admin.action(description="Aprovar (aparece na sala 5)")
    def aprovar(self, request, qs):
        n = qs.update(status=Aluno.Status.APROVADO)
        messages.success(request, f"{n} perfil(is) aprovado(s).")

    @admin.action(description="Ocultar da sala 5")
    def ocultar(self, request, qs):
        n = qs.update(status=Aluno.Status.OCULTO)
        messages.success(request, f"{n} perfil(is) oculto(s).")

    def save_model(self, request, obj, form, change):
        if not change and not obj.consentimento:
            obj.origem = Aluno.Origem.IMPORTADO
        super().save_model(request, obj, form, change)


@admin.register(FotoAluno)
class FotoAlunoAdmin(admin.ModelAdmin):
    list_display = ["preview", "aluno", "ano", "legenda", "status", "criado_em"]
    list_display_links = ["preview", "aluno"]
    list_filter = ["status", "ano"]
    list_editable = ["status"]
    search_fields = ["aluno__nome", "legenda"]
    actions = ["aprovar", "recusar"]
    readonly_fields = ["preview_grande", "aluno", "largura", "altura"]
    fields = ["aluno", "preview_grande", "legenda", "ano", "status", "largura", "altura"]

    def has_add_permission(self, request):
        return False  # chegam só pelo check-in

    @admin.display(description="foto")
    def preview(self, obj):
        return _thumb(obj.miniatura, 64)

    @admin.display(description="foto")
    def preview_grande(self, obj):
        return _thumb(obj.imagem, 360)

    @admin.action(description="Aprovar (aparece no perfil)")
    def aprovar(self, request, qs):
        n = qs.update(status=FotoAluno.Status.APROVADA)
        messages.success(request, f"{n} foto(s) aprovada(s).")

    @admin.action(description="Recusar")
    def recusar(self, request, qs):
        n = qs.update(status=FotoAluno.Status.RECUSADA)
        messages.success(request, f"{n} foto(s) recusada(s).")


# ---------------------------------------------------------------- configuração e QR Code

def endereco_checkin(request, config=None):
    config = config or ConfiguracaoMemorial.atual()
    return config.url_checkin or request.build_absolute_uri("/checkin")


@admin.register(ConfiguracaoMemorial)
class ConfiguracaoAdmin(admin.ModelAdmin):
    readonly_fields = ["qr_code"]
    fieldsets = [
        (None, {"fields": ["nome", "ano_inicial"]}),
        ("Totens", {"fields": ["segundos_inatividade", "segundos_contagem", "segundos_lightbox", "segundos_atualizacao", "videos_com_som"]}),
        ("Check-in e privacidade", {"fields": ["url_checkin", "qr_code", "aprovar_perfis", "termo_texto", "termo_versao", "email_contato"]}),
    ]

    def has_add_permission(self, request):
        return not ConfiguracaoMemorial.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def get_urls(self):
        return [
            path("qr.png", self.admin_site.admin_view(self.qr_png), name="memorial_qr_png"),
            path("qr.svg", self.admin_site.admin_view(self.qr_svg), name="memorial_qr_svg"),
            *super().get_urls(),
        ]

    @admin.display(description="QR Code do check-in")
    def qr_code(self, obj):
        png, svg = reverse("admin:memorial_qr_png"), reverse("admin:memorial_qr_svg")
        return format_html(
            '<img src="{}" alt="" style="width:180px;height:180px;background:#fff;border:1px solid #ddd"><br>'
            '<a class="button" href="{}?baixar=1">Baixar PNG</a> '
            '<a class="button" href="{}?baixar=1">Baixar SVG</a>'
            '<p class="help">Para a placa de entrada. Salve a configuração antes de baixar, se mudou o endereço.</p>',
            png, png, svg,
        )

    def _qr(self, request, fabrica, tipo, extensao):
        import qrcode

        dados = endereco_checkin(request)
        img = qrcode.make(dados, image_factory=fabrica, box_size=20, border=4,
                          error_correction=qrcode.constants.ERROR_CORRECT_M)
        buf = BytesIO()
        img.save(buf)
        resposta = HttpResponse(buf.getvalue(), content_type=tipo)
        if request.GET.get("baixar"):
            data = timezone.localdate().isoformat()
            resposta["Content-Disposition"] = f'attachment; filename="qr-checkin-memorial-{data}.{extensao}"'
        return resposta

    def qr_png(self, request):
        from qrcode.image.pil import PilImage

        return self._qr(request, PilImage, "image/png", "png")

    def qr_svg(self, request):
        from qrcode.image.svg import SvgPathFillImage

        return self._qr(request, SvgPathFillImage, "image/svg+xml", "svg")
