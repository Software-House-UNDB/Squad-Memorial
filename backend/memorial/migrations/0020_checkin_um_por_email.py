"""Código de confirmação do check-in enviado por e-mail.

A regra do mesmo e-mail continua a de antes (0008): um check-in por e-mail e ano. O limite de check-ins por
e-mail (CHECKIN_MAX_POR_EMAIL) fica no código, em confirmacao.py, e vale só para os check-ins novos.
(Uma versão anterior desta migração trocava a regra por "um check-in por e-mail"; a 0021 desfaz isso nos bancos
que chegaram a aplicá-la.)
"""

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('memorial', '0019_remove_marco'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfirmacaoEmail',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('codigo_hash', models.CharField(max_length=64)),
                ('criado_em', models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                ('expira_em', models.DateTimeField()),
                ('tentativas', models.PositiveSmallIntegerField(default=0)),
                ('usado_em', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'confirmação de e-mail',
                'verbose_name_plural': 'confirmações de e-mail',
                'ordering': ['-criado_em', '-id'],
            },
        ),
    ]
