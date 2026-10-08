import datetime
import uuid

import pytest

from apps.messaging.domain.entities.Conversation import Conversation
from apps.messaging.domain.entities.Message import Message
from apps.messaging.domain.exceptions import (
    CannotContactOwnHebergementException,
    InvalidMessageException,
    NotParticipantException,
)

GUEST, HOST, STRANGER = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()


class TestMessageCompose:
    @pytest.mark.parametrize('empty', ['', '   \n ', None])
    def test_rejects_empty_message(self, empty):
        with pytest.raises(InvalidMessageException):
            Message.compose(uuid.uuid4(), GUEST, empty)

    def test_accepts_2000_characters_and_rejects_2001(self):
        assert len(Message.compose(uuid.uuid4(), GUEST, 'a' * 2000).content) == 2000
        with pytest.raises(InvalidMessageException):
            Message.compose(uuid.uuid4(), GUEST, 'a' * 2001)

    def test_trims_content(self):
        assert Message.compose(uuid.uuid4(), GUEST, '  Bonjour  ').content == 'Bonjour'


class TestMessagePreview:
    def test_short_text_unchanged(self):
        assert Message.compose(uuid.uuid4(), GUEST, 'Bonjour').preview() == 'Bonjour'

    def test_long_text_truncated_to_120_characters(self):
        preview = Message.compose(uuid.uuid4(), GUEST, 'mot ' * 100).preview()
        assert len(preview) <= Message.PREVIEW_LENGTH
        assert preview.endswith('…')


@pytest.fixture
def conversation():
    return Conversation.start(uuid.uuid4(), guest_id=GUEST, host_id=HOST)


class TestConversation:
    def test_cannot_contact_own_hebergement(self):
        with pytest.raises(CannotContactOwnHebergementException):
            Conversation.start(uuid.uuid4(), guest_id=HOST, host_id=HOST)

    def test_roles_and_other_participant(self, conversation):
        assert conversation.role_of(GUEST) == 'guest'
        assert conversation.role_of(HOST) == 'host'
        assert conversation.other_participant(GUEST) == HOST
        assert conversation.other_participant(HOST) == GUEST

    def test_rejects_non_participant(self, conversation):
        assert not conversation.is_participant(STRANGER)
        with pytest.raises(NotParticipantException):
            conversation.role_of(STRANGER)
        with pytest.raises(NotParticipantException):
            conversation.mark_read(STRANGER, 1)

    def test_read_cursor_never_moves_back(self, conversation):
        conversation.mark_read(GUEST, 10)
        conversation.mark_read(GUEST, 4)
        assert conversation.last_read_id_for(GUEST) == 10
        assert conversation.last_read_id_for(HOST) == 0

    def test_sent_message_is_read_by_its_sender(self, conversation):
        sent_at = datetime.datetime(2026, 10, 8, 12, 0, tzinfo=datetime.timezone.utc)
        conversation.record_message(HOST, 7, sent_at)
        assert conversation.last_read_id_for(HOST) == 7
        assert conversation.last_read_id_for(GUEST) == 0
        assert conversation.last_message_at == sent_at
