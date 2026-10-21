"""Processamento de mídia: versões redimensionadas de fotos e metadados de vídeo."""

import json
import logging
import subprocess
import tempfile
import uuid
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

log = logging.getLogger(__name__)


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
