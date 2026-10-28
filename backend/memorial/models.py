"""Memorial Dom Bosco Maria Izabel Rodrigues: cinco salas, um totem por sala.

Salas 1 a 4 têm linha do tempo (Marco), fotos por período (Foto) e vídeos (Video).
A sala 5 (fechamento) mostra os ex-alunos (Aluno) que fizeram check-in pelo celular, com as fotos
que eles enviaram (FotoAluno) depois de aprovadas pela equipe.
"""

import re
import unicodedata
import uuid
from datetime import timedelta
from pathlib import Path

from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.deconstruct import deconstructible

from .media import gerar_versao_imagem

ANO_MINIMO = 1900

TERMO_PADRAO = (
    "Autorizo a exibição do meu nome, ano, turma e redes informadas nos totens do Memorial. "
    "As fotos enviadas só aparecem depois da aprovação da equipe. O e-mail nunca é mostrado e serve "
    "apenas para contato do Memorial. Posso pedir a remoção dos meus dados a qualquer momento."
)


@deconstructible
class _caminho:
    """Nome de arquivo único preservando a extensão: evita colisão e acentos na URL.

    As migrações antigas (0001 a 0006) também usam esta classe; não remova.
    """

    def __init__(self, pasta):
        self.pasta = pasta

    def __call__(self, instance, filename):
        ext = Path(filename).suffix.lower()
        return f"{self.pasta}/{uuid.uuid4().hex}{ext}"

    def __eq__(self, other):
        return isinstance(other, _caminho) and other.pasta == self.pasta


def normalizar(texto):
    """Minúsculo, sem acento e com espaços simples: base da busca por nome."""
    sem_acento = unicodedata.normalize("NFD", texto or "")
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", sem_acento).strip().lower()


def chave_turma(turma):
    """'3º A', '3o a' e '3ª A' viram '3a': compara turmas escritas de jeitos diferentes."""
    t = normalizar(turma).replace("º", " ").replace("ª", " ").replace("°", " ")
    t = re.sub(r"(\d)[oa]\s+(?=\S)", r"\1 ", t)  # "3o A" → "3 A" (o "a" de "3 A" é a turma, fica)
    return re.sub(r"[^0-9a-z]", "", t)


def ano_atual():
    return timezone.localdate().year


