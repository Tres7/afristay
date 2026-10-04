from dataclasses import dataclass, field
import datetime
from typing import Optional
import uuid

from apps.messaging.domain.exceptions import InvalidMessageException


@dataclass
class Message:
    """Message d'une conversation.

    L'id est un entier séquentiel attribué par la persistance (et non un UUID) :
    il sert de curseur monotone pour les lectures et le polling.
    """
    MAX_LENGTH = 2000
    PREVIEW_LENGTH = 120

    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    id: Optional[int] = None
    created_at: datetime.datetime = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc)
    )

    @staticmethod
    def compose(conversation_id: uuid.UUID, sender_id: uuid.UUID, raw_content: str) -> 'Message':
        content = (raw_content or '').strip()
        if not content:
            raise InvalidMessageException("Le message ne peut pas être vide.")
        if len(content) > Message.MAX_LENGTH:
            raise InvalidMessageException(
                f"Le message ne peut pas dépasser {Message.MAX_LENGTH} caractères."
            )
        return Message(conversation_id=conversation_id, sender_id=sender_id, content=content)

    def preview(self) -> str:
        """Extrait court pour les notifications : jamais le corps complet."""
        if len(self.content) <= self.PREVIEW_LENGTH:
            return self.content
        return self.content[: self.PREVIEW_LENGTH - 1].rstrip() + '…'
