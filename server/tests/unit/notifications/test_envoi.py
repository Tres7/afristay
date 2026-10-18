from apps.notifications.infrastructure.email.envoi import send_mail


def test_each_recipient_gets_their_own_email_without_the_others_addresses(mailoutbox, settings):
    settings.EMAIL_REPLY_TO = 'info@kwa-ba.com'
    sent = send_mail('Visite à planifier', 'Bonjour,\n\nUne annonce attend une visite.', 'noreply@kwa-ba.com',
                     ['admin@kwa-ba.com', 'agent@exemple.com'], pieces_jointes=[('bon.pdf', b'%PDF-1.4', 'application/pdf')])

    assert sent == 2
    assert [email.to for email in mailoutbox] == [['admin@kwa-ba.com'], ['agent@exemple.com']]
    for email in mailoutbox:
        assert email.cc == [] and email.bcc == []
        assert email.reply_to == ['info@kwa-ba.com']
        message = email.message().as_string()
        assert 'admin@kwa-ba.com' not in message or 'agent@exemple.com' not in message
        # The logo is attached as a MIME part; files passed by the caller are (name, content, type) tuples
        assert [piece[0] for piece in email.attachments if isinstance(piece, tuple)] == ['bon.pdf']


def test_duplicate_and_blank_recipients_are_sent_once(mailoutbox):
    sent = send_mail('Alerte', 'Texte', 'noreply@kwa-ba.com', ['Admin@Kwa-Ba.com', 'admin@kwa-ba.com', ' ', ''])

    assert sent == 1
    assert [email.to for email in mailoutbox] == [['Admin@Kwa-Ba.com']]


def test_no_recipient_sends_nothing(mailoutbox):
    assert send_mail('Alerte', 'Texte', 'noreply@kwa-ba.com', []) == 0
    assert mailoutbox == []
