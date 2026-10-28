"""API pública do Memorial (/api/memorial/).

Leitura sem autenticação para os totens; o único POST é o check-in, com limite de frequência por IP,
campo isca e verificação das imagens. Nenhuma resposta inclui e-mail, IP ou consentimento.
"""

import hashlib
import math
from datetime import timedelta

from django.db.models import Case, Count, DateTimeField, F, Max, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle

from .media import ImagemInvalida, validar_imagem_enviada
from .models import Aluno, ConfiguracaoMemorial, Foto, FotoAluno, Marco, Sala, Video, normalizar
from .serializers import (
    CheckinSerializer, montar_aluno_perfil, montar_aluno_resumo, montar_config, montar_config_checkin,
    montar_foto, montar_marco, montar_sala, montar_video, registrar_checkin,
)

POR_PAGINA = 12
MAX_FOTOS_CHECKIN = 3
SEM_CACHE = {"Cache-Control": "no-store"}


# ---------------------------------------------------------------- totem das salas

def _sala_ativa(numero):
    return get_object_or_404(Sala, numero=numero, ativa=True)


def alunos_visiveis():
    """Só quem está aprovado e deu consentimento aparece na sala 5."""
    return Aluno.objects.filter(status=Aluno.Status.APROVADO, consentimento=True)


def calcular_versao(sala):
    """Hash que só muda quando algo desta sala (ou a configuração) muda, inclusive exclusões.

    O totem consulta /versao/?sala=N periodicamente e só baixa a sala de novo quando o valor muda.
    """
    config = ConfiguracaoMemorial.atual()
    partes = [f"sala:{sala.pk}:{sala.atualizado_em.isoformat()}", f"config:{config.atualizado_em.isoformat()}"]
    for modelo in (Marco, Foto, Video):
        agg = modelo.objects.filter(sala=sala).aggregate(n=Count("id"), m=Max("atualizado_em"))
        partes.append(f"{modelo.__name__}:{agg['n']}:{agg['m']}")
    if sala.tipo == Sala.Tipo.FECHAMENTO:
        partes.append(f"demo:{Aluno.objects.filter(demonstrativo=True).count()}")
    return hashlib.sha1("|".join(partes).encode()).hexdigest()[:16]


@api_view(["GET"])
def sala(request, numero):
    """Tudo que o totem da sala precisa, em uma chamada (guardada em cache para funcionar offline)."""
    s = _sala_ativa(numero)
    marcos = list(Marco.objects.filter(sala=s, publicado=True))
    fotos = list(Foto.objects.filter(sala=s, publicado=True))
    videos = list(Video.objects.filter(sala=s, publicado=True))
    if s.tipo == Sala.Tipo.FECHAMENTO:
        demonstrativo = alunos_visiveis().filter(demonstrativo=True).exists()
    else:
        demonstrativo = any(x.demonstrativo for x in (*marcos, *fotos, *videos))
    return Response({
        "versao": calcular_versao(s),
        "config": montar_config(ConfiguracaoMemorial.atual()),
        "sala": montar_sala(s),
        "demonstrativo": demonstrativo,
        "marcos": [montar_marco(m) for m in marcos],
        "fotos": [montar_foto(f) for f in fotos],
        "videos": [montar_video(v) for v in videos],
    }, headers={"Cache-Control": "no-cache"})


@api_view(["GET"])
def versao(request):
    try:
        numero = int(request.query_params.get("sala", ""))
    except ValueError:
        return Response({"erro": "Informe ?sala=N."}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"versao": calcular_versao(_sala_ativa(numero))}, headers=SEM_CACHE)


# ---------------------------------------------------------------- sala 5

def _inteiro(valor, padrao=None):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return padrao


def _ordenar(qs):
    """Check-ins recentes primeiro (o mais novo no topo), depois os demais por nome."""
    limite = timezone.now() - timedelta(hours=Aluno.HORAS_NOVO)
    return qs.annotate(
        recente_em=Case(When(checkin_em__gte=limite, then=F("checkin_em")), default=None, output_field=DateTimeField()),
    ).order_by(F("recente_em").desc(nulls_last=True), "nome_busca", "id")


