"""As áreas de cadastro do painel (/administracao/gerir/): uma para cada modelo do admin do Django."""

from dataclasses import dataclass

from django.contrib import admin

from .models import Apresentacao, Aluno, ConfiguracaoMemorial, Decada, Foto, FotoAluno, Sala, Video


@dataclass(frozen=True)
class Secao:
    slug: str
    modelo: type
    rotulo: str
    singular: str
    grupo: str
    icone: str
    imagem: str = ""  # campo mostrado como foto do cartão
    layout: str = "grade"  # grade (cartões) ou tabela

    @property
    def admin(self):
        return admin.site._registry[self.modelo]


SECOES = [
    Secao("salas", Sala, "Salas", "sala", "Salas do tour", "home"),
    Secao("apresentacoes", Apresentacao, "Apresentações", "apresentação", "Salas do tour", "book", "foto", "tabela"),
    Secao("decadas", Decada, "Décadas", "década", "Salas do tour", "clock", "foto", "tabela"),
    Secao("fotos", Foto, "Fotos", "foto", "Salas do tour", "image", "miniatura"),
    Secao("videos", Video, "Vídeos", "vídeo", "Salas do tour", "video", "capa"),
    Secao("alunos", Aluno, "Ex-alunos", "ex-aluno", "Pessoas", "users", "foto", "tabela"),
    Secao("fotos-alunos", FotoAluno, "Fotos de ex-alunos", "foto de ex-aluno", "Pessoas", "cap", "miniatura"),
    Secao("configuracao", ConfiguracaoMemorial, "Configuração", "configuração", "Sistema", "qr"),
]
POR_SLUG = {s.slug: s for s in SECOES}


def menu(request):
    """Só o que este usuário pode ver, agrupado na ordem da barra lateral."""
    grupos = {}
    for secao in SECOES:
        if secao.admin.has_view_or_change_permission(request):
            grupos.setdefault(secao.grupo, []).append(secao)
    return grupos
