from django.urls import path

from . import views

urlpatterns = [
    path("totem/", views.totem, name="totem"),
    path("totem/versao/", views.versao, name="totem-versao"),
]