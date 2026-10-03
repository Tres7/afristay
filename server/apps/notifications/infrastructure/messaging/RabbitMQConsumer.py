import json
import pika
import os
from apps.notifications.application.service.NotificationService import NotificationService
from apps.notifications.infrastructure.email.DjangoEmailSender import DjangoEmailSender


class RabbitMQConsumer:

    EXCHANGE = 'domain_events'
    QUEUE = 'notifications.events'
    ROUTING_KEYS = {
        "users.email_verification_requested": "handle_verification_email",
        "users.welcome_email_requested": "handle_welcome_email",
        "users.password_reset_requested": "handle_password_reset_email",
    }

    def __init__(self, host: str | None = None):
        self._host = host or os.environ.get('RABBITMQ_HOST', 'rabbitmq')
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

        queue_name = "notifications.events"
        channel.queue_declare(queue=self.QUEUE, durable=True)

        for routing_key in self.ROUTING_KEYS:
            channel.queue_bind(
                queue=queue_name,
                exchange=self.EXCHANGE,
                routing_key=routing_key,
            )

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=self.QUEUE, on_message_callback=self._handle)

        print('[*] Consumer démarré. En attente de messages...')
        channel.start_consuming()

    def _handle(self, ch, method, properties, body) -> None:
        data = json.loads(body)
        handler_name = self.ROUTING_KEYS.get(method.routing_key)

        if not handler_name:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            print(f"[✗] Routing key non gérée : {method.routing_key}")
            return
        
        handler = getattr(self, handler_name)

        try:
            handler(data)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            print(f"[✗] Erreur traitement {method.routing_key} : {e}")
        
    def handle_verification_email(self, data: dict) -> None:
        self._service.send_verification_email(
            to=data["email"],
            first_name=data["first_name"],
            code=data["code"],
    )
        print(f"[✓] Email de vérification envoyé à {data['email']}")

    def handle_welcome_email(self, data: dict) -> None:
        self._service.send_welcome_email(
            to=data["email"],
            first_name=data["first_name"],
        )
        print(f"[✓] Email de bienvenue envoyé à {data['email']}")

    def handle_password_reset_email(self, data: dict) -> None:
        self._service.send_password_reset_email(
            to=data["email"],
            first_name=data["first_name"],
            code=data["code"],
        )
        print(f"[✓] Email de réinitialisation envoyé à {data['email']}")
