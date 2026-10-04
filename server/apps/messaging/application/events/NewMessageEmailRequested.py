# Contrat de l'événement consommé par le module notifications.
# Il est autosuffisant : notifications n'a jamais besoin de relire les données de messaging.
from dataclasses import dataclass

from apps.messaging.application.events.DomainEvent import DomainEvent


@dataclass
class NewMessageEmailRequested(DomainEvent):
    outbox_id: int            # identifiant de déduplication (livraison au moins une fois)
    conversation_id: str
    recipient_email: str
    recipient_first_name: str
    sender_first_name: str
    hebergement_name: str
    message_preview: str      # extrait uniquement, jamais le corps complet

    EVENT_NAME = 'messaging.new_message_email_requested'
