import pytest

from apps.notifications.application.service.NotificationService import NotificationService
from apps.notifications.infrastructure.email.DjangoEmailSender import DjangoEmailSender


@pytest.fixture
def notifications():
    return NotificationService(DjangoEmailSender())


def test_verification_email(notifications, mailoutbox):
    notifications.send_verification_email('ama@example.tg', 'Ama', '482913')
    [email] = mailoutbox
    assert email.to == ['ama@example.tg']
    assert 'Vérification' in email.subject
    assert 'Ama' in email.body
    assert '482913' in email.body


def test_welcome_email(notifications, mailoutbox):
    notifications.send_welcome_email('ama@example.tg', 'Ama')
    [email] = mailoutbox
    assert email.subject == 'Bienvenue sur Kwa-Ba'
    assert 'Ama' in email.body


def test_password_reset_email(notifications, mailoutbox):
    notifications.send_password_reset_email('ama@example.tg', 'Ama', '105377')
    [email] = mailoutbox
    assert 'Réinitialisation' in email.subject
    assert '105377' in email.body


def test_new_message_email(notifications, mailoutbox):
    notifications.send_new_message_email('kofi@example.tg', 'Kofi', 'Ama', 'Villa Océane', 'Bonjour, est-ce libre ?',
                                         'https://afristay.example/messages/42')
    [email] = mailoutbox
    assert email.subject == 'Nouveau message de Ama sur Kwa-Ba'
    for expected in ('Kofi', 'Villa Océane', 'Bonjour, est-ce libre ?', 'https://afristay.example/messages/42'):
        assert expected in email.body


@pytest.mark.xfail(strict=True, raises=AssertionError, reason=(
    "Anomalie : les gabarits .txt passent par l'échappement HTML de Django ; "
    "« N'Guessan » devient « N&#x27;Guessan » dans un email en texte brut."
))
def test_plain_text_email_keeps_apostrophes(notifications, mailoutbox):
    notifications.send_welcome_email('nguessan@example.tg', "N'Guessan")
    assert "N'Guessan" in mailoutbox[0].body
