"""Calcul des montants d'une réservation et du barème d'annulation.

Tous les montants sont des entiers en FCFA (le franc CFA n'a pas de sous-unité).
Exemple pour 3 nuits à 20 000 FCFA :
    prix des nuits 60 000, frais de service voyageur 4 800 → le voyageur paie 64 800 ;
    commission hôte 3 000 → l'hôte reçoit 57 000 ; Kwa-Ba garde 7 800 (avant frais FedaPay).
"""
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

FRAIS_VOYAGEUR = Decimal('0.08')
COMMISSION_HOTE = Decimal('0.05')

# Heure d'arrivée de référence pour les délais (barème d'annulation, versement à l'hôte)
HEURE_ARRIVEE = time(14, 0)
DELAI_VERSEMENT = timedelta(hours=24)


def arrondi(montant) -> int:
    return int(Decimal(montant).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


@dataclass(frozen=True)
class Montants:
    prix_nuits: int
    frais_service: int
    commission_hote: int

    @property
    def total(self) -> int:
        return self.prix_nuits + self.frais_service

    @property
    def montant_hote(self) -> int:
        return self.prix_nuits - self.commission_hote


def calculer(prix_par_nuit, nuits: int) -> Montants:
    prix_nuits = arrondi(Decimal(prix_par_nuit) * nuits)
    return Montants(
        prix_nuits=prix_nuits,
        frais_service=arrondi(prix_nuits * FRAIS_VOYAGEUR),
        commission_hote=arrondi(prix_nuits * COMMISSION_HOTE),
    )


def montants_de(reservation) -> Montants:
    """Montants figés d'une réservation (recalculés pour les réservations antérieures au paiement en ligne)."""
    if reservation.prix_nuits is not None:
        return Montants(reservation.prix_nuits, reservation.frais_service, reservation.commission_hote)
    return calculer(reservation.hebergement.price_per_night, reservation.nights)


def arrivee(reservation) -> datetime:
    return timezone.make_aware(datetime.combine(reservation.check_in, HEURE_ARRIVEE))


def date_versement(reservation) -> datetime:
    return arrivee(reservation) + DELAI_VERSEMENT


@dataclass(frozen=True)
class Annulation:
    rembourse_voyageur: int  # montant rendu au voyageur
    nuits_retenues: int      # part du prix des nuits conservée (revient à l'hôte, moins la commission)

    @property
    def commission_hote(self) -> int:
        return arrondi(self.nuits_retenues * COMMISSION_HOTE)

    @property
    def montant_hote(self) -> int:
        return self.nuits_retenues - self.commission_hote


def bareme_voyageur(montants: Montants, reservation, maintenant: datetime | None = None) -> Annulation:
    """Annulation par le voyageur, barème publié sur /remboursement :
    - plus de 7 jours avant l'arrivée : tout est remboursé ;
    - entre 7 jours et 48 heures : 50 % des nuits retenues, frais de service remboursés ;
    - moins de 48 heures : rien n'est remboursé.
    """
    delai = arrivee(reservation) - (maintenant or timezone.now())
    if delai > timedelta(days=7):
        return Annulation(rembourse_voyageur=montants.total, nuits_retenues=0)
    if delai >= timedelta(hours=48):
        retenu = arrondi(Decimal(montants.prix_nuits) / 2)
        return Annulation(rembourse_voyageur=montants.total - retenu, nuits_retenues=retenu)
    return Annulation(rembourse_voyageur=0, nuits_retenues=montants.prix_nuits)
