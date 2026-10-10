from apps.notifications.infrastructure.email.envoi import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from apps.notifications.application.ports.NotificationSender import NotificationSender


class DjangoEmailSender(NotificationSender):

    def send_verification_email(self, to: str, first_name: str, code: str) -> None:
        message = render_to_string('emails/verification_code.txt', {
            'first_name': first_name,
            'code': code,
        })
        send_mail(
            subject='Vérification de votre compte Kwa-Ba',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )

    def send_welcome_email(self, to: str, first_name: str) -> None:
        message = render_to_string('emails/welcome_email.txt', {
            'first_name': first_name,
        })
        send_mail(
            subject='Bienvenue sur Kwa-Ba',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )

    def send_new_message_email(
        self, to: str, first_name: str, sender_first_name: str,
        hebergement_name: str, message_preview: str, conversation_url: str,
    ) -> None:
        message = render_to_string('emails/new_message.txt', {
            'first_name': first_name,
            'sender_first_name': sender_first_name,
            'hebergement_name': hebergement_name,
            'message_preview': message_preview,
            'conversation_url': conversation_url,
        })
        send_mail(
            subject=f'Nouveau message de {sender_first_name} sur Kwa-Ba',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )

    def send_password_reset_email(self, to: str, first_name: str, code: str) -> None:
        message = render_to_string('emails/password_reset.txt', {
            'first_name': first_name,
            'code': code,
        })
        send_mail(
            subject='Réinitialisation de votre mot de passe Kwa-Ba',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )
