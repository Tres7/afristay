from django.conf import settings
from django.core.mail import EmailMessage


def send_mail(subject: str, message: str, from_email: str, recipient_list: list[str]) -> int:
    """Comme django.core.mail.send_mail, avec l'adresse de réponse du site (EMAIL_REPLY_TO).

    Les emails partent d'une adresse « noreply » ; une réponse du destinataire arrive sur la boîte de contact.
    """
    reply_to = [settings.EMAIL_REPLY_TO] if settings.EMAIL_REPLY_TO else None
    return EmailMessage(subject, message, from_email, recipient_list, reply_to=reply_to).send()
