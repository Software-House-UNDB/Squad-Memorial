from django.apps import AppConfig


class MemorialConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "memorial"
    verbose_name = "Memorial"

    def ready(self):
        from . import signals  # noqa: F401
