from abc import ABC, abstractmethod
from dataclasses import dataclass
import datetime
from typing import Optional
import uuid


@dataclass
class OutboxEntry:
    id: int
    event_type: str
    conversation_id: uuid.UUID
    message_id: int
    recipient_id: uuid.UUID
    payload: dict
    attempts: int


class NotificationOutbox(ABC):
    """Notifications à publier, écrites dans la même transaction que le message (pattern outbox).

    Statuts : pending (à publier), sent (publiée), skipped (devenue inutile).
    """

    @abstractmethod
    def schedule(
        self,
        event_type: str,
        conversation_id: uuid.UUID,
        message_id: int,
        recipient_id: uuid.UUID,
        payload: dict,
        available_at: datetime.datetime,
    ) -> None:
        pass

    @abstractmethod
    def claim_next_due(self, now: datetime.datetime) -> Optional[OutboxEntry]:
        """Verrouille la prochaine ligne pending échue, en ignorant celles déjà verrouillées
        par un autre relais (skip locked). À appeler dans une transaction."""
        pass

    @abstractmethod
    def mark_sent(self, entry_id: int, now: datetime.datetime) -> None:
        pass

    @abstractmethod
    def mark_skipped(self, entry_id: int, now: datetime.datetime, reason: str) -> None:
        pass

    @abstractmethod
    def postpone(self, entry_id: int, available_at: datetime.datetime) -> None:
        """Report sans échec (plafond atteint) : le compteur de tentatives ne bouge pas."""
        pass

    @abstractmethod
    def record_failure(self, entry_id: int, available_at: datetime.datetime, error: str) -> int:
        """Incrémente les tentatives, garde l'erreur, reporte la ligne. Renvoie le nouveau nombre de tentatives."""
        pass

    @abstractmethod
    def sent_since(self, recipient_id: uuid.UUID, since: datetime.datetime) -> list:
        """Dates d'envoi (croissantes) des notifications déjà publiées pour ce destinataire depuis `since`."""
        pass

    @abstractmethod
    def purge_processed_before(self, before: datetime.datetime) -> int:
        """Supprime les lignes sent/skipped traitées avant `before`. Renvoie le nombre supprimé."""
        pass
