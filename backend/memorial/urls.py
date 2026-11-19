from django.urls import path

from . import views

urlpatterns = [
    path("sala/<int:numero>/", views.sala, name="sala"),
    path("versao/", views.versao, name="versao"),
    path("alunos/", views.alunos, name="alunos"),
    path("alunos/<int:pk>/", views.aluno, name="aluno"),
    path("checkin/", views.checkin, name="checkin"),
]
