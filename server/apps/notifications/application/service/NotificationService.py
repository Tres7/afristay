from apps.notifications.application.ports.NotificationSender import NotificationSender


class NotificationService:

    def __init__(self, sender: NotificationSender):
        self._sender = sender

    def send_verification_email(self, to: str, first_name: str, code: str) -> None:
        self._sender.send_verification_email(to, first_name, code)