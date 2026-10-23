"""Carrega o acervo demonstrativo do Design System "Livro de Honra".

Tudo é marcado como `demonstrativo` (o totem mostra a etiqueta "Conteúdo demonstrativo")
e NADA disto é fato histórico da UNDB. A única informação verificada é a fundadora,
Maria Izabel Rodrigues (fonte pública: ABMES).

    docker compose exec backend python manage.py carregar_exemplo
    docker compose exec backend python manage.py carregar_exemplo --limpar   # apaga TODO o acervo antes
    docker compose exec backend python manage.py carregar_exemplo --remover  # só remove o demonstrativo

As fotos de exemplo não têm imagem: o totem mostra a placa provisória "Foto do acervo".
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from memorial.models import (
    ConfiguracaoTotem, Depoimento, Documento, Foto, Marco, PaginaDocumento, Periodo, Pessoa, Video,
)

DEMO = "Conteúdo demonstrativo · substituir pelo acervo oficial"
PASTA = Path(__file__).parent / "exemplo"

PERIODOS = [
    (1980, "Os primeiros anos", "Texto demonstrativo do período: duas ou três frases de contexto sobre a década, escritas a partir da pesquisa no acervo."),
    (1990, "Os anos de expansão", "Texto demonstrativo do período: duas ou três frases que dão contexto antes dos marcos, sem repetir o que cada cartão já conta."),
    (2000, "Novos cursos e espaços", "Texto demonstrativo do período. O texto definitivo deve sair da pesquisa no acervo e ser validado pela instituição."),
    (2010, "Um campus em obras", "Texto demonstrativo do período, com o contexto geral da década em linguagem simples e direta."),
    (2020, "Novos tempos", "Texto demonstrativo do período mais recente. Este período continua aberto e recebe novos marcos."),
]

# (chave, ano, tipo, conquista, título, resumo, lede, narrativa, pessoas, nº de fotos)
MARCOS = [
    ("m-1985", 1985, "predio", False, "Primeiras salas de aula", "O começo das atividades em poucas salas.", "As primeiras turmas ocupavam um espaço pequeno.", ["Texto demonstrativo do acontecimento, em até três frases: o que mudou, para quem e por que importa. O texto definitivo vem da pesquisa no acervo."], ["pe-02"], 4),
    ("m-1988", 1988, "foto", False, "Primeira biblioteca", "Um acervo inicial para estudo e pesquisa.", "Livros doados e comprados formaram o primeiro acervo.", ["Texto demonstrativo do acontecimento, com a informação essencial em linguagem simples."], [], 3),
    ("m-1991", 1991, "pessoa", False, "Primeira turma formada", "Colação no auditório provisório.", "A primeira colação de grau reuniu famílias e professores.", ["Texto demonstrativo do acontecimento: quem estava lá, onde foi e o que significou para a comunidade acadêmica."], ["pe-04", "pe-03"], 8),
    ("m-1994", 1994, "predio", False, "Novo prédio administrativo", "A secretaria deixa as salas de aula.", "A administração ganhou um prédio próprio.", ["Texto demonstrativo do acontecimento, com o que mudou na rotina de alunos e funcionários."], [], 4),
    ("m-1998", 1998, "predio", True, "Inauguração do novo bloco", "Salas, laboratórios e biblioteca maior.", "O campus ganhou salas, laboratórios e uma biblioteca maior.", ["Texto demonstrativo do acontecimento, em até três frases: o que mudou, para quem e por que importa.", 'Um segundo parágrafo demonstrativo aparece em "Ler mais", para mostrar como textos longos são tratados sem rolar a página.'], ["pe-02", "pe-06"], 6),
    ("m-1999", 1999, "foto", False, "Biblioteca ampliada", "Novo acervo e sala de estudos.", "A biblioteca dobrou de tamanho.", ["Texto demonstrativo do acontecimento."], [], 6),
    ("m-2002", 2002, "documento", True, "Autorização de novos cursos", "A oferta de graduação se amplia.", "Novos cursos passaram a ser oferecidos.", ["Texto demonstrativo do acontecimento, citando o documento que registra a autorização."], ["pe-05"], 2),
    ("m-2004", 2004, "pessoa", False, "Primeira formatura no novo auditório", "Cerimônia registrada em fotos e no livro de atas.", "O auditório recebeu sua primeira colação.", ["Texto demonstrativo do acontecimento."], ["pe-08"], 14),
    ("m-2008", 2008, "predio", False, "Laboratórios renovados", "Equipamentos novos para as aulas práticas.", "Os laboratórios foram reformados e equipados.", ["Texto demonstrativo do acontecimento."], [], 5),
    ("m-2012", 2012, "predio", False, "Novo centro de convivência", "Um espaço de encontro para a comunidade.", "O campus ganhou um lugar para conversar e descansar.", ["Texto demonstrativo do acontecimento."], ["pe-07"], 5),
    ("m-2016", 2016, "documento", True, "Reconhecimento de curso", "Registro oficial de qualidade de um curso.", "Um curso recebeu reconhecimento oficial.", ["Texto demonstrativo do acontecimento, com referência ao documento oficial."], ["pe-05"], 3),
    ("m-2021", 2021, "foto", False, "Aulas e eventos em novo formato", "A comunidade se adapta a novas rotinas.", "Aulas e eventos ganharam novos formatos.", ["Texto demonstrativo do acontecimento."], [], 4),
    ("m-2024", 2024, "predio", False, "Novo espaço de pesquisa", "Um lugar dedicado a projetos e pesquisa.", "Projetos de pesquisa ganharam espaço próprio.", ["Texto demonstrativo do acontecimento."], [], 3),
]

# (chave, marco, título, data, tipo, páginas [(arquivo, alt)])
DOCUMENTOS = [
    ("d-1998", "m-1998", "Ata de inauguração do novo bloco", "1998 (a confirmar)", "Ata institucional",
     [("documento-ata-p1.svg", "Página 1 da ata demonstrativa"), ("documento-ata-p2.svg", "Página 2 da ata demonstrativa")]),
    ("d-2002", "m-2002", "Ofício de autorização de cursos", "2002 (a confirmar)", "Ofício",
     [("documento-oficio-p1.svg", "Página única do ofício demonstrativo")]),
    # Sem páginas: demonstra o estado "ainda não digitalizado".
    ("d-2008", "m-2008", "Projeto de reforma dos laboratórios", "2008 (a confirmar)", "Projeto", []),
    ("d-2016", "m-2016", "Portaria de reconhecimento de curso", "2016 (a confirmar)", "Portaria",
     [("documento-portaria-p1.svg", "Página 1 da portaria demonstrativa"),
      # Arquivo propositalmente ausente: demonstra o estado de falha de carregamento.
      (None, "Página 2 da portaria demonstrativa")]),
]
TRANSCRICAO_ATA = (
    "Transcrição demonstrativa. Neste espaço entra o texto integral do documento, transcrito a partir da "
    "digitalização, para leitura confortável de longe.\n\n"
    "Cada parágrafo da transcrição corresponde a um trecho do original. Nomes, datas e números devem ser "
    "conferidos com o documento físico."
)

# (chave, papel, retrato = (marco, nº da foto) ou None, biografia, fotos [(marco, nº)])
PESSOAS = [
    ("pe-02", "Primeira direção acadêmica", ("m-1985", 1), "Biografia demonstrativa em até 90 palavras, escrita a partir do acervo e validada com a pessoa ou a família.", [("m-1985", 1), ("m-1998", 2)]),
    ("pe-03", "Professora fundadora", ("m-1991", 1), "Biografia demonstrativa.", [("m-1991", 1)]),
    ("pe-04", "Ex-aluno · turma pioneira", None, "Biografia demonstrativa. Sem retrato autorizado, o camafeu fica vazio.", []),
    ("pe-05", "Coordenação de curso", ("m-2002", 1), "Biografia demonstrativa.", [("m-2002", 1)]),
    ("pe-06", "Colaboradora pioneira", ("m-1998", 3), "Biografia demonstrativa.", [("m-1998", 3)]),
    ("pe-07", "Professor homenageado", None, "Biografia demonstrativa.", []),
    ("pe-08", "Ex-aluna · turma de 2000", ("m-2004", 1), "Biografia demonstrativa.", [("m-2004", 1)]),
]

# (marco ou None, texto, vínculo, autorizado)
DEPOIMENTOS = [
    ("m-1991", "Depoimento demonstrativo de quem estava na primeira colação, com no máximo duas linhas.", "Turma de 1991", True),
    ("m-1998", "Depoimento curto de quem viveu o momento.", "Turma de 1998", True),
    ("m-2004", "Depoimento demonstrativo sobre a primeira formatura no auditório novo.", "Turma de 2004", True),
    ("m-2021", "Depoimento demonstrativo sobre como a comunidade se adaptou às novas rotinas.", "Professora", True),
    (None, "Depoimento demonstrativo sem marco associado: uma lembrança do dia a dia no campus.", "Colaborador desde 1995", True),
    # Sem autorização registrada: não deve aparecer em lugar nenhum.
    (None, "Depoimento sem autorização (não exibido).", "—", False),
]

VIDEOS = [
    ("m-1998", "Inauguração do novo bloco", "Registro demonstrativo da cerimônia."),
    ("m-2004", "Formatura no novo auditório", "Vídeo demonstrativo da colação."),
]

MODELOS = (Depoimento, PaginaDocumento, Documento, Video, Pessoa, Foto, Marco, Periodo)


def apagar(qs):
    for obj in qs:
        obj.delete()  # um a um, para os signals apagarem os arquivos do disco


class Command(BaseCommand):
    help = "Carrega o acervo demonstrativo (períodos, marcos, fotos, vídeos, documentos, pessoas e depoimentos)."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Apaga TODO o acervo antes de carregar.")
        parser.add_argument("--remover", action="store_true", help="Só remove o conteúdo demonstrativo.")

    def handle(self, *args, limpar=False, remover=False, **opts):
        if limpar or remover:
            for modelo in MODELOS:
                qs = modelo.objects.all()
                if remover and hasattr(modelo, "demonstrativo"):
                    qs = qs.filter(demonstrativo=True)
                elif remover:
                    qs = qs.filter(documento__demonstrativo=True)
                apagar(qs)
            self.stdout.write(self.style.WARNING("Acervo apagado." if limpar else "Conteúdo demonstrativo removido."))
            if remover:
                return

        if Marco.objects.filter(demonstrativo=True).exists():
            self.stdout.write("O acervo demonstrativo já está carregado. Use --limpar para recarregar.")
            return

        ConfiguracaoTotem.atual()
        with transaction.atomic():
            self.carregar()
        self.carregar_videos()
        self.stdout.write(self.style.SUCCESS("Acervo demonstrativo carregado."))

    def carregar(self):
        comum = {"demonstrativo": True, "fonte": DEMO}

        periodos = {}
        for inicio, titulo, descricao in PERIODOS:
            periodos[inicio] = Periodo.objects.create(
                inicio=inicio, fim=inicio + 9, titulo=titulo, descricao=descricao, **comum,
            )

        pessoas = {}
        Pessoa.objects.get_or_create(
            nome="Maria Izabel Rodrigues",
            defaults={
                "papel": "Fundadora da UNDB", "verificado": True,
                "biografia": "Biografia a ser escrita com a família e a instituição a partir do acervo, em até 90 palavras.",
                "fonte": "Nome e papel: ABMES (nota pública). Biografia e retrato pendentes.",
                "fonte_url": "https://abmes.org.br/noticias/detalhe/5214/abmes-lamenta-falecimento-de-maria-izabel-rodrigues-fundadora-da-undb",
            },
        )
        for chave, papel, _, bio, _ in PESSOAS:
            pessoas[chave] = Pessoa.objects.create(
                nome="Nome a confirmar", papel=papel, biografia=bio, ordem=int(chave[-2:]), **comum,
            )

        marcos, fotos = {}, {}
        for chave, ano, tipo, conquista, titulo, resumo, lede, narrativa, ids_pessoas, n in MARCOS:
            m = Marco.objects.create(
                periodo=periodos[ano - ano % 10], ano=ano, tipo=tipo, conquista=conquista, titulo=titulo,
                resumo=resumo, lede=lede, narrativa="\n\n".join(narrativa), **comum,
            )
            m.pessoas.set([pessoas[p] for p in ids_pessoas])
            marcos[chave] = m
            for i in range(1, n + 1):
                fotos[(chave, i)] = Foto.objects.create(
                    marco=m, ordem=i,
                    legenda=f"{titulo}: fotografia {i} de {n}. Legenda demonstrativa com o que e quem aparece.",
                    alt=f"{titulo}, fotografia demonstrativa {i}", **comum,
                )
            fotos[(chave, 1)].pessoas.set([pessoas[p] for p in ids_pessoas])

        # capa de cada período: a primeira foto do primeiro marco
        for p in periodos.values():
            p.foto_capa = Foto.objects.filter(periodo=p).order_by("marco__ano", "ordem").first()
            p.save()

        for chave, _, retrato, _, ids_fotos in PESSOAS:
            pe = pessoas[chave]
            if retrato:
                pe.retrato = fotos[retrato]
                pe.autorizacao_imagem = True
                pe.save()
            for f in ids_fotos:
                fotos[f].pessoas.add(pe)

        for chave, marco, titulo, data, tipo, paginas in DOCUMENTOS:
            d = Documento.objects.create(
                marco=marcos[marco], titulo=titulo, data_texto=data, tipo=tipo, codigo_acervo="Código a definir",
                transcricao=TRANSCRICAO_ATA if chave == "d-1998" else "", **comum,
            )
            for ordem, (arquivo, alt) in enumerate(paginas, start=1):
                pg = PaginaDocumento(documento=d, alt=alt, ordem=ordem)
                if arquivo is None:
                    pg.arquivo.name = "documentos/arquivo-ausente.svg"
                    pg.save()
                else:
                    pg.arquivo.save(arquivo, ContentFile((PASTA / arquivo).read_bytes()), save=True)

        for marco, texto, vinculo, autorizado in DEPOIMENTOS:
            Depoimento.objects.create(
                marco=marcos.get(marco), texto=texto, autor="Nome a confirmar", vinculo=vinculo,
                autorizado=autorizado, **comum,
            )

    def carregar_videos(self):
        if not shutil.which("ffmpeg"):
            self.stdout.write("ffmpeg não encontrado: vídeos de exemplo não criados.")
            return
        with tempfile.TemporaryDirectory() as tmp:
            arq = Path(tmp) / "teste.mp4"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error",
                 "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=8",
                 "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
                 "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
                 "-movflags", "+faststart", str(arq)],
                check=True,
            )
            for ordem, (marco, titulo, descricao) in enumerate(VIDEOS, start=1):
                m = Marco.objects.filter(demonstrativo=True, ano=int(marco[2:])).first()
                Video.objects.create(
                    marco=m, titulo=titulo, descricao=descricao, ordem=ordem, demonstrativo=True, fonte=DEMO,
                    arquivo=ContentFile(arq.read_bytes(), name="exemplo.mp4"),
                )
        self.stdout.write(f"{len(VIDEOS)} vídeos de exemplo criados.")