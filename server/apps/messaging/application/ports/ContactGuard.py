from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List
import uuid


@dataclass
class Screening:
    """Résultat du filtrage d'un message : texte à enregistrer (coordonnées masquées) et éléments détectés."""
    content: str
    masked: bool = False
    findings: List[object] = field(default_factory=list)


class ContactGuard(ABC):
    """Anti-contournement : masque les coordonnées (téléphone, email, liens…) et signale les tentatives."""

    @abstractmethod
    def screen(self, text: str) -> Screening:
        pass

    @abstractmethod
    def report(self, sender_id: uuid.UUID, conversation_id: uuid.UUID, screening: Screening) -> None:
        pass


class PassThroughContactGuard(ContactGuard):
    """Sans filtrage (tests du domaine)."""

    def screen(self, text: str) -> Screening:
        return Screening(content=text)

    def report(self, sender_id, conversation_id, screening) -> None:
        pass
