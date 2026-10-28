"""Cria as cinco salas do percurso e a configuração do memorial.

Os textos vêm do protótipo (docs/referencia/tour-memorial-dom-bosco.html). A cor da sala 2 foi
escurecida de #A07D47 para #84673A, para o número e a aba ativa terem contraste 4,5:1 com o marfim.
"""

from django.db import migrations

SALAS = [
    (1, "educacao", "Educação", "Retrospectiva da educação",
     "Como se ensina e se aprende aqui, de 1958 até hoje", "#4A4844", "conteudo"),
    (2, "trofeus", "Troféus", "Sala de troféus",
     "Conquistas esportivas, culturais e acadêmicas", "#84673A", "conteudo"),
    (3, "artes", "Artes", "Artes",
     "Música, teatro, dança e artes visuais na escola", "#8E5444", "conteudo"),
    (4, "professoras", "Professoras", "Nossas professoras",
     "As mulheres que ensinaram gerações de alunos", "#5A6650", "conteudo"),
    (5, "fechamento", "Fechamento", "Encontre seus colegas",
     "Todos que fizeram check-in no Memorial. Pesquise por nome ou por ano.", "#2B2A28", "fechamento"),
]


def criar(apps, schema_editor):
    Sala = apps.get_model("memorial", "Sala")
    for numero, slug, nome, titulo, subtitulo, cor, tipo in SALAS:
        Sala.objects.update_or_create(
            numero=numero,
            defaults={"slug": slug, "nome": nome, "titulo": titulo, "subtitulo": subtitulo, "cor": cor, "tipo": tipo},
        )
    apps.get_model("memorial", "ConfiguracaoMemorial").objects.get_or_create(pk=1)


class Migration(migrations.Migration):
    dependencies = [("memorial", "0008_salas_dom_bosco")]
    operations = [migrations.RunPython(criar, migrations.RunPython.noop)]
