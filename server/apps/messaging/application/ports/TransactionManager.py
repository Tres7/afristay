from abc import ABC, abstractmethod
from typing import ContextManager


class TransactionManager(ABC):
    """Délimite une transaction : verrous et écritures (message, curseurs, outbox) sont validés ensemble."""

    @abstractmethod
    def atomic(self) -> ContextManager:
        pass
