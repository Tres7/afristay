"""Calcul des montants d'une réservation et du barème d'annulation (CGV, article 6.4 et annexe 1).

Tous les montants sont des entiers en FCFA (le franc CFA n'a pas de sous-unité).
Exemple pour 2,5 nuits à 25 000 FCFA (62 500 FCFA) chez un hôte particulier :
    frais de service voyageur 6 % = 3 750 → le voyageur paie 66 250 ;
    commission hôte 8 % = 5 000 → l'hôte reçoit 57 500 ; Kwa-Ba garde 8 750 (avant frais FedaPay).
"""
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

# Frais de service payés par le voyageur
FRAIS_VOYAGEUR = Decimal('0.06')
FRAIS_REDUITS = Decimal('0.03')  # Client fidèle et Pack Séjour + Chauffeur

# Commission payée par l'hôte (réglée par l'équipe, voir ConditionsHoteModel)
COMMISSION_PARTICULIER = Decimal('0.08')
COMMISSION_HOTEL = Decimal('0.12')
COMMISSION_FONDATEUR = Decimal('0.05')
COMMISSION_HOTE = COMMISSION_PARTICULIER  # taux affiché par défaut

# Heure d'arrivée de référence pour les délais (barème d'annulation, versement à l'hôte)
HEURE_ARRIVEE = time(14, 0)
DELAI_VERSEMENT = timedelta(hours=24)

# Politiques d'annulation au choix de l'hôte (CGV, annexe 1)
POLITIQUES = [('souple', 'Souple'), ('moderee', 'Modérée'), ('ferme', 'Ferme')]
POLITIQUE_PAR_DEFAUT = 'moderee'
# Délai de réflexion offert (CGV, art. 10.3) : annulation dans les 48 h, au moins 7 jours avant l'arrivée
REFLEXION = timedelta(hours=48)
REFLEXION_AVANT_ARRIVEE = timedelta(days=7)
# Séjours d'au moins 28 nuits : le premier mois (30 nuits) n'est pas remboursable à moins de 30 jours de l'arrivée
LONG_SEJOUR_NUITS = 28
PREMIER_MOIS_NUITS = 30


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

    @property
    def taux_frais(self) -> int:
        """Taux des frais de service en %, pour l'affichage (« Frais de service (6 %) »)."""
        return round(self.frais_service * 100 / self.prix_nuits) if self.prix_nuits else 0


def calculer(prix_par_nuit, nuits: int, frais=FRAIS_VOYAGEUR, commission=COMMISSION_PARTICULIER) -> Montants:
    prix_nuits = arrondi(Decimal(prix_par_nuit) * nuits)
    return Montants(
        prix_nuits=prix_nuits,
        frais_service=arrondi(prix_nuits * Decimal(frais)),
        commission_hote=arrondi(prix_nuits * Decimal(commission)),
    )


# --- Taux selon l'hôte et le voyageur -------------------------------------------------------------

def conditions(hote):
    from .models import ConditionsHoteModel

    return ConditionsHoteModel.objects.filter(hote=hote).first()


def taux_commission(hote, jour=None) -> Decimal:
    """8 % (particulier), 12 % (hôtel), 5 % pendant le Programme Fondateurs."""
    c = conditions(hote)
    if not c:
        return COMMISSION_PARTICULIER
    if c.categorie == 'hotel':
        return COMMISSION_HOTEL
    return COMMISSION_FONDATEUR if c.fondateur_le(jour or timezone.localdate()) else COMMISSION_PARTICULIER


def hotes_deja_visites(voyageur) -> set:
    """Hôtes chez qui le voyageur a déjà séjourné par Kwa-Ba (séjour payé et terminé) : tarif Client fidèle."""
    from apps.reservations.models import ReservationModel

    if not voyageur or not voyageur.is_authenticated:
        return set()
    return set(ReservationModel.objects.filter(guest=voyageur, status='confirmed', check_out__lte=timezone.localdate())
               .values_list('hebergement__host_id', flat=True))


def taux_frais(voyageur, hebergement) -> Decimal:
    """6 % ; 3 % pour un Client fidèle (nouveau séjour chez le même hôte par Kwa-Ba)."""
    return FRAIS_REDUITS if hebergement.host_id in hotes_deja_visites(voyageur) else FRAIS_VOYAGEUR


def devis(hebergement, nuits: int, voyageur=None, jour=None) -> Montants:
    """Montants d'un séjour avec les taux de cet hôte et de ce voyageur."""
    return calculer(hebergement.price_per_night, nuits, frais=taux_frais(voyageur, hebergement),
                    commission=taux_commission(hebergement.host, jour))


def montants_de(reservation) -> Montants:
    """Montants figés d'une réservation (recalculés pour les réservations antérieures au paiement en ligne)."""
    if reservation.prix_nuits is not None:
        return Montants(reservation.prix_nuits, reservation.frais_service, reservation.commission_hote)
    return calculer(reservation.hebergement.price_per_night, reservation.nights)