@api_view(["GET"])
def alunos(request):
    """Busca do diretório: ?q=joao sil&ano=1998&decada=1990-1999&pagina=1.

    Cada palavra de `q` precisa estar no nome (sem acento e sem diferença de maiúsculas).
    """
    p = request.query_params
    base = alunos_visiveis()
    qs = base
    for palavra in normalizar(p.get("q", "")).split():
        qs = qs.filter(nome_busca__contains=palavra)
    ano = _inteiro(p.get("ano"))
    if ano:
        qs = qs.filter(ano=ano)
    decada = (p.get("decada") or "").replace("–", "-").split("-")
    if len(decada) == 2 and all(_inteiro(x) for x in decada):
        qs = qs.filter(ano__gte=int(decada[0]), ano__lte=int(decada[1]))

    total = qs.count()
    paginas = max(1, math.ceil(total / POR_PAGINA))
    pagina = min(max(1, _inteiro(p.get("pagina"), 1)), paginas)
    inicio = (pagina - 1) * POR_PAGINA
    resultados = _ordenar(qs)[inicio:inicio + POR_PAGINA]
    return Response({
        "total": total,
        "pagina": pagina,
        "paginas": paginas,
        "porPagina": POR_PAGINA,
        "anos": sorted(set(base.values_list("ano", flat=True))),
        "resultados": [montar_aluno_resumo(a) for a in resultados],
    }, headers=SEM_CACHE)


@api_view(["GET"])
def aluno(request, pk):
    a = get_object_or_404(alunos_visiveis(), pk=pk)
    fotos = a.fotos.filter(status=FotoAluno.Status.APROVADA)
    colegas = _ordenar(
        alunos_visiveis().filter(ano=a.ano, turma_chave=a.turma_chave).exclude(pk=a.pk)
    )[:4]
    return Response(montar_aluno_perfil(a, fotos, colegas), headers=SEM_CACHE)


# ---------------------------------------------------------------- check-in

class _LimiteCheckin(SimpleRateThrottle):
    """Limite por IP só para o envio (POST). A leitura da configuração não conta."""

    def get_rate(self):
        # lido a cada pedido (e não na definição da classe), para valer o que estiver no settings
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LimiteCheckinMinuto(_LimiteCheckin):
    scope = "checkin_minuto"


class LimiteCheckinHora(_LimiteCheckin):
    scope = "checkin_hora"


@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@throttle_classes([LimiteCheckinMinuto, LimiteCheckinHora])
def checkin(request):
    """GET: textos do formulário. POST (multipart): cadastra a passagem do visitante.

    A resposta do POST é mínima e não ecoa nenhum dado enviado.
    """
    config = ConfiguracaoMemorial.atual()
    if request.method == "GET":
        return Response(montar_config_checkin(config))

    entrada = CheckinSerializer(data=request.data, config=config)
    if not entrada.is_valid():
        erros = {campo: str(msgs[0]) for campo, msgs in entrada.errors.items()}
        return Response({"erros": erros}, status=status.HTTP_400_BAD_REQUEST)

    # Robôs preenchem o campo isca, que é invisível para pessoas: finge que deu certo.
    if entrada.validated_data["site"].strip():
        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    imagens = request.FILES.getlist("fotos")
    if len(imagens) > MAX_FOTOS_CHECKIN:
        return Response({"erros": {"fotos": "Envie no máximo 3 fotos."}}, status=status.HTTP_400_BAD_REQUEST)
    try:
        for imagem in imagens:
            validar_imagem_enviada(imagem)
    except ImagemInvalida as exc:
        return Response({"erros": {"fotos": str(exc)}}, status=status.HTTP_400_BAD_REQUEST)

    registrar_checkin(entrada.validated_data, imagens, config)
    return Response({"ok": True}, status=status.HTTP_201_CREATED)
