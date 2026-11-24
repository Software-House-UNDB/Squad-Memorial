"""Títulos novos das 6 salas (PR #11: títulos curtos e chamativos, sem subtítulo).

O PR mudou só os valores padrão do frontend (frontend/src/dados/salas.ts), que valem no modo demonstração;
com o servidor, o totem mostra o que está no banco. Aqui o banco recebe os mesmos títulos, mas só onde a
sala ainda tem o texto de fábrica (migração 0011): o que a equipe já editou no painel fica como está.
"""

from django.db import migrations

# numero: (nome, título e subtítulo de fábrica) -> (nome, título e subtítulo novos)
TITULOS = {
    1: (("Fundação", "Fundação", "Como tudo começou, em 1958"), ("Fundação", "Nossas Origens", "")),
    2: (("Diretores", "Diretores", "Quem conduziu a escola em cada época"), ("Diretores", "Liderança e Legado", "")),
    3: (("Professores", "Professores", "Quem ensinou gerações de alunos"), ("Professores", "Mestres de Gerações", "")),
    4: (("Artes", "Artes", "Música, teatro, dança e artes visuais"), ("Artes", "Palco e Ateliê", "")),
    5: (("Esporte", "Esporte", "Jogos, equipes e conquistas"), ("Esportes", "Campeões", "")),
    6: (("Alunos", "Alunos", "Gerações que passaram por aqui"), ("Alunos", "Memórias vivas", "")),
}


def _trocar(apps, de, para):
    Sala = apps.get_model("memorial", "Sala")
    for numero, textos in TITULOS.items():
        antes, depois = textos[de], textos[para]
        sala = Sala.objects.filter(numero=numero).first()
        if not sala:
            continue
        campos = []
        for campo, velho, novo in zip(("nome", "titulo", "subtitulo"), antes, depois):
            if getattr(sala, campo) == velho and velho != novo:
                setattr(sala, campo, novo)
                campos.append(campo)
        if campos:
            sala.save(update_fields=campos)


def aplicar(apps, schema_editor):
    _trocar(apps, 0, 1)


def desfazer(apps, schema_editor):
    _trocar(apps, 1, 0)


class Migration(migrations.Migration):
    dependencies = [("memorial", "0016_textos_linha_do_tempo")]
    operations = [migrations.RunPython(aplicar, desfazer)]
