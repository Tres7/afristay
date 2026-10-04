from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.messaging'
    # 'messages' est déjà pris par django.contrib.messages
    label = 'messaging'
