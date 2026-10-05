from django.apps import AppConfig


class AvisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.avis'
    label = 'avis'

    def ready(self):
        from . import signals  # noqa: F401
