import json
import pika
from apps.users.application.ports.EventPublisher import EventPublisher
from apps.users.application.events.DomainEvent import DomainEvent
import os

class RabbitMQEventBus(EventPublisher):

    EXCHANGE = 'domain_events'
    # ROUTING_KEY = 'users.email_verification_requested'

    def __init__(self, host: str | None = None):
        self._host = host or os.environ.get('RABBITMQ_HOST', 'rabbitmq')

    def publish(self, event: DomainEvent) -> None:
        credentials = pika.PlainCredentials(
            username=os.environ.get('RABBITMQ_DEFAULT_USER', 'guest'),
            password=os.environ.get('RABBITMQ_DEFAULT_PASS', 'guest'),
        )
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(
                host=self._host,
                credentials=credentials,
                connection_attempts=1,
                socket_timeout=3,
                blocked_connection_timeout=3,
            )
        )
        channel = connection.channel()

        channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type='direct',
            durable=True,
        )

        channel.basic_publish(
            exchange=self.EXCHANGE,
            routing_key=event.event,
            body=json.dumps(event.__dict__),
            properties=pika.BasicProperties(delivery_mode=2),
        )

        connection.close()
