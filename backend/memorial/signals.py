"""Limpeza de arquivos e processamento de vídeo.

Apagar um registro (no admin ou em lote) remove do disco todas as versões do arquivo. Isso vale
também para o pedido de remoção de um ex-aluno (LGPD): o perfil, a foto e as fotos enviadas somem.
"""

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .media import capturar_quadro, ler_metadados_video
from .models import Aluno, Foto, FotoAluno, Video


def _apagar(*campos):
    for campo in campos:
        if campo and campo.name:
            campo.storage.delete(campo.name)


def _anterior(sender, instance):
    return sender.objects.filter(pk=instance.pk).first() if instance.pk else None


# ---------------------------------------------------------------- fotos das salas

@receiver(pre_save, sender=Foto)
def foto_limpar_antigas(sender, instance, **kwargs):
    """Ao trocar a imagem de uma foto, remove do disco as versões antigas."""
    antiga = _anterior(sender, instance)
    if antiga and antiga.imagem.name != instance.imagem.name:
        _apagar(antiga.imagem, antiga.exibicao, antiga.miniatura)


@receiver(post_delete, sender=Foto)
def foto_apagar_arquivos(sender, instance, **kwargs):
    _apagar(instance.imagem, instance.exibicao, instance.miniatura)


# ---------------------------------------------------------------- vídeos

@receiver(pre_save, sender=Video)
def video_marcar_troca(sender, instance, **kwargs):
    instance._arquivo_mudou = True
    antigo = _anterior(sender, instance)
    if antigo:
        instance._arquivo_mudou = antigo.arquivo.name != instance.arquivo.name
        if instance._arquivo_mudou:
            _apagar(antigo.arquivo)
        if antigo.capa.name and antigo.capa.name != instance.capa.name:
            _apagar(antigo.capa)
        if antigo.legenda.name and antigo.legenda.name != instance.legenda.name:
            _apagar(antigo.legenda)


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
    _apagar(instance.arquivo, instance.capa, instance.legenda)


# ---------------------------------------------------------------- ex-alunos

@receiver(pre_save, sender=Aluno)
def aluno_limpar_foto_antiga(sender, instance, **kwargs):
    antigo = _anterior(sender, instance)
    if antigo and antigo.foto.name and antigo.foto.name != instance.foto.name:
        _apagar(antigo.foto)


@receiver(post_delete, sender=Aluno)
def aluno_apagar_foto(sender, instance, **kwargs):
    _apagar(instance.foto)


@receiver(post_delete, sender=FotoAluno)
def foto_aluno_apagar_arquivos(sender, instance, **kwargs):
    _apagar(instance.imagem, instance.miniatura)
