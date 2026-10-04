from abc import ABC, abstractmethod


class NotificationSender(ABC):

    @abstractmethod
    def send_verification_email(self, to: str, first_name: str, code: str) -> None:
        pass

    @abstractmethod
    def send_welcome_email(self, to: str, first_name: str) -> None:
        pass

    @abstractmethod
    def send_new_message_email(
        self, to: str, first_name: str, sender_first_name: str,
        hebergement_name: str, message_preview: str, conversation_url: str,
    ) -> None:
        pass
