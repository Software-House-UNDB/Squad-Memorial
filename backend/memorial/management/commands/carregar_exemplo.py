"""Carrega o conteúdo de exemplo do protótipo "Tour do Memorial Dom Bosco".

Fonte: memorial/exemplo/tour.json, extraído do protótipo por scripts/extrair_exemplo.py.
Tudo é marcado como `demonstrativo` (o totem mostra o selo "Conteúdo de exemplo") e NADA disto é
fato histórico da escola: são textos e pessoas fictícios para avaliar as telas.

    docker compose exec backend python manage.py carregar_exemplo
    docker compose exec backend python manage.py carregar_exemplo --limpar   # apaga o conteúdo das salas antes
    docker compose exec backend python manage.py carregar_exemplo --remover  # só remove o que é exemplo

Cria, por sala de conteúdo (1 a 4): 8 marcos, fotos de exemplo em todos os períodos de 5 anos (sem
imagem real: o totem mostra uma moldura provisória) e 5 vídeos curtos gerados com ffmpeg. Na sala 5:
22 ex-alunos, com avatares e fotos aprovadas desenhados aqui mesmo.

Ex-alunos reais (que fizeram check-in) nunca são apagados por este comando, nem com --limpar.
"""

import json
import random
import shutil
import subprocess
import tempfile
from datetime import date, datetime, time, timedelta
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFilter

from memorial.models import Aluno, ConfiguracaoMemorial, Foto, FotoAluno, Marco, Sala, Video, ano_atual

DADOS = Path(__file__).resolve().parents[2] / "exemplo" / "tour.json"
CREDITO = "Conteúdo de exemplo · Memorial Dom Bosco"
# Data da proposta do protótipo: os check-ins de exemplo ficam a mesma distância de "hoje".
REFERENCIA = date(2026, 10, 27)
TONS = ["#8A7F70", "#A08C6E", "#7E7A74", "#968670", "#8C8378", "#A49174", "#857C71", "#9A8A73"]


def periodos(ano_inicial, fim):
    """Blocos de 5 anos a partir do ano inicial: [(1958, 1962), (1963, 1967), …, (2023, 2026)]."""
    return [(a, min(a + 4, fim)) for a in range(ano_inicial, fim + 1, 5)]


def fotos_do_periodo(dados, sala, indice, inicio, fim):
    """Mesma regra do protótipo (photosFor): legendas da sala e anos espalhados no período."""
    rotulo, quantidade = dados["periods"][indice] if indice < len(dados["periods"]) else (None, 0)
    legendas = dados["captions"][sala]
    geradas = [
        (min(inicio + j % 5, fim), legendas[(j + indice * 3) % len(legendas)]) for j in range(quantidade)
    ]
    geradas.sort(key=lambda x: x[0])
    especial = dados["fotos"][sala]
    if indice == especial["act"]:
        proprias = [(ano, legenda) for _, ano, legenda in especial["items"]]
        return proprias + [(fim, legenda) for _, legenda in geradas[len(proprias):]]
    return geradas


def _cor(hexa):
    return tuple(int(hexa[i:i + 2], 16) for i in (1, 3, 5))


