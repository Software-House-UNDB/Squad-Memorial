"""Acervo do Memorial UNDB, no mesmo formato do Design System "Livro de Honra"
(frontend/src/dados/tipos.ts): períodos, marcos, fotos, vídeos, documentos, pessoas e depoimentos.
"""

import uuid
from pathlib import Path

from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils.deconstruct import deconstructible

from .media import gerar_versao_imagem

FONTE_PADRAO = "Acervo institucional UNDB"


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


def paragrafos(texto):
    """Texto do admin → lista de parágrafos (separados por linha em branco)."""
    return [p.strip() for p in (texto or "").replace("\r\n", "\n").split("\n\n") if p.strip()]


class Timestamped(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ItemAcervo(Timestamped):
    """Campos comuns a toda peça: fonte documental, marca de conteúdo demonstrativo e publicação."""

    fonte = models.CharField(
        max_length=250, blank=True,
        help_text=f'De onde vem a informação. Ex.: "Acervo institucional UNDB, caixa 12". Vazio = "{FONTE_PADRAO}".',
    )
    fonte_url = models.URLField("link da fonte", blank=True)
    demonstrativo = models.BooleanField(
        default=False,
        help_text="Conteúdo de demonstração, a ser substituído pelo acervo oficial. "
        'Enquanto existir algum item assim, o totem mostra a etiqueta "Conteúdo demonstrativo".',
    )
    publicado = models.BooleanField(default=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True


# ---------------------------------------------------------------- períodos e marcos

class Periodo(ItemAcervo):
    """Uma década (ou intervalo) da linha do tempo, que agrupa marcos e fotos."""

    inicio = models.PositiveSmallIntegerField("ano inicial")
    fim = models.PositiveSmallIntegerField("ano final")
    titulo = models.CharField("título", max_length=120)
    descricao = models.TextField(
        "descrição", blank=True,
        help_text="Duas ou três frases de contexto sobre o período, sem repetir os marcos.",
    )
    foto_capa = models.ForeignKey(
        "Foto", on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
        verbose_name="foto de capa",
        help_text="Aparece na capa do totem e no Sumário. Se vazio, usa a primeira foto do período.",
    )

    class Meta:
        ordering = ["inicio", "ordem", "id"]
        verbose_name = "período"

    def __str__(self):
        return f"{self.inicio}–{self.fim} · {self.titulo}"

    @classmethod
    def para_ano(cls, ano):
        """Período que contém o ano; cria a década se nenhum existir."""
        p = cls.objects.filter(inicio__lte=ano, fim__gte=ano).order_by("inicio").first()
        if p:
            return p
        decada = ano - ano % 10
        return cls.objects.create(inicio=decada, fim=decada + 9, titulo=f"Anos {decada}")


class Marco(ItemAcervo):
    """Um acontecimento da linha do tempo (Tela 4 · Detalhe)."""

    class Tipo(models.TextChoices):
        PREDIO = "predio", "Prédio / espaço"
        DOCUMENTO = "documento", "Documento / reconhecimento"
        PESSOA = "pessoa", "Pessoas / cerimônia"
        FOTO = "foto", "Registro fotográfico"

    periodo = models.ForeignKey(
        Periodo, on_delete=models.PROTECT, null=True, blank=True, related_name="marcos",
        verbose_name="período", help_text="Se vazio, é escolhido pelo ano (cria a década se precisar).",
    )
    ano = models.PositiveSmallIntegerField()
    data_texto = models.CharField(
        "data por extenso", max_length=40, blank=True,
        help_text='Só quando diferente do ano simples: "c. 1998", "março de 1998".',
    )
    titulo = models.CharField("título", max_length=120)
    resumo = models.CharField(max_length=200, help_text="Uma frase para o cartão da linha do tempo.")
    lede = models.CharField(max_length=200, blank=True, help_text="Abertura em itálico, até 20 palavras.")
    narrativa = models.TextField(
        blank=True, help_text="Parágrafos curtos, separados por uma linha em branco. Até ~90 palavras visíveis.",
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.FOTO)
    conquista = models.BooleanField(default=False, help_text='Aparece também em "Marcos e conquistas".')
    pessoas = models.ManyToManyField("Pessoa", blank=True, related_name="marcos")

    class Meta:
        ordering = ["ano", "ordem", "id"]

    def __str__(self):
        return f"{self.ano} — {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.periodo_id and self.ano:
            self.periodo = Periodo.para_ano(self.ano)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------- mídia

class Foto(ItemAcervo):
    marco = models.ForeignKey(Marco, on_delete=models.SET_NULL, null=True, blank=True, related_name="fotos")
    periodo = models.ForeignKey(
        Periodo, on_delete=models.SET_NULL, null=True, blank=True, related_name="fotos",
        verbose_name="período", help_text="Se vazio, usa o período do marco.",
    )
    imagem = models.ImageField(
        upload_to=_caminho("fotos/original"), blank=True,
        help_text='Sem imagem, o totem mostra uma placa provisória "Foto do acervo".',
    )
    # Versões geradas automaticamente: o totem nunca baixa o original
    exibicao = models.ImageField(upload_to=_caminho("fotos/exibicao"), blank=True, editable=False)
    miniatura = models.ImageField(upload_to=_caminho("fotos/miniatura"), blank=True, editable=False)
    largura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    altura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    legenda = models.CharField(max_length=140, help_text="O que e quem aparece. Até 140 caracteres.")
    data_texto = models.CharField(
        "data", max_length=40, blank=True, help_text='"1998", "c. 1990", "Data a confirmar". Vazio = ano do marco.',
    )
    ano = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Vazio = ano do marco.")
    alt = models.CharField(
        "texto alternativo", max_length=250, blank=True, help_text="Para leitor de tela. Vazio = legenda.",
    )
    credito = models.CharField("crédito", max_length=120, blank=True, help_text="Autor da fotografia.")
    destaque = models.BooleanField(default=False, help_text="Fotos em destaque aparecem primeiro.")
    pessoas = models.ManyToManyField("Pessoa", blank=True, related_name="fotos")

    class Meta:
        ordering = ["-destaque", "ordem", "id"]

    def __str__(self):
        return self.legenda or f"Foto #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.periodo_id and self.marco_id:
            self.periodo_id = Marco.objects.filter(pk=self.marco_id).values_list("periodo_id", flat=True).first()
        if self._imagem_mudou():
            if self.imagem:
                self.exibicao, self.largura, self.altura = gerar_versao_imagem(self.imagem, 2560)
                self.miniatura, _, _ = gerar_versao_imagem(self.imagem, 480)
            else:
                self.exibicao = self.miniatura = None
                self.largura = self.altura = None
        super().save(*args, **kwargs)

    def _imagem_mudou(self):
        if not self.pk:
            return bool(self.imagem)
        anterior = Foto.objects.filter(pk=self.pk).values_list("imagem", flat=True).first()
        return (anterior or "") != (self.imagem.name or "")


class Video(ItemAcervo):
    titulo = models.CharField("título", max_length=120)
    descricao = models.CharField("descrição", max_length=200, blank=True)
    marco = models.ForeignKey(Marco, on_delete=models.SET_NULL, null=True, blank=True, related_name="videos")
    periodo = models.ForeignKey(
        Periodo, on_delete=models.SET_NULL, null=True, blank=True, related_name="videos",
        verbose_name="período", help_text="Se vazio, usa o período do marco.",
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
    data_texto = models.CharField("data", max_length=40, blank=True, help_text="Vazio = ano do marco.")
    ano = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Vazio = ano do marco.")
    duracao_segundos = models.PositiveIntegerField(null=True, blank=True, editable=False)
    codec = models.CharField(max_length=30, blank=True, editable=False)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "vídeo"

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if not self.periodo_id and self.marco_id:
            self.periodo_id = Marco.objects.filter(pk=self.marco_id).values_list("periodo_id", flat=True).first()
        super().save(*args, **kwargs)


# ---------------------------------------------------------------- documentos

class Documento(ItemAcervo):
    titulo = models.CharField("título", max_length=160)
    tipo = models.CharField(max_length=60, help_text="Ata, ofício, portaria, recorte de jornal…")
    data_texto = models.CharField("data", max_length=40, blank=True, help_text='"1998", "1998 (a confirmar)".')
    ano = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Para aparecer no período certo da galeria. Vazio = ano do marco.",
    )
    codigo_acervo = models.CharField("código no acervo", max_length=60, blank=True)
    marco = models.ForeignKey(Marco, on_delete=models.SET_NULL, null=True, blank=True, related_name="documentos")
    transcricao = models.TextField(
        "transcrição", blank=True, help_text="Texto integral, em parágrafos separados por uma linha em branco.",
    )

    class Meta:
        ordering = ["ano", "ordem", "id"]

    def __str__(self):
        return self.titulo


class PaginaDocumento(Timestamped):
    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name="paginas")
    arquivo = models.FileField(
        upload_to=_caminho("documentos"),
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp", "svg"])],
        help_text="Página digitalizada (JPG, PNG, WEBP ou SVG).",
    )
    alt = models.CharField("texto alternativo", max_length=250, blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["ordem", "id"]
        verbose_name = "página"

    def __str__(self):
        return f"{self.documento} · página {self.ordem}"


# ---------------------------------------------------------------- pessoas e memórias

class Pessoa(ItemAcervo):
    nome = models.CharField(max_length=120)
    papel = models.CharField(max_length=120, help_text='"Fundadora", "Primeira direção acadêmica"…')
    biografia = models.TextField(blank=True, help_text="Até ~90 palavras. Parágrafos separados por linha em branco.")
    retrato = models.ForeignKey(
        Foto, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
        help_text="Uma foto já cadastrada. Só aparece com autorização de uso de imagem.",
    )
    verificado = models.BooleanField(default=False, help_text="Nome e papel confirmados por fonte.")
    autorizacao_imagem = models.BooleanField(
        "autorização de uso de imagem", default=False, help_text="Sem ela, o retrato não é exibido.",
    )

    class Meta:
        ordering = ["ordem", "nome", "id"]

    def __str__(self):
        return f"{self.nome} ({self.papel})"


class Depoimento(ItemAcervo):
    texto = models.TextField(max_length=400, help_text="No máximo duas linhas no totem.")
    autor = models.CharField(max_length=120)
    vinculo = models.CharField("vínculo", max_length=120, help_text='"Turma de 1998", "Professora"…')
    marco = models.ForeignKey(Marco, on_delete=models.SET_NULL, null=True, blank=True, related_name="depoimentos")
    autorizado = models.BooleanField(
        default=False, help_text="Autorização registrada. Sem ela, o depoimento não aparece em lugar nenhum.",
    )

    class Meta:
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"{self.autor}: {self.texto[:50]}"


# ---------------------------------------------------------------- configuração

class ConfiguracaoTotem(Timestamped):
    """Registro único com o comportamento do totem."""

    titulo = models.CharField("título da capa", max_length=60, default="Memorial")
    subtitulo = models.CharField(
        "subtítulo da capa", max_length=120, default="A história da UNDB, guardada por quem faz parte dela.",
    )
    segundos_inatividade = models.PositiveIntegerField(
        "aviso de inatividade após (s)", default=90, help_text='Sem toque por esse tempo, aparece "Ainda está aí?".',
    )
    segundos_contagem = models.PositiveIntegerField(
        "contagem do aviso (s)", default=15, help_text="Depois dela, o livro fecha e volta à capa.",
    )
    segundos_lightbox = models.PositiveIntegerField(
        "foto ampliada fecha após (s)", default=45, help_text="Sem toque dentro da foto ampliada.",
    )
    segundos_atualizacao = models.PositiveIntegerField("checa conteúdo novo a cada (s)", default=300)

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