"""Um check-in por e-mail (antes era um por e-mail e ano) e o código de confirmação enviado por e-mail.

Se o banco já tiver o mesmo e-mail em mais de um cadastro, a migração para sem mudar nada e lista os
cadastros (e o backend não sobe): a equipe escolhe qual fica e apaga os outros no painel, na versão anterior.
Veja o README, "Atualizando para o check-in com confirmação por e-mail".
"""

import django.utils.timezone
from django.db import migrations, models
from django.db.models import Count


def conferir_emails_repetidos(apps, schema_editor):
    Aluno = apps.get_model("memorial", "Aluno")
    repetidos = (
        Aluno.objects.exclude(email="").values("email").annotate(n=Count("id")).filter(n__gt=1).values_list("email", flat=True)
    )
    if not repetidos:
        return
    linhas = []
    for email in repetidos:
        cadastros = Aluno.objects.filter(email=email).order_by("checkin_em")
        linhas.append(f"  {email}: " + "; ".join(f"nº {a.pk} {a.nome} ({a.ano}, {a.turma})" for a in cadastros))
    raise RuntimeError(
        "Há e-mails em mais de um cadastro de ex-aluno, e agora cada e-mail pode ter um só. Nada foi alterado.\n"
        "Volte para a versão anterior, apague no painel (Ex-alunos) os cadastros que sobram e atualize de novo. "
        "Veja o README, \"Atualizando para o check-in com confirmação por e-mail\":\n" + "\n".join(linhas)
    )


class Migration(migrations.Migration):

    dependencies = [
        ('memorial', '0019_remove_marco'),
    ]

    operations = [
        migrations.RunPython(conferir_emails_repetidos, migrations.RunPython.noop),
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
        migrations.RemoveConstraint(
            model_name='aluno',
            name='aluno_email_ano_unico',
        ),
        migrations.AddConstraint(
            model_name='aluno',
            constraint=models.UniqueConstraint(condition=models.Q(('email', ''), _negated=True), fields=('email',), name='aluno_email_unico'),
        ),
    ]
