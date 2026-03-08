import json
import pika
from apps.users.application.ports.EventBus import EventBus
from apps.users.application.events.DomainEvent import DomainEvent
import os

class RabbitMQEventBus(EventBus):

    EXCHANGE = 'domain_events'
    ROUTING_KEY = 'users.email_verification_requested'

    def __init__(self, host: str = 'rabbitmq'):
        self._host = host

    def publish(self, event: DomainEvent) -> None:
        credentials = pika.PlainCredentials(
            username=os.environ.get('RABBITMQ_USER', 'guest'),
            password=os.environ.get('RABBITMQ_PASS', 'guest'),
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

        channel.basic_publish(
            exchange=self.EXCHANGE,
            routing_key=self.ROUTING_KEY,
            body=json.dumps(event.__dict__),
            properties=pika.BasicProperties(delivery_mode=2),
        )

        connection.close()
