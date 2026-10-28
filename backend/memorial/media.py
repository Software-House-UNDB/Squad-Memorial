"""Processamento de mídia: versões redimensionadas de fotos e metadados de vídeo."""

import json
import logging
import subprocess
import tempfile
import uuid
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

log = logging.getLogger(__name__)

# Imagens gigantes (bomba de descompressão) viram erro em vez de travar o servidor.
Image.MAX_IMAGE_PIXELS = 60_000_000

# Fotos enviadas pelo celular no check-in
FORMATOS_ACEITOS = {"JPEG", "PNG", "WEBP"}
TAMANHO_MAXIMO = 10 * 1024 * 1024  # por foto
MEGAPIXELS_MAXIMO = 40_000_000


class ImagemInvalida(ValueError):
    pass


def validar_imagem_enviada(arquivo):
    """Confere tamanho, formato real (não a extensão) e dimensões de uma foto enviada pelo público.

    Levanta ImagemInvalida com uma mensagem para o visitante. A foto aceita é depois reencodada
    em JPEG sem metadados (gerar_versao_imagem), e o original nunca é guardado.
    """
    if arquivo.size > TAMANHO_MAXIMO:
        raise ImagemInvalida("Cada foto pode ter até 10 MB.")
    try:
        arquivo.seek(0)
        with Image.open(arquivo) as img:
            formato = img.format
            largura, altura = img.size
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        raise ImagemInvalida("Não conseguimos abrir uma das fotos. Envie em JPG, PNG ou WEBP.")
    finally:
        arquivo.seek(0)
    if formato not in FORMATOS_ACEITOS:
        raise ImagemInvalida("Envie as fotos em JPG, PNG ou WEBP.")
    if largura * altura > MEGAPIXELS_MAXIMO:
        raise ImagemInvalida("Uma das fotos é grande demais. Envie em até 40 megapixels.")


def gerar_versao_imagem(campo, lado_maior):
    """Retorna (ContentFile JPEG, largura, altura) com o lado maior limitado a `lado_maior`.

    Corrige a rotação EXIF (fotos de celular) e remove metadados.
    """
    campo.open("rb")
    campo.seek(0)
    with Image.open(campo) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            fundo = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGBA")
                fundo.paste(img, mask=img.split()[-1])
            else:
                fundo.paste(img.convert("RGB"))
            img = fundo
        img.thumbnail((lado_maior, lado_maior), Image.Resampling.LANCZOS)
        buf = BytesIO()
        img.convert("RGB").save(buf, "JPEG", quality=85, optimize=True, progressive=True)
        largura, altura = img.size
    campo.seek(0)
    return ContentFile(buf.getvalue(), name=f"{uuid.uuid4().hex}.jpg"), largura, altura


def ler_metadados_video(caminho):
    """(duração em segundos, codec de vídeo) via ffprobe. Retorna (None, '') se falhar."""
    try:
        saida = subprocess.run(
            [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=codec_name:format=duration",
                "-of", "json", str(caminho),
            ],
            capture_output=True, text=True, timeout=60, check=True,
        )
        dados = json.loads(saida.stdout)
        duracao = float(dados.get("format", {}).get("duration") or 0)
        streams = dados.get("streams") or [{}]
        return (round(duracao) or None), streams[0].get("codec_name", "")
    except (OSError, subprocess.SubprocessError, ValueError) as exc:
        log.warning("ffprobe falhou em %s: %s", caminho, exc)
        return None, ""


def capturar_quadro(caminho, segundo=1.0):
    """Extrai um quadro do vídeo como JPEG (largura máx. 960). Retorna ContentFile ou None."""
    with tempfile.TemporaryDirectory() as tmp:
        destino = Path(tmp) / "capa.jpg"
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-loglevel", "error", "-ss", str(segundo),
                    "-i", str(caminho), "-frames:v", "1",
                    "-vf", "scale='min(960,iw)':-2", "-q:v", "3", str(destino),
                ],
                capture_output=True, timeout=120, check=True,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            log.warning("ffmpeg não gerou capa para %s: %s", caminho, exc)
            return None
        if not destino.exists():
            return None
        return ContentFile(destino.read_bytes(), name=f"{uuid.uuid4().hex}.jpg")
