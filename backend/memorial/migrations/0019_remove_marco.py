"""Tira os Marcos do sistema: a aba saiu do totem e o cadastro saiu do painel, do /admin e da API.

Antes de apagar a tabela, apaga do disco as fotos de época dos marcos (o DROP não dispara os signals
que fazem isso no delete() normal). Não tem volta: desfazer recria a tabela vazia.
"""

from django.db import migrations


def apagar_fotos(apps, schema_editor):
    Marco = apps.get_model("memorial", "Marco")
    storage = Marco._meta.get_field("foto").storage
    for nome in Marco.objects.exclude(foto="").values_list("foto", flat=True):
        storage.delete(nome)


class Migration(migrations.Migration):

    dependencies = [
        ("memorial", "0018_rota_do_totem"),
    ]

    operations = [
        migrations.RunPython(apagar_fotos, migrations.RunPython.noop),
        migrations.DeleteModel(name="Marco"),
    ]
