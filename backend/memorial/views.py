import hashlib

from django.db.models import Count, Max
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    ConfiguracaoTotem, Depoimento, Documento, Foto, Marco, PaginaDocumento, Periodo, Pessoa, Video,
)
from .serializers import montar_acervo, montar_config

MODELOS = (Periodo, Marco, Foto, Video, Documento, PaginaDocumento, Pessoa, Depoimento, ConfiguracaoTotem)


def calcular_versao():
    """Hash que muda sempre que qualquer conteúdo muda (inclusive exclusões).

    O totem consulta /api/totem/versao/ periodicamente e só baixa tudo de novo
    quando o valor for diferente do que tem em cache.
    """
    partes = []
    for modelo in MODELOS:
        agg = modelo.objects.aggregate(n=Count("id"), m=Max("atualizado_em"))
        partes.append(f"{modelo.__name__}:{agg['n']}:{agg['m']}")
    return hashlib.sha1("|".join(partes).encode()).hexdigest()[:16]


@api_view(["GET"])
def versao(request):
    return Response({"versao": calcular_versao()})


@api_view(["GET"])
def totem(request):
    """Tudo o que o totem precisa em uma única chamada (guardada em cache para funcionar offline)."""
    return Response({
        "versao": calcular_versao(),
        "config": montar_config(),
        "acervo": montar_acervo(request),
    })