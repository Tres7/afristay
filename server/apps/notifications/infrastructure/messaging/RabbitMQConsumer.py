import json
import logging
import os

import pika
from pika.exceptions import ChannelClosedByBroker

from apps.notifications.application.service.NotificationService import NotificationService
from apps.notifications.infrastructure.email.DjangoEmailSender import DjangoEmailSender

logger = logging.getLogger(__name__)


class RabbitMQConsumer:

    EXCHANGE = 'domain_events'
    QUEUE = 'notifications.events'
    # DLX partagé (direct) : chaque file y publie avec sa propre routing key,
    # ce qui permet à d'autres modules de réutiliser le même exchange.
    DEAD_LETTER_EXCHANGE = 'domain_events.dlx'
    DEAD_LETTER_QUEUE = 'notifications.events.dlq'
    ROUTING_KEYS = {
        "users.email_verification_requested": "handle_verification_email",
        "users.welcome_email_requested": "handle_welcome_email",
    }

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

        channel.exchange_declare(
            exchange=self.DEAD_LETTER_EXCHANGE,
            exchange_type='direct',
            durable=True,
        )
        channel.queue_declare(queue=self.DEAD_LETTER_QUEUE, durable=True)
        channel.queue_bind(
            queue=self.DEAD_LETTER_QUEUE,
            exchange=self.DEAD_LETTER_EXCHANGE,
            routing_key=self.QUEUE,
        )

        try:
            channel.queue_declare(
                queue=self.QUEUE,
                durable=True,
                arguments={
                    'x-dead-letter-exchange': self.DEAD_LETTER_EXCHANGE,
                    'x-dead-letter-routing-key': self.QUEUE,
                },
            )
        except ChannelClosedByBroker as e:
            if e.reply_code == 406:
                raise RuntimeError(
                    f"La file '{self.QUEUE}' existe déjà sans dead-letter exchange. "
                    f"Migration unique (vérifier qu'elle est vide) : "
                    f"docker compose exec rabbitmq rabbitmqctl delete_queue {self.QUEUE}"
                ) from e
            raise

        for routing_key in self.ROUTING_KEYS:
            channel.queue_bind(
                queue=self.QUEUE,
                exchange=self.EXCHANGE,
                routing_key=routing_key,
            )

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=self.QUEUE, on_message_callback=self._handle)

        logger.info("Consumer démarré. En attente de messages...")
        channel.start_consuming()

    def _handle(self, ch, method, properties, body) -> None:
        routing_key = method.routing_key
        try:
            data = json.loads(body)
            handler_name = self.ROUTING_KEYS.get(routing_key)
            if handler_name is None:
                raise ValueError(f"Routing key non gérée : {routing_key}")
            getattr(self, handler_name)(data)
        except Exception:
            # Le message part en dead-letter (notifications.events.dlq) au lieu d'être perdu
            logger.exception("Échec du traitement de '%s', message envoyé en dead-letter", routing_key)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            return

        ch.basic_ack(delivery_tag=method.delivery_tag)

    def handle_verification_email(self, data: dict) -> None:
        self._service.send_verification_email(
            to=data["email"],
            first_name=data["first_name"],
            code=data["code"],
        )
        logger.info("Email de vérification envoyé (user_id=%s)", data.get("user_id"))

    def handle_welcome_email(self, data: dict) -> None:
        self._service.send_welcome_email(
            to=data["email"],
            first_name=data["first_name"],
        )
        logger.info("Email de bienvenue envoyé (user_id=%s)", data.get("user_id"))
