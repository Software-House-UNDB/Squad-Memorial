from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .media import capturar_quadro, ler_metadados_video
from .models import Foto, PaginaDocumento, Video


def _apagar(*campos):
    for campo in campos:
        if campo and campo.name:
            campo.storage.delete(campo.name)


@receiver(pre_save, sender=Foto)
def foto_limpar_antigas(sender, instance, **kwargs):
    """Ao trocar a imagem de uma foto, remove do disco as versões antigas."""
    if not instance.pk:
        return
    antiga = Foto.objects.filter(pk=instance.pk).first()
    if antiga and antiga.imagem.name != instance.imagem.name:
        _apagar(antiga.imagem, antiga.exibicao, antiga.miniatura)


@receiver(post_delete, sender=Foto)
def foto_apagar_arquivos(sender, instance, **kwargs):
    _apagar(instance.imagem, instance.exibicao, instance.miniatura)


@receiver(pre_save, sender=Video)
def video_marcar_troca(sender, instance, **kwargs):
    instance._arquivo_mudou = True
    if instance.pk:
        antigo = Video.objects.filter(pk=instance.pk).first()
        if antigo:
            instance._arquivo_mudou = antigo.arquivo.name != instance.arquivo.name
            if instance._arquivo_mudou:
                _apagar(antigo.arquivo)
            if antigo.capa.name and antigo.capa.name != instance.capa.name:
                _apagar(antigo.capa)


@receiver(post_save, sender=Video)
def video_processar(sender, instance, **kwargs):
    """Lê duração/codec e gera capa automática depois que o arquivo está no disco."""
    if not getattr(instance, "_arquivo_mudou", False) or not instance.arquivo:
        return
    caminho = instance.arquivo.path
    duracao, codec = ler_metadados_video(caminho)
    campos = {"duracao_segundos": duracao, "codec": codec}

    if not instance.capa:
        segundo = min(1.0, (duracao or 2) / 2)
        quadro = capturar_quadro(caminho, segundo)
        if quadro:
            instance.capa.save(quadro.name, quadro, save=False)
            campos["capa"] = instance.capa.name

    # update() evita disparar o signal de novo
    Video.objects.filter(pk=instance.pk).update(**campos)
    for k, v in campos.items():
        setattr(instance, k, v if k != "capa" else instance.capa)
    instance._arquivo_mudou = False


@receiver(post_delete, sender=Video)
def video_apagar_arquivos(sender, instance, **kwargs):
    _apagar(instance.arquivo, instance.capa)


@receiver(pre_save, sender=PaginaDocumento)
def pagina_limpar_antiga(sender, instance, **kwargs):
    if not instance.pk:
        return
    antiga = PaginaDocumento.objects.filter(pk=instance.pk).first()
    if antiga and antiga.arquivo.name != instance.arquivo.name:
        _apagar(antiga.arquivo)


@receiver(post_delete, sender=PaginaDocumento)
def pagina_apagar_arquivo(sender, instance, **kwargs):
    _apagar(instance.arquivo)