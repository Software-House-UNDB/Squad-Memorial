"""Limpeza de arquivos e processamento de vídeo.

Apagar um registro (no admin ou em lote) remove do disco todas as versões do arquivo. Isso vale
também para o pedido de remoção de um ex-aluno (LGPD): o perfil, a foto e as fotos enviadas somem.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from .media import capturar_quadro, ler_metadados_video
from .models import (
    Acontecimento, Aluno, Apresentacao, ConfiguracaoMemorial, Decada, Foto, FotoAluno, Registro, Sala, Video,
)
from .registro import SISTEMA, desligado, registrar, texto_de_busca


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


# ---------------------------------------------------------------- fotos de época

def _epoca_limpar_antiga(sender, instance, **kwargs):
    antiga = _anterior(sender, instance)
    if antiga and antiga.foto.name and antiga.foto.name != instance.foto.name:
        _apagar(antiga.foto)


def _epoca_apagar(sender, instance, **kwargs):
    _apagar(instance.foto)


for _modelo in (Apresentacao, Decada):
    pre_save.connect(_epoca_limpar_antiga, sender=_modelo)
    post_delete.connect(_epoca_apagar, sender=_modelo)


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


# ---------------------------------------------------------------- entradas e saídas

def _rotulo(instance):
    return str(instance._meta.verbose_name).capitalize()


def _cadastro_salvo(sender, instance, created, raw=False, update_fields=None, **kwargs):
    # O login grava last_login no usuário: isso já vira um registro de login, não de cadastro.
    if raw or desligado() or (update_fields and set(update_fields) == {"last_login"}):
        return
    tipo = Registro.Tipo.CADASTRO_CRIADO if created else Registro.Tipo.CADASTRO_ALTERADO
    registrar(tipo, f"{_rotulo(instance)}: {instance}")


def _cadastro_removido(sender, instance, **kwargs):
    registrar(Registro.Tipo.CADASTRO_REMOVIDO, f"{_rotulo(instance)}: {instance}")


for _modelo in (Sala, Apresentacao, Decada, Acontecimento, Foto, Video, ConfiguracaoMemorial, get_user_model()):
    post_save.connect(_cadastro_salvo, sender=_modelo, dispatch_uid=f"registro_salvo_{_modelo.__name__}")
    post_delete.connect(_cadastro_removido, sender=_modelo, dispatch_uid=f"registro_removido_{_modelo.__name__}")


@receiver(post_save, sender=Aluno)
def aluno_registrar(sender, instance, created, raw=False, **kwargs):
    if raw or desligado():
        return
    tipo = Registro.Tipo.CADASTRO_CRIADO if created else Registro.Tipo.CADASTRO_ALTERADO
    registrar(tipo, f"Ex-aluno: {instance}", aluno_ref=instance.pk)


@receiver(post_save, sender=FotoAluno)
def foto_aluno_registrar(sender, instance, created, raw=False, **kwargs):
    if raw or desligado():
        return
    registrar(
        Registro.Tipo.CADASTRO_CRIADO if created else Registro.Tipo.CADASTRO_ALTERADO,
        f"Foto de ex-aluno ({instance.get_status_display().lower()}): {instance.aluno.nome}", aluno_ref=instance.aluno_id,
    )


@receiver(post_delete, sender=FotoAluno)
def foto_aluno_registrar_remocao(sender, instance, **kwargs):
    registrar(
        Registro.Tipo.CADASTRO_REMOVIDO, f"Foto de ex-aluno nº {instance.aluno_id} removida",
        aluno_ref=instance.aluno_id,
    )


@receiver(post_delete, sender=Aluno)
def aluno_apagar_dos_registros(sender, instance, **kwargs):
    """Pedido de remoção (LGPD): o nome sai dos registros antigos; fica só que o fato aconteceu."""
    texto = f"Ex-aluno nº {instance.pk} (dados pessoais removidos)"
    for registro in Registro.objects.filter(aluno_ref=instance.pk).only("pk", "autor"):
        Registro.objects.filter(pk=registro.pk).update(descricao=texto, busca=texto_de_busca(texto, registro.autor))
    registrar(Registro.Tipo.ALUNO_REMOVIDO, f"Ex-aluno nº {instance.pk} removido", aluno_ref=instance.pk)


@receiver(user_logged_in)
def login_registrar(sender, request, user, **kwargs):
    registrar(Registro.Tipo.LOGIN, f"{user.get_username()} entrou", autor=user.get_username())


@receiver(user_logged_out)
def logout_registrar(sender, request, user, **kwargs):
    if user is not None:
        registrar(Registro.Tipo.LOGOUT, f"{user.get_username()} saiu", autor=user.get_username())


@receiver(user_login_failed)
def login_recusado_registrar(sender, credentials, **kwargs):
    usuario = (credentials.get("username") or "")[:60]
    registrar(Registro.Tipo.LOGIN_RECUSADO, f"Tentativa de login recusada: {usuario}", autor=SISTEMA)
