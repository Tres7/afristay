from abc import ABC, abstractmethod
from apps.users.application.events import DomainEvent


class EventBus(ABC):

    @abstractmethod
    def publish(self, event: DomainEvent) -> None:
        pass