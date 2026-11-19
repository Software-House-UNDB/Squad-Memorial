from django.urls import path

from . import views

urlpatterns = [
    path("memorial/sala/<int:numero>/", views.sala, name="sala"),
    path("memorial/versao/", views.versao, name="versao"),
    path("memorial/alunos/", views.alunos, name="alunos"),
    path("memorial/alunos/<int:pk>/", views.aluno, name="aluno"),
    path("memorial/checkin/", views.checkin, name="checkin"),
]
