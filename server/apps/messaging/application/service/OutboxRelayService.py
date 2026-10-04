from collections import Counter
import datetime
import logging

from apps.messaging.application.events.NewMessageEmailRequested import NewMessageEmailRequested
from apps.messaging.application.ports.EventPublisher import EventPublisher
from apps.messaging.application.ports.NotificationOutbox import NotificationOutbox, OutboxEntry
from apps.messaging.application.ports.TransactionManager import TransactionManager
from apps.messaging.domain.repositories.ConversationRepository import ConversationRepository

logger = logging.getLogger(__name__)


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class OutboxRelayService:
    """Publie les notifications échues de l'outbox.

    - Une ligne par transaction, verrouillée en skip locked : deux relais ne traitent jamais la même ligne.
    - Livraison au moins une fois : si le relais plante entre la publication et le marquage,
      la ligne sera republiée. L'outbox_id voyage dans l'événement pour permettre la déduplication.
    - Aucun abandon sur échec de publication : la ligne est reportée avec un délai croissant (plafonné).
    """

    WARN_AFTER_ATTEMPTS = 5

    def __init__(
        self,
        outbox: NotificationOutbox,
        conversations: ConversationRepository,
        publisher: EventPublisher,
        tx: TransactionManager,
        hourly_cap: int = 5,
        retention_days: int = 7,
        base_backoff_seconds: int = 10,
        max_backoff_seconds: int = 600,
    ):
        self._outbox = outbox
        self._conversations = conversations
        self._publisher = publisher
        self._tx = tx
        self._hourly_cap = hourly_cap
        self._retention = datetime.timedelta(days=retention_days)
        self._base_backoff = base_backoff_seconds
        self._max_backoff = max_backoff_seconds

    def process_due(self, max_entries: int = 20) -> Counter:
        stats = Counter()
        for _ in range(max_entries):
            with self._tx.atomic():
                now = _now()
                entry = self._outbox.claim_next_due(now)
                if entry is None:
                    break
                result = self._process(entry, now)
            stats[result] += 1
            if result == 'failed':
                # Coupe-circuit : si le broker est indisponible, inutile d'essayer les lignes suivantes
                # (chaque essai peut prendre plusieurs secondes et consommerait une tentative pour rien).
                # Elles restent dues et seront tentées à la passe suivante.
                break
        return stats

    def purge(self) -> int:
        return self._outbox.purge_processed_before(_now() - self._retention)

    def _process(self, entry: OutboxEntry, now: datetime.datetime) -> str:
        conversation = self._conversations.find_by_id(entry.conversation_id)
        if conversation is None:
            self._outbox.mark_skipped(entry.id, now, "conversation introuvable")
            return 'skipped'

        # Revérification par ids : le destinataire a-t-il lu ce message (ou un plus récent) entre-temps ?
        if conversation.last_read_id_for(entry.recipient_id) >= entry.message_id:
            self._outbox.mark_skipped(entry.id, now, "déjà lu par le destinataire")
            return 'skipped'

        # Plafond par destinataire sur une heure glissante : on reporte, on ne perd pas
        sent = self._outbox.sent_since(entry.recipient_id, now - datetime.timedelta(hours=1))
        if len(sent) >= self._hourly_cap:
            # Une place se libère quand assez d'envois sortent de la fenêtre pour repasser sous le plafond
            free_at = sent[len(sent) - self._hourly_cap] + datetime.timedelta(hours=1)
            self._outbox.postpone(entry.id, free_at)
            return 'postponed'

        event = NewMessageEmailRequested(
            event=NewMessageEmailRequested.EVENT_NAME,
            outbox_id=entry.id,
            **entry.payload,
        )
        try:
            self._publisher.publish(event, message_id=str(entry.id))
        except Exception as e:
            attempts = entry.attempts + 1
            delay = min(self._base_backoff * 2 ** (attempts - 1), self._max_backoff)
            attempts = self._outbox.record_failure(
                entry.id, now + datetime.timedelta(seconds=delay), repr(e)[:500],
            )
            log = logger.warning if attempts >= self.WARN_AFTER_ATTEMPTS else logger.info
            log("Publication échouée (outbox_id=%s, tentative %s, prochain essai dans %ss) : %r",
                entry.id, attempts, delay, e)
            return 'failed'

        self._outbox.mark_sent(entry.id, now)
        return 'sent'
