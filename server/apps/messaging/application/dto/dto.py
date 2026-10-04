from dataclasses import dataclass
import datetime
from typing import Optional
import uuid

from apps.messaging.domain.entities.Message import Message


@dataclass
class MessageDTO:
    id: int
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime.datetime
    is_own: bool

    @staticmethod
    def from_entity(message: Message, viewer_id: uuid.UUID) -> 'MessageDTO':
        return MessageDTO(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            content=message.content,
            created_at=message.created_at,
            is_own=message.sender_id == viewer_id,
        )


@dataclass
class ParticipantDTO:
    id: uuid.UUID
    first_name: str
    last_name: str
    avatar_url: Optional[str]


@dataclass
class HebergementSummaryDTO:
    id: uuid.UUID
    name: str
    city: str
    image_url: str


@dataclass
class ConversationSummaryDTO:
    id: uuid.UUID
    my_role: str                     # 'guest' ou 'host'
    hebergement: Optional[HebergementSummaryDTO]
    other_participant: Optional[ParticipantDTO]
    last_message: Optional[MessageDTO]
    unread_count: int
    last_message_at: datetime.datetime
