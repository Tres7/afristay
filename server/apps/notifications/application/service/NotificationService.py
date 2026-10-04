from apps.notifications.application.ports.NotificationSender import NotificationSender


class NotificationService:

    def __init__(self, sender: NotificationSender):
        self._sender = sender

    def send_verification_email(self, to: str, first_name: str, code: str) -> None:
        self._sender.send_verification_email(to, first_name, code)
    
    def send_welcome_email(self, to: str, first_name: str) -> None:
        self._sender.send_welcome_email(to, first_name)

    def send_new_message_email(
        self, to: str, first_name: str, sender_first_name: str,
        hebergement_name: str, message_preview: str, conversation_url: str,
    ) -> None:
        self._sender.send_new_message_email(
            to, first_name, sender_first_name, hebergement_name, message_preview, conversation_url,
        )
