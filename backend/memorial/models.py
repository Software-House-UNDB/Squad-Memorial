import uuid
from pathlib import Path

from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.deconstruct import deconstructible

from .media import gerar_versao_imagem


@deconstructible
class _caminho:
    """Nome de arquivo único preservando a extensão: evita colisão e acentos na URL."""

    def __init__(self, pasta):
        self.pasta = pasta

    def __call__(self, instance, filename):
        ext = Path(filename).suffix.lower()
        return f"{self.pasta}/{uuid.uuid4().hex}{ext}"

    def __eq__(self, other):
        return isinstance(other, _caminho) and other.pasta == self.pasta


class Timestamped(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Periodo(Timestamped):
    """Um marco da linha do tempo. Agrupa as fotos (e opcionalmente vídeos) daquele ano."""

    class Icone(models.TextChoices):
        PREDIO = "predio", "Prédio / fundação"
        LIVRO = "livro", "Livro / biblioteca"
        CIENCIA = "ciencia", "Ciência / laboratório"
        TECNOLOGIA = "tecnologia", "Tecnologia / computador"
        CAMERA = "camera", "Câmera / memória"
        FORMATURA = "formatura", "Formatura"
        ESTRELA = "estrela", "Conquista / prêmio"
        PESSOAS = "pessoas", "Comunidade / pessoas"

    ano = models.PositiveSmallIntegerField()
    titulo = models.CharField("título", max_length=120)
    descricao = models.TextField(
        "descrição (linha do tempo)", max_length=400,
        help_text="Texto curto exibido na tela História. Até ~2 linhas no totem.",
    )
    resumo_galeria = models.CharField(
        "resumo na galeria", max_length=200, blank=True,
        help_text="Texto ao lado das fotos na tela Fotos. Se vazio, usa a descrição.",
    )
    icone = models.CharField("ícone", max_length=20, choices=Icone.choices, default=Icone.PREDIO)
    ordem = models.PositiveIntegerField(default=0, help_text="Desempate entre marcos do mesmo ano.")
    publicado = models.BooleanField(default=True)

    class Meta:
        ordering = ["ano", "ordem", "id"]
        verbose_name = "marco / período"
        verbose_name_plural = "marcos / períodos"

    def __str__(self):
        return f"{self.ano} — {self.titulo}"


class Foto(Timestamped):
    periodo = models.ForeignKey(Periodo, on_delete=models.CASCADE, related_name="fotos")
    imagem = models.ImageField(upload_to=_caminho("fotos/original"))
    # Versões geradas automaticamente: o totem nunca baixa o original
    exibicao = models.ImageField(upload_to=_caminho("fotos/exibicao"), blank=True, editable=False)
    miniatura = models.ImageField(upload_to=_caminho("fotos/miniatura"), blank=True, editable=False)
    largura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    altura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    legenda = models.CharField(max_length=200, blank=True)
    credito = models.CharField("crédito", max_length=120, blank=True)
    destaque = models.BooleanField(
        default=False, help_text="Fotos em destaque aparecem primeiro na faixa do período."
    )
    ordem = models.PositiveIntegerField(default=0)
    publicado = models.BooleanField(default=True)

    class Meta:
        ordering = ["-destaque", "ordem", "id"]

    def __str__(self):
        return self.legenda or f"Foto #{self.pk} ({self.periodo.ano})"

    def save(self, *args, **kwargs):
        imagem_mudou = self._imagem_mudou()
        if imagem_mudou and self.imagem:
            self.exibicao, self.largura, self.altura = gerar_versao_imagem(self.imagem, 1920)
            self.miniatura, _, _ = gerar_versao_imagem(self.imagem, 480)
        super().save(*args, **kwargs)

    def _imagem_mudou(self):
        if not self.pk:
            return True
        anterior = Foto.objects.filter(pk=self.pk).values_list("imagem", flat=True).first()
        return anterior != self.imagem.name


class Video(Timestamped):
    class Categoria(models.TextChoices):
        ENTREVISTA = "entrevista", "Entrevistas"
        EVENTO = "evento", "Eventos"
        INSTITUCIONAL = "institucional", "Institucional"

    titulo = models.CharField("título", max_length=120)
    descricao = models.CharField("descrição", max_length=200, blank=True)
    categoria = models.CharField(max_length=20, choices=Categoria.choices)
    periodo = models.ForeignKey(
        Periodo, on_delete=models.SET_NULL, null=True, blank=True, related_name="videos",
        help_text="Opcional. Liga o vídeo a um marco da linha do tempo.",
    )
    arquivo = models.FileField(
        upload_to=_caminho("videos"),
        validators=[FileExtensionValidator(["mp4", "webm", "m4v"])],
        help_text="Use MP4 (H.264 + AAC), até 1080p. É o formato que todo Android reproduz.",
    )
    capa = models.ImageField(
        upload_to=_caminho("videos/capas"), blank=True,
        help_text="Se vazio, um quadro do vídeo é capturado automaticamente.",
    )
    duracao_segundos = models.PositiveIntegerField(null=True, blank=True, editable=False)
    codec = models.CharField(max_length=30, blank=True, editable=False)
    ordem = models.PositiveIntegerField(default=0)
    publicado = models.BooleanField(default=True)

    class Meta:
        ordering = ["ordem", "periodo__ano", "id"]
        verbose_name = "vídeo"

    def __str__(self):
        return self.titulo

    @property
    def ano(self):
        return self.periodo.ano if self.periodo_id else None


class ConfiguracaoTotem(Timestamped):
    """Registro único com o comportamento do totem."""

    titulo = models.CharField("título", max_length=60, default="Memorial")
    subtitulo = models.CharField("subtítulo", max_length=120, default="Nossa história, nosso legado.")
    segundos_inatividade = models.PositiveIntegerField(
        "volta à tela inicial após (s)", default=90,
        help_text="Sem toque por esse tempo, o totem volta ao início.",
    )
    segundos_atualizacao = models.PositiveIntegerField(
        "checa conteúdo novo a cada (s)", default=300,
    )
    descanso_ativo = models.BooleanField(
        "proteção de tela", default=True,
        help_text="Exibe fotos em sequência quando ninguém está usando.",
    )

    class Meta:
        verbose_name = "configuração do totem"
        verbose_name_plural = "configuração do totem"

    def __str__(self):
        return "Configuração do totem"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def atual(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
