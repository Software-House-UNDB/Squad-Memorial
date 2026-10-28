"""Remove o acervo do "Livro de Honra" (Memorial UNDB), substituído pelas salas do Memorial Dom Bosco.

O acervo antigo era demonstrativo. Mesmo assim, faça backup antes de migrar (ver README):
    docker compose exec db pg_dump -U memorial memorial > backup-antes-dom-bosco.sql
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('memorial', '0006_limpeza_campos_antigos'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ConfiguracaoTotem',
        ),
        migrations.RemoveField(
            model_name='documento',
            name='marco',
        ),
        migrations.RemoveField(
            model_name='paginadocumento',
            name='documento',
        ),
        migrations.RemoveField(
            model_name='foto',
            name='marco',
        ),
        migrations.RemoveField(
            model_name='foto',
            name='periodo',
        ),
        migrations.RemoveField(
            model_name='foto',
            name='pessoas',
        ),
        migrations.RemoveField(
            model_name='pessoa',
            name='retrato',
        ),
        migrations.RemoveField(
            model_name='periodo',
            name='foto_capa',
        ),
        migrations.RemoveField(
            model_name='marco',
            name='periodo',
        ),
        migrations.RemoveField(
            model_name='marco',
            name='pessoas',
        ),
        migrations.RemoveField(
            model_name='video',
            name='marco',
        ),
        migrations.RemoveField(
            model_name='video',
            name='periodo',
        ),
        migrations.DeleteModel(
            name='Depoimento',
        ),
        migrations.DeleteModel(
            name='Documento',
        ),
        migrations.DeleteModel(
            name='PaginaDocumento',
        ),
        migrations.DeleteModel(
            name='Foto',
        ),
        migrations.DeleteModel(
            name='Pessoa',
        ),
        migrations.DeleteModel(
            name='Marco',
        ),
        migrations.DeleteModel(
            name='Periodo',
        ),
        migrations.DeleteModel(
            name='Video',
        ),
    ]
