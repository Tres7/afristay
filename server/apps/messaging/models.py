# Enregistre les modèles de persistance auprès de Django (même convention que apps/users/models.py).
# Sans cet import, l'ORM ignore ces modèles au démarrage : les suppressions en cascade
# (utilisateur, hébergement) échouent sur les clés étrangères de la messagerie.
from apps.messaging.infrastructure.persistence.models import (
    ConversationModel,
    MessageModel,
    NotificationOutboxModel,
)

__all__ = ["ConversationModel", "MessageModel", "NotificationOutboxModel"]
