from abc import ABC, abstractmethod


class NotificationSender(ABC):

    @abstractmethod
    def send_verification_email(self, to: str, first_name: str, code: str) -> None:
        pass