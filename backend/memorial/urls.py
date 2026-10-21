from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("periodos", views.PeriodoViewSet, basename="periodo")
router.register("videos", views.VideoViewSet, basename="video")

urlpatterns = [
    path("totem/", views.totem, name="totem"),
    path("totem/versao/", views.versao, name="totem-versao"),
    path("", include(router.urls)),
]