def imagem_exemplo(largura, altura, tom, pessoa=False, semente=0):
    """JPEG com degradê quente (como as molduras do protótipo); `pessoa` desenha um avatar."""
    base = Image.new("RGB", (largura, altura), _cor(tom))
    claro = Image.new("RGB", (largura, altura), tuple(min(255, c + 46) for c in _cor(tom)))
    mascara = Image.new("L", (largura, altura), 0)
    d = ImageDraw.Draw(mascara)
    r = int(max(largura, altura) * 0.55)
    cx, cy = largura // 2, int(altura * 0.42)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=210)
    base = Image.composite(claro, base, mascara.filter(ImageFilter.GaussianBlur(r * 0.45)))
    d = ImageDraw.Draw(base)
    traco = (255, 255, 255)
    if pessoa:
        cab = int(min(largura, altura) * 0.17)
        d.ellipse((cx - cab, int(altura * 0.38) - cab, cx + cab, int(altura * 0.38) + cab), fill=(245, 240, 232))
        om = int(min(largura, altura) * 0.34)
        d.pieslice((cx - om, int(altura * 0.62), cx + om, int(altura * 0.62) + 2 * om), 180, 360, fill=(245, 240, 232))
    else:
        rnd = random.Random(semente)
        w = int(largura * 0.16)
        x0, y0 = cx - w, cy - int(w * 0.7)
        d.rounded_rectangle((x0, y0, x0 + 2 * w, y0 + int(w * 1.4)), radius=6, outline=traco, width=3)
        d.ellipse((x0 + w // 3, y0 + w // 4, x0 + w // 3 + w // 3, y0 + w // 4 + w // 3), outline=traco, width=3)
        d.line((x0 + 6, y0 + int(w * 1.25), x0 + w, y0 + int(w * (0.6 + rnd.random() * 0.2)), x0 + 2 * w - 6, y0 + int(w * 1.1)),
               fill=traco, width=3)
    buf = BytesIO()
    base.save(buf, "JPEG", quality=86)
    return ContentFile(buf.getvalue(), name="exemplo.jpg")


class Command(BaseCommand):
    help = "Carrega o conteúdo de exemplo das 5 salas (marcado como demonstrativo)."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true",
                            help="Apaga TODO o conteúdo das salas (marcos, fotos, vídeos) e os ex-alunos de exemplo antes.")
        parser.add_argument("--remover", action="store_true",
                            help="Só remove o conteúdo de exemplo, sem carregar de novo.")

    def handle(self, *args, limpar=False, remover=False, **opts):
        if remover:
            self.stdout.write(f"Removidos: {self.apagar(Marco.objects.filter(demonstrativo=True), Foto.objects.filter(demonstrativo=True), Video.objects.filter(demonstrativo=True), Aluno.objects.filter(demonstrativo=True))} itens de exemplo.")
            return
        if limpar:
            n = self.apagar(Marco.objects.all(), Foto.objects.all(), Video.objects.all(), Aluno.objects.filter(demonstrativo=True))
            self.stdout.write(f"Conteúdo das salas apagado ({n} itens).")
        elif Marco.objects.filter(demonstrativo=True).exists() or Aluno.objects.filter(demonstrativo=True).exists():
            self.stdout.write("O conteúdo de exemplo já está carregado. Use --limpar para recarregar.")
            return

        dados = json.loads(DADOS.read_text(encoding="utf-8"))
        with transaction.atomic():
            self.carregar_salas(dados)
            self.carregar_alunos(dados)
        self.carregar_videos(dados)
        self.stdout.write(self.style.SUCCESS("Conteúdo de exemplo carregado."))

    @staticmethod
    def apagar(*querysets):
        # delete() um a um dispara os signals que apagam os arquivos do disco
        n = 0
        for qs in querysets:
            for obj in qs.iterator():
                obj.delete()
                n += 1
        return n

    def carregar_salas(self, dados):
        config = ConfiguracaoMemorial.atual()
        blocos = periodos(config.ano_inicial, ano_atual())
        comum = {"demonstrativo": True, "publicado": True}
        for chave, hist in dados["hist"].items():
            sala = Sala.objects.get(numero=int(chave))
            for i, (ano, (icone, titulo, descricao)) in enumerate(zip(hist["years"], hist["cards"])):
                Marco.objects.create(sala=sala, ano=ano, titulo=titulo, descricao=descricao, icone=icone,
                                     destaque=i == hist["hi"], ordem=i, **comum)
            fotos = []
            for indice, (inicio, fim) in enumerate(blocos):
                for ordem, (ano, legenda) in enumerate(fotos_do_periodo(dados, chave, indice, inicio, fim)):
                    fotos.append(Foto(sala=sala, ano=ano, legenda=legenda, credito=CREDITO, ordem=ordem, **comum))
            Foto.objects.bulk_create(fotos)
            self.stdout.write(f"Sala {chave}: {len(hist['years'])} marcos, {len(fotos)} fotos de exemplo.")

    def carregar_alunos(self, dados):
        config = ConfiguracaoMemorial.atual()
        agora = timezone.now()
        for i, p in enumerate(dados["people"]):
            dia = datetime.strptime(p["ck"], "%d/%m/%Y").date()
            atras = max(1, (REFERENCIA - dia).days)
            redes = {rede: endereco.split("/", 1)[1] for rede, endereco in p.get("social", [])}
            aluno = Aluno(
                nome=p["name"], ano=p["year"], turma=p["turma"],
                instagram=redes.get("insta", ""), facebook=redes.get("fb", ""),
                consentimento=True, consentimento_em=agora, consentimento_versao=config.termo_versao,
                checkin_em=timezone.make_aware(datetime.combine(agora.date() - timedelta(days=atras), time(10 + i % 8, 15))),
                origem=Aluno.Origem.CHECKIN, status=Aluno.Status.APROVADO, demonstrativo=True,
            )
            if p.get("pic"):
                aluno.foto = imagem_exemplo(480, 480, TONS[i % len(TONS)], pessoa=True)
            aluno.save()
            for j, (_, ano, legenda) in enumerate(p.get("fotos", [])):
                FotoAluno.objects.create(
                    aluno=aluno, imagem=imagem_exemplo(1200, 900, TONS[(i * 3 + j) % len(TONS)], semente=i * 10 + j),
                    legenda=legenda, ano=ano, status=FotoAluno.Status.APROVADA,
                )
        self.stdout.write(f"Sala 5: {len(dados['people'])} ex-alunos de exemplo.")

    def carregar_videos(self, dados):
        if not shutil.which("ffmpeg"):
            self.stdout.write("ffmpeg não encontrado: vídeos de exemplo não criados.")
            return
        with tempfile.TemporaryDirectory() as tmp:
            # WebM VP9 + Opus: toca no Android e no Chromium dos testes (que não tem H.264).
            arq = Path(tmp) / "exemplo.webm"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error",
                 "-f", "lavfi", "-i", "gradients=s=960x540:c0=0x4E4842:c1=0xB6A88F:x0=0:y0=0:x1=960:y1=540:speed=0.015:duration=12:rate=24",
                 "-f", "lavfi", "-i", "sine=frequency=220:duration=12,volume=0.15",
                 "-c:v", "libvpx-vp9", "-b:v", "350k", "-deadline", "realtime", "-cpu-used", "8",
                 "-c:a", "libopus", "-b:a", "48k", "-shortest", str(arq)],
                check=True,
            )
            conteudo = arq.read_bytes()
            total = 0
            for chave, (destaque, outros) in dados["vids"].items():
                sala = Sala.objects.get(numero=int(chave))
                for ordem, (tipo, _duracao, titulo, descricao) in enumerate([destaque, *outros]):
                    Video.objects.create(
                        sala=sala, titulo=titulo, descricao=descricao, tipo=tipo, destaque=ordem == 0, ordem=ordem,
                        demonstrativo=True, arquivo=ContentFile(conteudo, name="exemplo.webm"),
                    )
                    total += 1
        self.stdout.write(f"{total} vídeos de exemplo criados.")
