from django.db import migrations


def copiar(apps, schema_editor):
    for nome in ("Foto", "Video"):
        modelo = apps.get_model("memorial", nome)
        for obj in modelo.objects.all():
            obj.marco_id = obj.periodo_id
            obj.save(update_fields=["marco"])


def voltar(apps, schema_editor):
    for nome in ("Foto", "Video"):
        modelo = apps.get_model("memorial", nome)
        for obj in modelo.objects.exclude(marco=None):
            obj.periodo_id = obj.marco_id
            obj.save(update_fields=["periodo"])


class Migration(migrations.Migration):
    dependencies = [("memorial", "0002_periodo_vira_marco")]

    operations = [migrations.RunPython(copiar, voltar)]