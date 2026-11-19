from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from memorial import administracao, gestao

admin.site.site_header = "Memorial Dom Bosco"
admin.site.site_title = "Memorial Dom Bosco"
admin.site.index_title = "Salas, ex-alunos e configuração dos totens"

# dbosco.com.br é dividido com o site atual da escola: o memorial só ocupa /administracao/ e o que está
# sob /memorial/ (admin, api, static e media). O resto do domínio o nginx repassa ao site atual.
urlpatterns = [
    path("memorial/admin/", admin.site.urls),
    path("administracao/", administracao.aprovacoes, name="administracao"),
    path("administracao/fotos/", administracao.decidir_fotos, name="administracao_fotos"),
    path("administracao/cadastros/", administracao.decidir_cadastros, name="administracao_cadastros"),
    path("administracao/email-teste/", administracao.email_teste, name="administracao_email_teste"),
    path("administracao/pendencias.json", administracao.pendencias, name="administracao_pendencias"),
    path("administracao/registro/", administracao.registro, name="administracao_registro"),
    path("administracao/exportar.csv", administracao.exportar, name="administracao_exportar"),
    path("administracao/gerir/<slug:secao>/", gestao.lista, name="gestao_lista"),
    path("administracao/gerir/<slug:secao>/novo/", gestao.editar, name="gestao_novo"),
    path("administracao/gerir/<slug:secao>/apagar/", gestao.apagar, name="gestao_apagar"),
    path("administracao/gerir/<slug:secao>/<int:pk>/", gestao.editar, name="gestao_editar"),
    path("memorial/api/", include("memorial.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
