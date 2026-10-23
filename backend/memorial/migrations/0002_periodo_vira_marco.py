"""Passo 1 da passagem para o modelo "Livro de Honra": o antigo "Periodo" (um ano com título
e descrição) passa a se chamar "Marco". Fotos e vídeos ganham a FK `marco`; os dados são
copiados em 0003 e a FK antiga `periodo` sai em 0004.

(Não usamos RenameField porque, no PostgreSQL, o índice da FK antiga manteria o nome
"..._periodo_id_..." e colidiria com a nova FK `periodo` criada em 0004.)
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("memorial", "0001_initial")]

    operations = [
        migrations.RenameModel("Periodo", "Marco"),
        # a ordenação antiga dos vídeos usava "periodo__ano"
        migrations.AlterModelOptions("video", {"ordering": ["ordem", "id"], "verbose_name": "vídeo"}),
        migrations.AddField("foto", "marco", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
            related_name="+", to="memorial.marco",
        )),
        migrations.AddField("video", "marco", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
            related_name="+", to="memorial.marco",
        )),
    ]