def arrivee(reservation) -> datetime:
    return timezone.make_aware(datetime.combine(reservation.check_in, HEURE_ARRIVEE))


def date_versement(reservation) -> datetime:
    return arrivee(reservation) + DELAI_VERSEMENT


# --- Annulation par le voyageur ------------------------------------------------------------------

@dataclass(frozen=True)
class Annulation:
    rembourse_voyageur: int  # montant rendu au voyageur
    nuits_retenues: int      # part du prix des nuits conservée (revient à l'hôte, moins la commission)
    commission_hote: int = 0  # commission sur les nuits retenues, au taux de la réservation

    @property
    def montant_hote(self) -> int:
        return self.nuits_retenues - self.commission_hote


def _retenue(montants: Montants, nuits_retenues: int, frais_rendus: bool = False) -> Annulation:
    """Le voyageur perd `nuits_retenues` (et les frais de service, sauf `frais_rendus`)."""
    nuits_retenues = max(0, min(nuits_retenues, montants.prix_nuits))
    commission = arrondi(Decimal(nuits_retenues) * montants.commission_hote / montants.prix_nuits) if montants.prix_nuits else 0
    rendu = montants.prix_nuits - nuits_retenues + (montants.frais_service if frais_rendus else 0)
    return Annulation(rembourse_voyageur=rendu, nuits_retenues=nuits_retenues, commission_hote=commission)


def politique(reservation) -> str:
    return getattr(reservation.hebergement, 'politique_annulation', '') or POLITIQUE_PAR_DEFAUT


REGLES_POLITIQUES = {
    'souple': "remboursement intégral jusqu'à 24 heures avant l'arrivée ; ensuite, la première nuit est retenue",
    'moderee': "remboursement intégral jusqu'à 5 jours avant l'arrivée ; 50 % des nuits jusqu'à 24 heures avant ; "
               "aucun remboursement ensuite",
    'ferme': "remboursement intégral jusqu'à 30 jours avant l'arrivée ; 50 % des nuits jusqu'à 7 jours avant ; "
             "aucun remboursement ensuite",
}


def texte_politique(reservation) -> str:
    """Conditions d'annulation de la réservation, en une phrase (bon de réservation, email de confirmation)."""
    code = politique(reservation)
    return (f"Politique {dict(POLITIQUES)[code]} : {REGLES_POLITIQUES[code]}. Les frais de service ne sont rendus qu'avec un "
            "remboursement intégral. Annulation gratuite dans les 48 heures suivant la réservation si l'arrivée est dans "
            "7 jours ou plus.")


def bareme_voyageur(montants: Montants, reservation, maintenant: datetime | None = None) -> Annulation:
    """Annulation par le voyageur (CGV, article 10.3 et annexe 1) :
    - délai de réflexion : annulée dans les 48 h suivant la réservation et au moins 7 jours avant l'arrivée,
      tout est remboursé ;
    - séjour de 28 nuits ou plus : tout est remboursé au moins 30 jours avant l'arrivée ; ensuite, le premier mois
      est retenu et les frais de service conservés ;
    - sinon, la politique choisie par l'hôte :
      Souple : intégral jusqu'à 24 h avant ; ensuite, la première nuit est retenue ;
      Modérée : intégral jusqu'à 5 jours avant ; 50 % des nuits jusqu'à 24 h avant ; rien ensuite ;
      Ferme : intégral jusqu'à 30 jours avant ; 50 % des nuits jusqu'à 7 jours avant ; rien ensuite.
    Les frais de service ne sont rendus qu'avec un remboursement intégral.
    """
    maintenant = maintenant or timezone.now()
    delai = arrivee(reservation) - maintenant
    integral = Annulation(rembourse_voyageur=montants.total, nuits_retenues=0)
    if maintenant - reservation.created_at <= REFLEXION and delai >= REFLEXION_AVANT_ARRIVEE:
        return integral

    nuits = max(1, (reservation.check_out - reservation.check_in).days)
    if nuits >= LONG_SEJOUR_NUITS:
        if delai >= timedelta(days=30):
            return integral
        return _retenue(montants, arrondi(Decimal(montants.prix_nuits) * min(nuits, PREMIER_MOIS_NUITS) / nuits))

    moitie = arrondi(Decimal(montants.prix_nuits) / 2)
    match politique(reservation):
        case 'souple':
            if delai >= timedelta(hours=24):
                return integral
            return _retenue(montants, arrondi(Decimal(montants.prix_nuits) / nuits))
        case 'ferme':
            if delai >= timedelta(days=30):
                return integral
            if delai >= timedelta(days=7):
                return _retenue(montants, moitie)
            return _retenue(montants, montants.prix_nuits)
        case _:  # modérée
            if delai >= timedelta(days=5):
                return integral
            if delai >= timedelta(hours=24):
                return _retenue(montants, moitie)
            return _retenue(montants, montants.prix_nuits)
