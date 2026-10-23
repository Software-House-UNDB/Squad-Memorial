"""Monta o acervo no formato exato de frontend/src/dados/tipos.ts.

Os ids viram strings com prefixo por tipo ("p-3", "m-12", "f-40", "v-2", "d-5", "pe-1", "dp-7"),
porque o frontend relaciona tudo por id. Vídeos entram na lista de fotos com o campo `video`.
"""

import hashlib

from .models import (
    FONTE_PADRAO, ConfiguracaoTotem, Depoimento, Documento, Foto, Marco, Periodo, Pessoa, Video, paragrafos,
)


def _url(request, campo):
    # URL relativa (/media/...): o navegador resolve contra a origem do app, que pode ser o nginx
    # do compose ou o Vercel (que repassa /media ao servidor). Absoluta quebraria atrás de túnel/proxy.
    if not campo:
        return None
    return campo.url


def _fonte(obj):
    fonte = {"descricao": obj.fonte or FONTE_PADRAO}
    if obj.fonte_url:
        fonte["url"] = obj.fonte_url
    return fonte


def _tom(chave):
    """Tom estável (1–5) da placa provisória, derivado do id."""
    return int(hashlib.md5(chave.encode()).hexdigest(), 16) % 5 + 1


def _sem_vazios(d):
    """Remove chaves vazias (campos opcionais do tipos.ts). False é mantido."""
    return {k: v for k, v in d.items() if v not in (None, "", [])}


def _base(obj, prefixo):
    return {"id": f"{prefixo}-{obj.pk}", "demo": obj.demonstrativo, "fonte": _fonte(obj)}


