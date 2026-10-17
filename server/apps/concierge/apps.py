from django.apps import AppConfig


class ConciergeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.concierge'
    label = 'concierge'
    verbose_name = 'AI Concierge'
