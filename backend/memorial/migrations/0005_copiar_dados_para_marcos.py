"""Copia os dados do formato antigo para o novo, sem perder nada já cadastrado.

- Cada marco (antigo "período") ganha a década correspondente como período.
- descrição antiga → resumo (até 200 caracteres) e narrativa (texto inteiro);
  resumo da galeria → lede; ícone → tipo.
- Fotos e vídeos herdam o período do marco. Legendas acima de 140 caracteres
  são cortadas (o texto completo vai para o texto alternativo).
"""

from django.db import migrations

ICONE_PARA_TIPO = {
    "predio": "predio",
    "tecnologia": "predio",
    "livro": "documento",
    "estrela": "documento",
    "formatura": "pessoa",
    "pessoas": "pessoa",
    "ciencia": "foto",
    "camera": "foto",
}


def avancar(apps, schema_editor):
    Marco = apps.get_model("memorial", "Marco")
    Periodo = apps.get_model("memorial", "Periodo")
    Foto = apps.get_model("memorial", "Foto")
    Video = apps.get_model("memorial", "Video")

    decadas = {}
    for m in Marco.objects.all().order_by("ano"):
        d = m.ano - m.ano % 10
        if d not in decadas:
            decadas[d] = Periodo.objects.create(inicio=d, fim=d + 9, titulo=f"Anos {d}")
        m.periodo = decadas[d]
        texto = (m.descricao or "").strip()
        m.resumo = texto[:200]
        m.narrativa = texto
        m.lede = (m.resumo_galeria or "")[:200]
        m.tipo = ICONE_PARA_TIPO.get(m.icone, "foto")
        m.save()

    for f in Foto.objects.select_related("marco"):
        if f.marco_id:
            f.periodo_id = f.marco.periodo_id
        if len(f.legenda or "") > 140:
            f.alt = f.legenda[:250]
            f.legenda = f.legenda[:139] + "…"
        f.save()

    for v in Video.objects.select_related("marco"):
        if v.marco_id:
            v.periodo_id = v.marco.periodo_id
            v.save()

    # capa de cada década: a primeira foto em destaque, ou a primeira com imagem
    for p in decadas.values():
        capa = (
            Foto.objects.filter(periodo=p).exclude(exibicao="")
            .order_by("-destaque", "ordem", "id").first()
        )
        if capa:
            p.foto_capa = capa
            p.save()


class Migration(migrations.Migration):
    dependencies = [("memorial", "0004_acervo_livro_de_honra")]

    operations = [migrations.RunPython(avancar, migrations.RunPython.noop)]