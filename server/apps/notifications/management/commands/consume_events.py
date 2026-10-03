from django.core.management.base import BaseCommand
from apps.notifications.infrastructure.messaging.RabbitMQConsumer import RabbitMQConsumer


class Command(BaseCommand):
    help = 'Lance le consumer RabbitMQ pour les notifications'

    def handle(self, *args, **options):
        consumer = RabbitMQConsumer()
        consumer.start()