"""Volta a regra "um check-in por e-mail e ano" nos bancos que aplicaram a primeira versão da 0020.

Aquela versão trocava a regra por "um check-in por e-mail" (constraint aluno_email_unico); a 0020 atual não troca
mais nada. Aqui, só no banco: tira aluno_email_unico se existir e cria aluno_email_ano_unico se faltar. Num banco
que nunca aplicou a 0020 antiga (a produção, por exemplo), não faz nada. Os dados de lá já seguem a regra mais
restrita, então a mais folgada sempre cabe.
"""

from django.db import migrations, models
from django.db.models import Q

ANTIGA = models.UniqueConstraint(fields=["email"], condition=~Q(email=""), name="aluno_email_unico")
ATUAL = models.UniqueConstraint(fields=["email", "ano"], condition=~Q(email=""), name="aluno_email_ano_unico")


def reparar(apps, schema_editor):
    Aluno = apps.get_model("memorial", "Aluno")
    conexao = schema_editor.connection
    with conexao.cursor() as cursor:
        existentes = conexao.introspection.get_constraints(cursor, Aluno._meta.db_table)
    if ANTIGA.name in existentes:
        schema_editor.remove_constraint(Aluno, ANTIGA)
    if ATUAL.name not in existentes:
        schema_editor.add_constraint(Aluno, ATUAL)


class Migration(migrations.Migration):

    dependencies = [
        ("memorial", "0020_checkin_um_por_email"),
    ]

    operations = [
        migrations.RunPython(reparar, migrations.RunPython.noop),
    ]