class Timestamped(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ItemSala(Timestamped):
    """Campos comuns ao conteúdo das salas 1 a 4."""

    sala = models.ForeignKey("Sala", on_delete=models.CASCADE)
    publicado = models.BooleanField(default=True)
    demonstrativo = models.BooleanField(
        default=False,
        help_text='Conteúdo de exemplo. Enquanto a sala tiver algum item assim, o totem mostra o selo '
        '"Conteúdo de exemplo" no rodapé.',
    )
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        abstract = True


# ---------------------------------------------------------------- salas

class Sala(Timestamped):
    class Tipo(models.TextChoices):
        CONTEUDO = "conteudo", "Conteúdo (história, fotos e vídeos)"
        FECHAMENTO = "fechamento", "Fechamento (busca de ex-alunos)"

    numero = models.PositiveSmallIntegerField(
        "número", unique=True, validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="O totem desta sala abre em /?sala=N.",
    )
    slug = models.SlugField(unique=True)
    nome = models.CharField(max_length=40, help_text='Curto, vai no cabeçalho: "Educação".')
    titulo = models.CharField("título", max_length=120)
    subtitulo = models.CharField("subtítulo", max_length=200, blank=True)
    cor = models.CharField(
        max_length=7, validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use o formato #RRGGBB.")],
        help_text="Número da sala, aba ativa e destaques. Precisa de contraste 4,5:1 com o marfim (#F3F0EA).",
    )
    tipo = models.CharField(max_length=12, choices=Tipo.choices, default=Tipo.CONTEUDO)
    ativa = models.BooleanField(default=True)

    class Meta:
        ordering = ["numero"]

    def __str__(self):
        return f"Sala {self.numero} · {self.nome}"


# ---------------------------------------------------------------- conteúdo das salas 1 a 4

class Marco(ItemSala):
    """Um ponto da linha do tempo da sala (a aba História)."""

    class Icone(models.TextChoices):
        BOARD = "board", "Quadro"
        CAP = "cap", "Capelo"
        BOOK = "book", "Livro"
        FLASK = "flask", "Laboratório"
        LAPTOP = "laptop", "Computador"
        USERS = "users", "Pessoas"
        APPLE = "apple", "Maçã"
        TROPHY = "trophy", "Troféu"
        MEDAL = "medal", "Medalha"
        STAR = "star", "Estrela"
        MUSIC = "music", "Música"
        PALETTE = "palette", "Paleta"
        MASK = "mask", "Teatro"
        HEART = "heart", "Coração"
        IMAGE = "image", "Imagem"
        DOOR = "door", "Porta"

    ano = models.PositiveSmallIntegerField(validators=[MinValueValidator(ANO_MINIMO)])
    titulo = models.CharField("título", max_length=60, help_text="Até ~4 palavras.")
    descricao = models.CharField("descrição curta", max_length=110, help_text="Uma frase, até ~110 caracteres.")
    icone = models.CharField("ícone", max_length=10, choices=Icone.choices, default=Icone.STAR)
    destaque = models.BooleanField(
        "destaque inicial", default=False,
        help_text="O marco que aparece em destaque quando o totem volta ao início. Um por sala.",
    )

    class Meta:
        ordering = ["sala", "ano", "ordem", "id"]
        constraints = [
            models.UniqueConstraint(fields=["sala"], condition=Q(destaque=True), name="um_marco_destaque_por_sala"),
        ]

    def __str__(self):
        return f"{self.ano} · {self.titulo}"

    def save(self, *args, **kwargs):
        if self.destaque:
            Marco.objects.filter(sala_id=self.sala_id, destaque=True).exclude(pk=self.pk).update(destaque=False)
        super().save(*args, **kwargs)


class Foto(ItemSala):
    imagem = models.ImageField(
        upload_to=_caminho("fotos/original"), blank=True,
        help_text="Sem imagem, o totem mostra uma moldura provisória (útil para o conteúdo de exemplo).",
    )
    # Versões geradas automaticamente: o totem nunca baixa o original
    exibicao = models.ImageField(upload_to=_caminho("fotos/exibicao"), blank=True, editable=False)
    miniatura = models.ImageField(upload_to=_caminho("fotos/miniatura"), blank=True, editable=False)
    largura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    altura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    ano = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(ANO_MINIMO)],
        help_text="Define o período de 5 anos em que a foto aparece.",
    )
    legenda = models.CharField(max_length=140, help_text="O que e quem aparece. Até 140 caracteres.")
    credito = models.CharField("crédito / fonte", max_length=160, blank=True)
    alt = models.CharField("texto alternativo", max_length=250, blank=True, help_text="Para leitor de tela. Vazio = legenda.")

    class Meta:
        ordering = ["sala", "ano", "ordem", "id"]

    def __str__(self):
        return f"{self.ano} · {self.legenda}"

    def save(self, *args, **kwargs):
        if _arquivo_mudou(self, "imagem"):
            if self.imagem:
                self.exibicao, self.largura, self.altura = gerar_versao_imagem(self.imagem, 2560)
                self.miniatura, _, _ = gerar_versao_imagem(self.imagem, 480)
            else:
                self.exibicao = self.miniatura = None
                self.largura = self.altura = None
        super().save(*args, **kwargs)


