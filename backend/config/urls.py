from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Memorial UNDB"
admin.site.site_title = "Memorial UNDB"
admin.site.index_title = "Gestão do conteúdo do totem"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("memorial.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
