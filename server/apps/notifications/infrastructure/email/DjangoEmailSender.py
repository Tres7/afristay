from django.core.mail import send_mail
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
            subject='Vérification de votre compte AfriStay',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )

    def send_welcome_email(self, to: str, first_name: str) -> None:
        message = render_to_string('emails/welcome_email.txt', {
            'first_name': first_name,
        })
        send_mail(
            subject='Bienvenue sur AfriStay',
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
            subject='Réinitialisation de votre mot de passe AfriStay',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
        )