class Video(ItemSala):
    titulo = models.CharField("título", max_length=80)
    descricao = models.CharField("descrição", max_length=140, blank=True)
    tipo = models.CharField(
        max_length=30, default="Depoimento",
        help_text='Sugestões: Depoimento, Documentário, Acervo, Institucional. Aceita texto livre ("O jogo").',
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
    legenda = models.FileField(
        "legenda (WebVTT)", upload_to=_caminho("videos/legendas"), blank=True,
        validators=[FileExtensionValidator(["vtt"])],
        help_text="Opcional. Arquivo .vtt com as falas, para quem assiste sem som.",
    )
    destaque = models.BooleanField(default=False, help_text="O vídeo grande da aba Vídeos. Um por sala.")
    duracao_segundos = models.PositiveIntegerField(null=True, blank=True, editable=False)
    codec = models.CharField(max_length=30, blank=True, editable=False)

    class Meta:
        ordering = ["sala", "-destaque", "ordem", "id"]
        verbose_name = "vídeo"
        constraints = [
            models.UniqueConstraint(fields=["sala"], condition=Q(destaque=True), name="um_video_destaque_por_sala"),
        ]

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        if self.destaque:
            Video.objects.filter(sala_id=self.sala_id, destaque=True).exclude(pk=self.pk).update(destaque=False)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------- sala 5: ex-alunos

class Aluno(Timestamped):
    """Ex-aluno(a) que fez check-in. O e-mail é privado: nunca sai do servidor pela API."""

    class Origem(models.TextChoices):
        CHECKIN = "checkin", "Check-in pelo celular"
        IMPORTADO = "importado", "Importado pela equipe"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APROVADO = "aprovado", "Aprovado (aparece na sala 5)"
        OCULTO = "oculto", "Oculto"

    nome = models.CharField(max_length=120)
    nome_busca = models.CharField(max_length=120, editable=False, db_index=True)
    ano = models.PositiveSmallIntegerField("ano em que estudou", validators=[MinValueValidator(ANO_MINIMO)])
    turma = models.CharField(max_length=30)
    turma_chave = models.CharField(max_length=30, editable=False, db_index=True)
    email = models.EmailField("e-mail", blank=True, help_text="Privado. Só aparece aqui no admin.")
    instagram = models.CharField(max_length=60, blank=True, help_text="Só o usuário, sem @.")
    facebook = models.CharField(max_length=100, blank=True, help_text="Usuário ou endereço do perfil.")
    foto = models.ImageField(
        "foto de perfil", upload_to=_caminho("alunos/perfil"), blank=True,
        help_text="Opcional, cadastrada pela equipe. Vira um avatar de 480 px, sem metadados.",
    )
    consentimento = models.BooleanField(default=False)
    consentimento_em = models.DateTimeField("consentimento em", null=True, blank=True)
    consentimento_versao = models.CharField("versão do termo aceito", max_length=20, blank=True)
    checkin_em = models.DateTimeField("check-in em", default=timezone.now)
    origem = models.CharField(max_length=10, choices=Origem.choices, default=Origem.CHECKIN)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.APROVADO)
    demonstrativo = models.BooleanField(default=False, help_text="Ex-aluno de exemplo (carregar_exemplo).")

    class Meta:
        ordering = ["nome_busca", "id"]
        verbose_name = "ex-aluno"
        constraints = [
            models.UniqueConstraint(fields=["email", "ano"], condition=~Q(email=""), name="aluno_email_ano_unico"),
        ]

    def __str__(self):
        return f"{self.nome} ({self.ano}, {self.turma})"

    def save(self, *args, **kwargs):
        self.nome = re.sub(r"\s+", " ", self.nome or "").strip()
        self.nome_busca = normalizar(self.nome)
        self.turma = re.sub(r"\s+", " ", self.turma or "").strip()
        self.turma_chave = chave_turma(self.turma)
        self.email = (self.email or "").strip().lower()
        if _arquivo_mudou(self, "foto") and self.foto:
            self.foto, _, _ = gerar_versao_imagem(self.foto, 480)
        super().save(*args, **kwargs)

    @property
    def novo(self):
        return self.checkin_em >= timezone.now() - timedelta(hours=Aluno.HORAS_NOVO)

    @property
    def recente(self):
        return self.checkin_em >= timezone.now() - timedelta(hours=Aluno.HORAS_RECENTE)

    # Selo NOVO e topo da lista; "Check-in feito agora" no perfil.
    HORAS_NOVO = 24
    HORAS_RECENTE = 2


class FotoAluno(Timestamped):
    """Foto enviada no check-in. Só aparece no totem depois de aprovada."""

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        APROVADA = "aprovada", "Aprovada"
        RECUSADA = "recusada", "Recusada"

    aluno = models.ForeignKey(Aluno, on_delete=models.CASCADE, related_name="fotos")
    imagem = models.ImageField(upload_to=_caminho("alunos/fotos"), editable=False)
    miniatura = models.ImageField(upload_to=_caminho("alunos/miniaturas"), blank=True, editable=False)
    largura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    altura = models.PositiveIntegerField(null=True, blank=True, editable=False)
    legenda = models.CharField(max_length=140, blank=True)
    ano = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDENTE)

    class Meta:
        ordering = ["aluno", "ano", "id"]
        verbose_name = "foto de ex-aluno"
        verbose_name_plural = "fotos de ex-alunos"

    def __str__(self):
        return f"Foto de {self.aluno.nome}" + (f": {self.legenda}" if self.legenda else "")

    def save(self, *args, **kwargs):
        # O original enviado pelo celular nunca é guardado: só a versão reencodada, sem EXIF.
        if _arquivo_mudou(self, "imagem") and self.imagem:
            original = self.imagem
            self.imagem, self.largura, self.altura = gerar_versao_imagem(original, 2560)
            self.miniatura, _, _ = gerar_versao_imagem(original, 480)
        super().save(*args, **kwargs)


# ---------------------------------------------------------------- configuração

class ConfiguracaoMemorial(Timestamped):
    """Registro único com o comportamento dos totens e do check-in."""

    nome = models.CharField(max_length=120, default="Memorial Dom Bosco Maria Izabel Rodrigues")
    ano_inicial = models.PositiveSmallIntegerField(
        default=1958, help_text="Início dos períodos de 5 anos das fotos e do seletor de ano do check-in.",
    )
    segundos_inatividade = models.PositiveIntegerField(
        "aviso de inatividade após (s)", default=90, help_text='Sem toque por esse tempo, aparece "Ainda está aí?".',
    )
    segundos_contagem = models.PositiveIntegerField(
        "contagem do aviso (s)", default=15, help_text="Depois dela, o totem volta ao início da sala.",
    )
    segundos_lightbox = models.PositiveIntegerField(
        "foto ampliada fecha após (s)", default=45, help_text="Sem toque dentro da foto ampliada.",
    )
    segundos_atualizacao = models.PositiveIntegerField("checa conteúdo novo a cada (s)", default=300)
    videos_com_som = models.BooleanField(
        "vídeos começam com som", default=True,
        help_text="Desligado: os vídeos começam mudos (o visitante liga o som no player).",
    )
    aprovar_perfis = models.BooleanField(
        "aprovar perfis antes de aparecer", default=False,
        help_text="Desligado: o perfil aparece na sala 5 logo após o check-in. As fotos sempre passam por aprovação.",
    )
    url_checkin = models.URLField(
        "endereço do check-in", blank=True,
        help_text="O que o QR Code abre. Vazio = <endereço deste servidor>/checkin.",
    )
    termo_texto = models.TextField("texto do termo de consentimento", default=TERMO_PADRAO)
    termo_versao = models.CharField(
        "versão do termo", max_length=20, default="1.0",
        help_text="Mude a versão sempre que mudar o texto: cada cadastro guarda a versão aceita.",
    )
    email_contato = models.EmailField(
        "e-mail para pedidos de remoção", blank=True,
        help_text="Aparece na página de check-in para quem quiser pedir a remoção dos dados.",
    )

    class Meta:
        verbose_name = "configuração do memorial"
        verbose_name_plural = "configuração do memorial"

    def __str__(self):
        return "Configuração do memorial"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def atual(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


def _arquivo_mudou(obj, campo):
    novo = getattr(obj, campo).name or ""
    if not obj.pk:
        return bool(novo)
    anterior = type(obj).objects.filter(pk=obj.pk).values_list(campo, flat=True).first()
    return (anterior or "") != novo
