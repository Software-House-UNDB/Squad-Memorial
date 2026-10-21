import hashlib

from django.db.models import Count, Max, Prefetch
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ConfiguracaoTotem, Foto, Periodo, Video
from .serializers import (
    ConfiguracaoSerializer,
    PeriodoComFotosSerializer,
    PeriodoSerializer,
    VideoSerializer,
)


def _periodos_com_fotos():
    fotos = Foto.objects.filter(publicado=True)
    return Periodo.objects.filter(publicado=True).prefetch_related(
        Prefetch("fotos", queryset=fotos, to_attr="fotos_publicadas")
    )


def _videos():
    return Video.objects.filter(publicado=True).select_related("periodo")


def calcular_versao():
    """Hash que muda sempre que qualquer conteúdo muda (inclusive exclusões).

    O totem consulta /api/totem/versao/ periodicamente e só baixa tudo de novo
    quando o valor for diferente do que tem em cache.
    """
    partes = []
    for modelo in (Periodo, Foto, Video, ConfiguracaoTotem):
        agg = modelo.objects.aggregate(n=Count("id"), m=Max("atualizado_em"))
        partes.append(f"{modelo.__name__}:{agg['n']}:{agg['m']}")
    return hashlib.sha1("|".join(partes).encode()).hexdigest()[:16]


@api_view(["GET"])
def versao(request):
    return Response({"versao": calcular_versao()})


@api_view(["GET"])
def totem(request):
    """Tudo que o totem precisa em uma única chamada (fácil de guardar em cache offline)."""
    ctx = {"request": request}
    periodos = list(_periodos_com_fotos())
    return Response({
        "versao": calcular_versao(),
        "config": ConfiguracaoSerializer(ConfiguracaoTotem.atual()).data,
        "periodos": PeriodoComFotosSerializer(periodos, many=True, context=ctx).data,
        "videos": VideoSerializer(_videos(), many=True, context=ctx).data,
        "categorias_video": [
            {"valor": valor, "nome": nome} for valor, nome in Video.Categoria.choices
        ],
    })


class PeriodoViewSet(viewsets.ReadOnlyModelViewSet):
    """/api/periodos/ — linha do tempo. ?fotos=1 inclui as fotos de cada período."""

    def get_queryset(self):
        return _periodos_com_fotos()

    def get_serializer_class(self):
        if self.action == "retrieve" or self.request.query_params.get("fotos") == "1":
            return PeriodoComFotosSerializer
        return PeriodoSerializer


class VideoViewSet(viewsets.ReadOnlyModelViewSet):
    """/api/videos/ — filtros: ?categoria=entrevista|evento|institucional  ?ano=2007"""

    serializer_class = VideoSerializer

    def get_queryset(self):
        qs = _videos()
        categoria = self.request.query_params.get("categoria")
        ano = self.request.query_params.get("ano")
        if categoria:
            qs = qs.filter(categoria=categoria)
        if ano and ano.isdigit():
            qs = qs.filter(periodo__ano=int(ano))
        return qs
