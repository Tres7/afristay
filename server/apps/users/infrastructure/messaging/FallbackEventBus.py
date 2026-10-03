import logging

from apps.users.application.ports.EventPublisher import EventPublisher
from apps.users.application.events.DomainEvent import DomainEvent
from apps.users.infrastructure.messaging.RabbitMQEventBus import RabbitMQEventBus
from apps.notifications.application.service.NotificationService import NotificationService
from apps.notifications.infrastructure.email.DjangoEmailSender import DjangoEmailSender

logger = logging.getLogger(__name__)


class FallbackEventBus(EventPublisher):
    """Publie sur RabbitMQ ; si le broker est indisponible, traite l'événement
    directement pour que les emails (code de vérification, bienvenue) partent quand même."""

    def __init__(self, primary: EventPublisher | None = None):
        self._primary = primary or RabbitMQEventBus()
        self._notifications = NotificationService(DjangoEmailSender())

    def publish(self, event: DomainEvent) -> None:
        try:
            self._primary.publish(event)
            return
        except Exception as e:
            logger.warning("RabbitMQ indisponible (%s) — traitement direct de %s", e, event.event)

        data = event.__dict__
        try:
            if event.event == 'users.email_verification_requested':
                self._notifications.send_verification_email(data['email'], data['first_name'], data['code'])
            elif event.event == 'users.password_reset_requested':
                self._notifications.send_password_reset_email(data['email'], data['first_name'], data['code'])
            elif event.event == 'users.welcome_email_requested':
                self._notifications.send_welcome_email(data['email'], data['first_name'])
        except Exception as e:
            # En dev sans SMTP : le code reste visible dans les logs du backend
            logger.warning("Email non envoyé pour %s (%s). Données : %s", data.get('email'), e, data)
