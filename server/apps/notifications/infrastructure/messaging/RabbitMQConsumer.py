import json
import pika
import os
from apps.notifications.application.service.NotificationService import NotificationService
from apps.notifications.infrastructure.email.DjangoEmailSender import DjangoEmailSender


class RabbitMQConsumer:

    EXCHANGE = 'domain_events'
    QUEUE = 'notifications.email_verification'
    ROUTING_KEY = 'users.email_verification_requested'

    def __init__(self, host: str = 'rabbitmq'):
        self._host = host
        self._service = NotificationService(DjangoEmailSender())

    def start(self) -> None:
        credentials = pika.PlainCredentials(
            username=os.environ.get('RABBITMQ_DEFAULT_USER', 'guest'),
            password=os.environ.get('RABBITMQ_DEFAULT_PASS', 'guest'),
        )
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=self._host, credentials=credentials)
        )
        channel = connection.channel()

        channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type='direct',
            durable=True,
        )
        channel.queue_declare(queue=self.QUEUE, durable=True)
        channel.queue_bind(
            queue=self.QUEUE,
            exchange=self.EXCHANGE,
            routing_key=self.ROUTING_KEY,
        )

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=self.QUEUE, on_message_callback=self._handle)

        print('[*] Consumer démarré. En attente de messages...')
        channel.start_consuming()

    def _handle(self, ch, method, properties, body) -> None:
        data = json.loads(body)
        try:
            self._service.send_verification_email(
                to=data['email'],
                first_name=data['first_name'],
                code=data['code'],
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)
            print(f"[✓] Email envoyé à {data['email']}")
        except Exception as e:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            print(f"[✗] Erreur envoi email : {e}")