def montar_acervo(request=None):
    periodos = list(Periodo.objects.filter(publicado=True))
    ids_periodos = {p.pk for p in periodos}

    marcos = list(
        Marco.objects.filter(publicado=True, periodo_id__in=ids_periodos)
        .prefetch_related("pessoas")
    )
    ano_marco = {m.pk: m.ano for m in marcos}
    ids_marcos = set(ano_marco)

    def marco_ok(marco_id):
        return marco_id if marco_id in ids_marcos else None

    def periodo_ok(periodo_id):
        return periodo_id if periodo_id in ids_periodos else None

    fotos_qs = list(Foto.objects.filter(publicado=True).prefetch_related("pessoas"))
    videos_qs = list(Video.objects.filter(publicado=True))
    documentos_qs = list(Documento.objects.filter(publicado=True).prefetch_related("paginas"))
    pessoas_qs = list(Pessoa.objects.filter(publicado=True))
    depoimentos_qs = list(Depoimento.objects.filter(publicado=True))
    ids_pessoas = {p.pk for p in pessoas_qs}

    # ---- fotos
    fotos, fotos_por_marco, fotos_por_pessoa, fotos_por_periodo = [], {}, {}, {}
    for f in fotos_qs:
        marco_id = marco_ok(f.marco_id)
        periodo_id = periodo_ok(f.periodo_id)
        ano = f.ano or ano_marco.get(marco_id)
        fid = f"f-{f.pk}"
        pessoas = [p.pk for p in f.pessoas.all() if p.pk in ids_pessoas]
        fotos.append(_sem_vazios({
            **_base(f, "f"),
            "src": _url(request, f.exibicao),
            "srcMiniatura": _url(request, f.miniatura),
            "tom": _tom(fid),
            "legenda": f.legenda,
            "data": f.data_texto or (str(ano) if ano else "Data a confirmar"),
            "ano": ano,
            "alt": f.alt or f.legenda,
            "credito": f.credito,
            "periodoId": f"p-{periodo_id}" if periodo_id else None,
            "marcoId": f"m-{marco_id}" if marco_id else None,
            "pessoaIds": [f"pe-{p}" for p in pessoas],
        }))
        if marco_id:
            fotos_por_marco.setdefault(marco_id, []).append(fid)
        if periodo_id and f.exibicao:
            fotos_por_periodo.setdefault(periodo_id, []).append(fid)
        for p in pessoas:
            fotos_por_pessoa.setdefault(p, []).append(fid)

    # ---- vídeos (entram como fotos com `video`)
    for v in videos_qs:
        marco_id = marco_ok(v.marco_id)
        periodo_id = periodo_ok(v.periodo_id)
        ano = v.ano or ano_marco.get(marco_id)
        vid = f"v-{v.pk}"
        legenda = v.titulo + (f". {v.descricao}" if v.descricao else "")
        fotos.append(_sem_vazios({
            **_base(v, "v"),
            "src": _url(request, v.capa),
            "srcMiniatura": _url(request, v.capa),
            "tom": _tom(vid),
            "legenda": legenda[:140],
            "data": v.data_texto or (str(ano) if ano else "Data a confirmar"),
            "ano": ano,
            "alt": f"Vídeo: {v.titulo}",
            "periodoId": f"p-{periodo_id}" if periodo_id else None,
            "marcoId": f"m-{marco_id}" if marco_id else None,
            "video": _sem_vazios({
                "src": _url(request, v.arquivo),
                "titulo": v.titulo,
                "duracao": v.duracao_segundos,
            }),
        }))
        if marco_id:
            fotos_por_marco.setdefault(marco_id, []).append(vid)

    # ---- documentos
    documentos, docs_por_marco = [], {}
    for d in documentos_qs:
        marco_id = marco_ok(d.marco_id)
        ano = d.ano or ano_marco.get(marco_id)
        documentos.append(_sem_vazios({
            **_base(d, "d"),
            "titulo": d.titulo,
            "data": d.data_texto or (str(ano) if ano else "Data a confirmar"),
            "ano": ano,
            "tipo": d.tipo,
            "codigoAcervo": d.codigo_acervo,
            "marcoId": f"m-{marco_id}" if marco_id else None,
            "paginas": [
                {"src": _url(request, pg.arquivo), "alt": pg.alt or f"Página {i} de {d.titulo}"}
                for i, pg in enumerate(d.paginas.all(), start=1)
            ],
            "transcricao": paragrafos(d.transcricao),
        }))
        documentos[-1].setdefault("paginas", [])
        if marco_id:
            docs_por_marco.setdefault(marco_id, []).append(f"d-{d.pk}")

    # ---- depoimentos (só os autorizados saem do servidor)
    depoimentos, depoimento_do_marco = [], {}
    for dp in depoimentos_qs:
        if not dp.autorizado:
            continue
        marco_id = marco_ok(dp.marco_id)
        depoimentos.append(_sem_vazios({
            **_base(dp, "dp"),
            "texto": dp.texto,
            "autor": dp.autor,
            "vinculo": dp.vinculo,
            "marcoId": f"m-{marco_id}" if marco_id else None,
            "autorizado": True,
        }))
        if marco_id:
            depoimento_do_marco.setdefault(marco_id, f"dp-{dp.pk}")

    # ---- marcos
    marcos_por_pessoa = {}
    lista_marcos = []
    for m in marcos:
        pessoas = [p.pk for p in m.pessoas.all() if p.pk in ids_pessoas]
        for p in pessoas:
            marcos_por_pessoa.setdefault(p, []).append(f"m-{m.pk}")
        narrativa = paragrafos(m.narrativa) or ([m.resumo] if m.resumo else [])
        lista_marcos.append(_sem_vazios({
            **_base(m, "m"),
            "periodoId": f"p-{m.periodo_id}",
            "ano": m.ano,
            "dataTexto": m.data_texto,
            "titulo": m.titulo,
            "resumo": m.resumo,
            "lede": m.lede or m.resumo,
            "narrativa": narrativa,
            "tipo": m.tipo,
            "conquista": m.conquista or None,
            "fotoIds": fotos_por_marco.get(m.pk, []),
            "documentoIds": docs_por_marco.get(m.pk, []),
            "pessoaIds": [f"pe-{p}" for p in pessoas],
            "depoimentoId": depoimento_do_marco.get(m.pk),
        }))
        for chave in ("fotoIds", "documentoIds", "pessoaIds"):
            lista_marcos[-1].setdefault(chave, [])

    # ---- pessoas
    ids_fotos = {f["id"] for f in fotos}
    pessoas = []
    for p in pessoas_qs:
        retrato = f"f-{p.retrato_id}" if p.retrato_id and f"f-{p.retrato_id}" in ids_fotos else None
        pessoas.append(_sem_vazios({
            **_base(p, "pe"),
            "nome": p.nome,
            "papel": p.papel,
            "biografia": paragrafos(p.biografia),
            "retratoId": retrato,
            "marcoIds": marcos_por_pessoa.get(p.pk, []),
            "fotoIds": fotos_por_pessoa.get(p.pk, []),
            "verificado": p.verificado or None,
            "autorizacaoImagem": p.autorizacao_imagem or None,
        }))
        for chave in ("biografia", "marcoIds", "fotoIds"):
            pessoas[-1].setdefault(chave, [])

    # ---- períodos
    lista_periodos = []
    for p in periodos:
        capa = None
        if p.foto_capa_id and f"f-{p.foto_capa_id}" in ids_fotos:
            capa = f"f-{p.foto_capa_id}"
        elif fotos_por_periodo.get(p.pk):
            capa = fotos_por_periodo[p.pk][0]
        lista_periodos.append(_sem_vazios({
            **_base(p, "p"),
            "titulo": p.titulo,
            "inicio": p.inicio,
            "fim": p.fim,
            "descricao": p.descricao,
            "fotoId": capa,
        }))
        lista_periodos[-1].setdefault("descricao", "")

    return {
        "periodos": lista_periodos,
        "marcos": lista_marcos,
        "fotos": fotos,
        "documentos": documentos,
        "pessoas": pessoas,
        "depoimentos": depoimentos,
    }


def montar_config():
    c = ConfiguracaoTotem.atual()
    return {
        "titulo": c.titulo,
        "subtitulo": c.subtitulo,
        "segundosInatividade": c.segundos_inatividade,
        "segundosContagem": c.segundos_contagem,
        "segundosLightbox": c.segundos_lightbox,
        "segundosAtualizacao": c.segundos_atualizacao,
    }