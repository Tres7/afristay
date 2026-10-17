from abc import ABC, abstractmethod
from typing import Iterable, Set, Tuple
import uuid

Pair = Tuple[uuid.UUID, uuid.UUID]  # (hebergement_id, guest_id)


class BookingLookup(ABC):
    """Accès en lecture aux réservations : le voyageur a-t-il une réservation payée (confirmée) de ce logement ?

    Tant que ce n'est pas le cas, il reste anonyme pour l'hôte."""

    @abstractmethod
    def booked(self, pairs: Iterable[Pair]) -> Set[Pair]:
        pass


class EveryoneBooked(BookingLookup):
    """Toutes les identités visibles (tests du domaine)."""

    def booked(self, pairs: Iterable[Pair]) -> Set[Pair]:
        return set(pairs)
