from abc import ABC, abstractmethod
from apps.users.application.events import DomainEvent


class EventPublisher(ABC):

    @abstractmethod
    def publish(self, event: DomainEvent) -> None:
        pass