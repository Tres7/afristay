import datetime
import logging
from typing import List, Optional, Tuple
import uuid

from apps.messaging.application.dto.dto import (
    ConversationSummaryDTO,
    HebergementSummaryDTO,
    MessageDTO,
    ParticipantDTO,
)
from apps.messaging.application.events.NewMessageEmailRequested import NewMessageEmailRequested
from apps.messaging.application.ports.HebergementLookup import HebergementLookup
from apps.messaging.application.ports.NotificationOutbox import NotificationOutbox
from apps.messaging.application.ports.TransactionManager import TransactionManager
from apps.messaging.application.ports.UserLookup import UserLookup
from apps.messaging.domain.entities.Conversation import Conversation
from apps.messaging.domain.entities.Message import Message
from apps.messaging.domain.exceptions import (
    ConversationAlreadyExistsException,
    ConversationNotFoundException,
    HebergementNotFoundException,
    NotParticipantException,
)
from apps.messaging.domain.repositories.ConversationRepository import ConversationRepository
from apps.messaging.domain.repositories.MessageRepository import MessageRepository

logger = logging.getLogger(__name__)


class MessagingService:

    INITIAL_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 100

    def __init__(
        self,
        conversations: ConversationRepository,
        messages: MessageRepository,
        hebergements: HebergementLookup,
        users: UserLookup,
        outbox: NotificationOutbox,
        tx: TransactionManager,
        email_delay_seconds: int = 60,
    ):
        self._conversations = conversations
        self._messages = messages
        self._hebergements = hebergements
        self._users = users
        self._outbox = outbox
        self._tx = tx
        self._email_delay = datetime.timedelta(seconds=email_delay_seconds)

    def start_conversation(self, user_id: uuid.UUID, hebergement_id: uuid.UUID) -> Tuple[ConversationSummaryDTO, bool]:
        """Idempotent : renvoie le fil existant s'il y en a déjà un. Le booléen indique une création."""
        hebergement = self._hebergements.get(hebergement_id)
        if hebergement is None:
            raise HebergementNotFoundException(str(hebergement_id))
        return self._open(hebergement, guest_id=user_id, viewer_id=user_id)

    def open_as_host(
        self, host_id: uuid.UUID, hebergement_id: uuid.UUID, guest_id: uuid.UUID,
    ) -> Tuple[ConversationSummaryDTO, bool]:
        """L'hôte ouvre (ou retrouve) le fil avec un voyageur de son logement.

        Le contrôle « ce voyageur a bien réservé ce logement » est fait par l'appelant.
        """
        hebergement = self._hebergements.get(hebergement_id)
        if hebergement is None:
            raise HebergementNotFoundException(str(hebergement_id))
        if hebergement.host_id != host_id:
            raise NotParticipantException(str(hebergement_id))
        return self._open(hebergement, guest_id=guest_id, viewer_id=host_id)

    def _open(self, hebergement, guest_id: uuid.UUID, viewer_id: uuid.UUID) -> Tuple[ConversationSummaryDTO, bool]:
        # Lève CannotContactOwnHebergementException si le voyageur est l'hôte
        conversation = Conversation.start(hebergement.id, guest_id, hebergement.host_id)

        existing = self._conversations.find_by_hebergement_and_guest(hebergement.id, guest_id)
        if existing:
            return self._summaries([existing], viewer_id)[0], False

        try:
            created = self._conversations.create(conversation)
        except ConversationAlreadyExistsException:
            # Création concurrente : l'autre requête a gagné, on renvoie son fil
            existing = self._conversations.find_by_hebergement_and_guest(hebergement.id, guest_id)
            if existing is None:
                # Violation d'intégrité d'une autre nature (hébergement supprimé entre-temps)
                raise HebergementNotFoundException(str(hebergement.id))
            return self._summaries([existing], viewer_id)[0], False

        return self._summaries([created], viewer_id)[0], True

    def list_conversations(self, user_id: uuid.UUID) -> List[ConversationSummaryDTO]:
        return self._summaries(self._conversations.list_for_user(user_id), user_id)

    def unread_total(self, user_id: uuid.UUID) -> int:
        """Nombre total de messages non lus, tous fils confondus (badge de la navbar)."""
        conversations = self._conversations.list_for_user(user_id)
        return sum(self._messages.unread_counts(user_id, conversations).values())

    def get_conversation(self, user_id: uuid.UUID, conversation_id: uuid.UUID) -> ConversationSummaryDTO:
        conversation = self._participant_conversation(conversation_id, user_id)
        return self._summaries([conversation], user_id)[0]

    def get_messages(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        after_id: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[MessageDTO]:
        conversation = self._participant_conversation(conversation_id, user_id)
        page_size = min(limit or self.INITIAL_PAGE_SIZE, self.MAX_PAGE_SIZE)
        messages = self._messages.list(conversation.id, after_id, page_size)
        return [MessageDTO.from_entity(m, user_id) for m in messages]

    def send_message(self, user_id: uuid.UUID, conversation_id: uuid.UUID, content: str) -> MessageDTO:
        message = Message.compose(conversation_id, user_id, content)

        with self._tx.atomic():
            # Le verrou sérialise les envois d'un même fil : les ids des messages y sont donc
            # validés dans l'ordre (curseur fiable pour ?after=), et la décision 0→1 ne peut
            # pas être prise deux fois en parallèle.
            conversation = self._conversations.find_by_id_for_update(conversation_id)
            if conversation is None or not conversation.is_participant(user_id):
                raise ConversationNotFoundException(str(conversation_id))

            recipient_id = conversation.other_participant(user_id)
            first_unread_for_recipient = not self._messages.has_unread_for(conversation, recipient_id)

            saved = self._messages.add(message)
            conversation.record_message(user_id, saved.id, saved.created_at)
            self._conversations.save(conversation)

            if first_unread_for_recipient:
                self._schedule_new_message_email(conversation, saved, recipient_id)

        return MessageDTO.from_entity(saved, user_id)

    def mark_as_read(self, user_id: uuid.UUID, conversation_id: uuid.UUID, up_to_id: Optional[int] = None) -> int:
        """Avance le curseur de lecture (jusqu'au dernier message par défaut). Renvoie le curseur."""
        with self._tx.atomic():
            conversation = self._conversations.find_by_id_for_update(conversation_id)
            if conversation is None or not conversation.is_participant(user_id):
                raise ConversationNotFoundException(str(conversation_id))

            latest_id = self._messages.latest_id(conversation.id)
            if latest_id is not None:
                target = latest_id if up_to_id is None else min(up_to_id, latest_id)
                conversation.mark_read(user_id, target)
                self._conversations.save(conversation)

            return conversation.last_read_id_for(user_id)

    def _schedule_new_message_email(self, conversation: Conversation, message: Message, recipient_id: uuid.UUID) -> None:
        """Écrit la notification dans l'outbox, dans la transaction de l'envoi.
        Le relais la publiera après le délai, si le destinataire n'a pas lu entre-temps."""
        people = self._users.get_many([recipient_id, message.sender_id])
        recipient = people.get(recipient_id)
        sender = people.get(message.sender_id)
        hebergement = self._hebergements.get(conversation.hebergement_id)

        if recipient is None or not recipient.email:
            logger.warning(
                "Notification non planifiée : destinataire sans email (conversation=%s, recipient=%s)",
                conversation.id, recipient_id,
            )
            return

        self._outbox.schedule(
            event_type=NewMessageEmailRequested.EVENT_NAME,
            conversation_id=conversation.id,
            message_id=message.id,
            recipient_id=recipient_id,
            payload={
                'conversation_id': str(conversation.id),
                'recipient_email': recipient.email,
                'recipient_first_name': recipient.first_name,
                'sender_first_name': sender.first_name if sender else '',
                'hebergement_name': hebergement.name if hebergement else '',
                'message_preview': message.preview(),
            },
            available_at=message.created_at + self._email_delay,
        )

    def _participant_conversation(self, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Conversation:
        # Un non-participant reçoit la même réponse qu'un fil inexistant : on ne révèle pas son existence
        conversation = self._conversations.find_by_id(conversation_id)
        if conversation is None or not conversation.is_participant(user_id):
            raise ConversationNotFoundException(str(conversation_id))
        return conversation

    def _summaries(self, conversations: List[Conversation], user_id: uuid.UUID) -> List[ConversationSummaryDTO]:
        if not conversations:
            return []

        # Nombre de requêtes constant, quel que soit le nombre de fils
        ids = [c.id for c in conversations]
        last_messages = self._messages.last_messages(ids)
        unread = self._messages.unread_counts(user_id, conversations)
        hebergements = self._hebergements.get_many(list({c.hebergement_id for c in conversations}))
        others = self._users.get_many(list({c.other_participant(user_id) for c in conversations}))

        summaries = []
        for c in conversations:
            heb = hebergements.get(c.hebergement_id)
            other = others.get(c.other_participant(user_id))
            last = last_messages.get(c.id)
            summaries.append(ConversationSummaryDTO(
                id=c.id,
                my_role=c.role_of(user_id),
                hebergement=HebergementSummaryDTO(
                    id=heb.id, name=heb.name, city=heb.city, image_url=heb.image_url,
                ) if heb else None,
                other_participant=ParticipantDTO(
                    id=other.id, first_name=other.first_name,
                    last_name=other.last_name, avatar_url=other.avatar_url,
                ) if other else None,
                last_message=MessageDTO.from_entity(last, user_id) if last else None,
                unread_count=unread.get(c.id, 0),
                last_message_at=c.last_message_at,
            ))
        return summaries
