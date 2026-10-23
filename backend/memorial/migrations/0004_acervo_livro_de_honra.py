"""Passo 2 da passagem para o modelo do Design System "Livro de Honra".

Remove a FK antiga `periodo` de fotos e vídeos (já copiada para `marco` em 0003) e cria
os novos modelos: Periodo (décadas que agrupam os marcos), Pessoa, Documento, Página e
Depoimento. Os dados são migrados em 0005; a limpeza dos campos antigos fica em 0006.
"""

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models

import memorial.models


def item_acervo():
    """Campos comuns de ItemAcervo (fonte, link, demonstrativo, publicado, ordem e datas)."""
    return [
        ("criado_em", models.DateTimeField(auto_now_add=True)),
        ("atualizado_em", models.DateTimeField(auto_now=True)),
        ("fonte", models.CharField(blank=True, max_length=250)),
        ("fonte_url", models.URLField(blank=True, verbose_name="link da fonte")),
        ("demonstrativo", models.BooleanField(default=False)),
        ("publicado", models.BooleanField(default=True)),
        ("ordem", models.PositiveIntegerField(default=0)),
    ]


def id_field():
    return ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID"))


class Migration(migrations.Migration):
    dependencies = [("memorial", "0003_copiar_fk_marco")]

    operations = [
        # ---- a FK antiga (para o marco) sai; `marco` já tem os dados
        migrations.RemoveField("foto", "periodo"),
        migrations.RemoveField("video", "periodo"),

        # ---- novos modelos
        migrations.CreateModel(
            name="Periodo",
            fields=[
                id_field(),
                *item_acervo(),
                ("inicio", models.PositiveSmallIntegerField(verbose_name="ano inicial")),
                ("fim", models.PositiveSmallIntegerField(verbose_name="ano final")),
                ("titulo", models.CharField(max_length=120, verbose_name="título")),
                ("descricao", models.TextField(blank=True, verbose_name="descrição")),
            ],
            options={"ordering": ["inicio", "ordem", "id"], "verbose_name": "período"},
        ),
        migrations.CreateModel(
            name="Pessoa",
            fields=[
                id_field(),
                *item_acervo(),
                ("nome", models.CharField(max_length=120)),
                ("papel", models.CharField(max_length=120)),
                ("biografia", models.TextField(blank=True)),
                ("verificado", models.BooleanField(default=False)),
                ("autorizacao_imagem", models.BooleanField(default=False, verbose_name="autorização de uso de imagem")),
                ("retrato", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+", to="memorial.foto",
                )),
            ],
            options={"ordering": ["ordem", "nome", "id"]},
        ),
        migrations.CreateModel(
            name="Documento",
            fields=[
                id_field(),
                *item_acervo(),
                ("titulo", models.CharField(max_length=160, verbose_name="título")),
                ("tipo", models.CharField(max_length=60)),
                ("data_texto", models.CharField(blank=True, max_length=40, verbose_name="data")),
                ("ano", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("codigo_acervo", models.CharField(blank=True, max_length=60, verbose_name="código no acervo")),
                ("transcricao", models.TextField(blank=True, verbose_name="transcrição")),
                ("marco", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="documentos", to="memorial.marco",
                )),
            ],
            options={"ordering": ["ano", "ordem", "id"]},
        ),
        migrations.CreateModel(
            name="PaginaDocumento",
            fields=[
                id_field(),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("arquivo", models.FileField(
                    upload_to=memorial.models._caminho("documentos"),
                    validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "webp", "svg"])],
                )),
                ("alt", models.CharField(blank=True, max_length=250, verbose_name="texto alternativo")),
                ("ordem", models.PositiveIntegerField(default=0)),
                ("documento", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name="paginas", to="memorial.documento",
                )),
            ],
            options={"ordering": ["ordem", "id"], "verbose_name": "página"},
        ),
        migrations.CreateModel(
            name="Depoimento",
            fields=[
                id_field(),
                *item_acervo(),
                ("texto", models.TextField(max_length=400)),
                ("autor", models.CharField(max_length=120)),
                ("vinculo", models.CharField(max_length=120, verbose_name="vínculo")),
                ("autorizado", models.BooleanField(default=False)),
                ("marco", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="depoimentos", to="memorial.marco",
                )),
            ],
            options={"ordering": ["ordem", "id"]},
        ),

        # ---- marco: campos novos (os antigos saem em 0004, depois da cópia)
        migrations.AddField("marco", "periodo", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
            related_name="marcos", to="memorial.periodo", verbose_name="período",
        )),
        migrations.AddField("marco", "data_texto", models.CharField(blank=True, max_length=40, verbose_name="data por extenso")),
        migrations.AddField("marco", "resumo", models.CharField(default="", max_length=200), preserve_default=False),
        migrations.AddField("marco", "lede", models.CharField(blank=True, max_length=200)),
        migrations.AddField("marco", "narrativa", models.TextField(blank=True)),
        migrations.AddField("marco", "tipo", models.CharField(default="foto", max_length=20)),
        migrations.AddField("marco", "conquista", models.BooleanField(default=False)),
        migrations.AddField("marco", "fonte", models.CharField(blank=True, max_length=250)),
        migrations.AddField("marco", "fonte_url", models.URLField(blank=True, verbose_name="link da fonte")),
        migrations.AddField("marco", "demonstrativo", models.BooleanField(default=False)),
        migrations.AddField("marco", "pessoas", models.ManyToManyField(blank=True, related_name="marcos", to="memorial.pessoa")),

        # ---- foto
        migrations.AddField("foto", "periodo", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
            related_name="fotos", to="memorial.periodo", verbose_name="período",
        )),
        migrations.AddField("foto", "data_texto", models.CharField(blank=True, max_length=40, verbose_name="data")),
        migrations.AddField("foto", "ano", models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField("foto", "alt", models.CharField(blank=True, max_length=250, verbose_name="texto alternativo")),
        migrations.AddField("foto", "fonte", models.CharField(blank=True, max_length=250)),
        migrations.AddField("foto", "fonte_url", models.URLField(blank=True, verbose_name="link da fonte")),
        migrations.AddField("foto", "demonstrativo", models.BooleanField(default=False)),
        migrations.AddField("foto", "pessoas", models.ManyToManyField(blank=True, related_name="fotos", to="memorial.pessoa")),

        # ---- vídeo
        migrations.AddField("video", "periodo", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
            related_name="videos", to="memorial.periodo", verbose_name="período",
        )),
        migrations.AddField("video", "data_texto", models.CharField(blank=True, max_length=40, verbose_name="data")),
        migrations.AddField("video", "ano", models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField("video", "fonte", models.CharField(blank=True, max_length=250)),
        migrations.AddField("video", "fonte_url", models.URLField(blank=True, verbose_name="link da fonte")),
        migrations.AddField("video", "demonstrativo", models.BooleanField(default=False)),

        # ---- período: foto de capa (depois de Foto existir com o nome novo)
        migrations.AddField("periodo", "foto_capa", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
            related_name="+", to="memorial.foto", verbose_name="foto de capa",
        )),

        # ---- configuração
        migrations.AddField("configuracaototem", "segundos_contagem", models.PositiveIntegerField(default=15)),
        migrations.AddField("configuracaototem", "segundos_lightbox", models.PositiveIntegerField(default=45)),
    ]