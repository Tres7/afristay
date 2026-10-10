from email.mime.image import MIMEImage
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .html import CID_LOGO, page_html

LOGO = Path(__file__).with_name('kwaba-logo-email.png')


@lru_cache(maxsize=1)
def _logo() -> bytes:
    return LOGO.read_bytes()


def send_mail(subject: str, message: str, from_email: str, recipient_list: list[str]) -> int:
    """Comme django.core.mail.send_mail, en version texte et HTML aux couleurs de Kwa-Ba.

    - adresse de réponse du site (EMAIL_REPLY_TO) : les emails partent d'une adresse « noreply »,
      une réponse du destinataire arrive sur la boîte de contact ;
    - version HTML avec le logo joint à l'email (Content-ID), affiché sans image distante.
    """
    reply_to = [settings.EMAIL_REPLY_TO] if settings.EMAIL_REPLY_TO else None
    email = EmailMultiAlternatives(subject, message, from_email, recipient_list, reply_to=reply_to)
    email.attach_alternative(page_html(message, subject), 'text/html')
    email.mixed_subtype = 'related'
    logo = MIMEImage(_logo(), 'png')
    logo.add_header('Content-ID', f'<{CID_LOGO}>')
    logo.add_header('Content-Disposition', 'inline', filename='kwaba.png')
    email.attach(logo)
    return email.send()
