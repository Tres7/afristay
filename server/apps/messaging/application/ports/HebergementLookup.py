from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional
import uuid


@dataclass
class HebergementInfo:
    id: uuid.UUID
    name: str
    host_id: uuid.UUID
    city: str
    image_url: str


class HebergementLookup(ABC):
    """Accès en lecture au contexte hébergements, sans dépendre de ses modèles."""

    @abstractmethod
    def get(self, hebergement_id: uuid.UUID) -> Optional[HebergementInfo]:
        pass

    @abstractmethod
    def get_many(self, hebergement_ids: List[uuid.UUID]) -> Dict[uuid.UUID, HebergementInfo]:
        pass
