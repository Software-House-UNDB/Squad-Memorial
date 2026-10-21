from rest_framework import serializers

from .models import ConfiguracaoTotem, Foto, Periodo, Video


class UrlAbsoluta(serializers.Field):
    """Converte um FileField em URL absoluta (ou null se vazio)."""

    def __init__(self, **kwargs):
        kwargs["read_only"] = True
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        return getattr(instance, self.source or self.field_name)

    def to_representation(self, campo):
        if not campo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(campo.url) if request else campo.url


class FotoSerializer(serializers.ModelSerializer):
    url = UrlAbsoluta(source="exibicao")
    miniatura = UrlAbsoluta()

    class Meta:
        model = Foto
        fields = ["id", "url", "miniatura", "largura", "altura", "legenda", "credito", "destaque"]


class PeriodoSerializer(serializers.ModelSerializer):
    resumo_galeria = serializers.SerializerMethodField()

    class Meta:
        model = Periodo
        fields = ["id", "ano", "titulo", "descricao", "resumo_galeria", "icone"]

    def get_resumo_galeria(self, obj):
        return obj.resumo_galeria or obj.descricao


class PeriodoComFotosSerializer(PeriodoSerializer):
    fotos = serializers.SerializerMethodField()

    class Meta(PeriodoSerializer.Meta):
        fields = PeriodoSerializer.Meta.fields + ["fotos"]

    def get_fotos(self, obj):
        # usa o prefetch filtrado (fotos_publicadas) feito na view
        fotos = getattr(obj, "fotos_publicadas", None)
        if fotos is None:
            fotos = obj.fotos.filter(publicado=True)
        return FotoSerializer(fotos, many=True, context=self.context).data


class VideoSerializer(serializers.ModelSerializer):
    url = UrlAbsoluta(source="arquivo")
    capa = UrlAbsoluta()
    ano = serializers.IntegerField(read_only=True)
    categoria_nome = serializers.CharField(source="get_categoria_display", read_only=True)

    class Meta:
        model = Video
        fields = [
            "id", "titulo", "descricao", "categoria", "categoria_nome",
            "ano", "periodo", "url", "capa", "duracao_segundos",
        ]


class ConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoTotem
        fields = ["titulo", "subtitulo", "segundos_inatividade", "segundos_atualizacao", "descanso_ativo"]
