"""Popula o banco com os marcos do protótipo e imagens/vídeo de placeholder.

Útil para desenvolver o frontend antes do acervo real chegar.
    docker compose exec backend python manage.py carregar_exemplo
    docker compose exec backend python manage.py carregar_exemplo --limpar
"""

import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw

from memorial.models import ConfiguracaoTotem, Foto, Periodo, Video

MARCOS = [
    (1985, "Fundação da escola", "Início das atividades com as primeiras turmas.", "predio"),
    (1998, "Ampliação do campus", "Novas salas, biblioteca e laboratório de informática.", "livro"),
    (2007, "Primeira feira de ciências", "A comunidade passa a participar de projetos interdisciplinares.", "ciencia"),
    (2016, "Modernização pedagógica", "Implantação de recursos digitais e espaços colaborativos.", "tecnologia"),
    (2024, "Celebração do memorial", "Preservação da história com acervo digital de fotos e vídeos.", "camera"),
]

CORES = [(120, 104, 80), (60, 80, 110), (90, 110, 90), (110, 70, 60), (70, 70, 100)]


def placeholder(texto, cor, tamanho=(1600, 1067)):
    img = Image.new("RGB", tamanho, cor)
    d = ImageDraw.Draw(img)
    d.rectangle([40, 40, tamanho[0] - 40, tamanho[1] - 40], outline=(240, 230, 210), width=6)
    d.text((80, 80), texto, fill=(250, 245, 235), font_size=72)
    buf = BytesIO()
    img.save(buf, "JPEG", quality=80)
    return ContentFile(buf.getvalue(), name="exemplo.jpg")


class Command(BaseCommand):
    help = "Cria conteúdo de exemplo (marcos, fotos e um vídeo de teste)."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Apaga todo o conteúdo antes.")

    def handle(self, *args, limpar=False, **opts):
        if limpar:
            for obj in [*Video.objects.all(), *Foto.objects.all()]:
                obj.delete()  # um a um para os signals apagarem os arquivos
            Periodo.objects.all().delete()

        ConfiguracaoTotem.atual()
        periodos = []
        for i, (ano, titulo, desc, icone) in enumerate(MARCOS):
            p, criado = Periodo.objects.get_or_create(
                ano=ano, titulo=titulo, defaults={"descricao": desc, "icone": icone}
            )
            periodos.append(p)
            if criado:
                for n in range(1, 4):
                    Foto.objects.create(
                        periodo=p, imagem=placeholder(f"{ano} · foto {n}", CORES[i]),
                        legenda=f"{titulo} — registro {n}", ordem=n,
                    )
        self.stdout.write(self.style.SUCCESS(f"{len(periodos)} marcos com fotos de exemplo."))

        if not Video.objects.exists() and shutil.which("ffmpeg"):
            with tempfile.TemporaryDirectory() as tmp:
                arq = Path(tmp) / "teste.mp4"
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                     "-i", "testsrc=size=1280x720:rate=30:duration=5",
                     "-c:v", "libx264", "-pix_fmt", "yuv420p", str(arq)],
                    check=True,
                )
                categorias = ["institucional", "evento", "evento", "entrevista"]
                for p, cat in zip(periodos[:4], categorias):
                    Video.objects.create(
                        titulo=f"{p.titulo} — {p.ano}", descricao=p.descricao[:200],
                        categoria=cat, periodo=p,
                        arquivo=ContentFile(arq.read_bytes(), name="teste.mp4"),
                    )
            self.stdout.write(self.style.SUCCESS("4 vídeos de teste criados."))
