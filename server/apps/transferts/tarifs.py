"""Catégories de véhicules, calcul du prix d'un transfert et règles de délai.

Les prix de base par aéroport et par catégorie sont dans TarifTransfertModel (modifiables
dans l'admin Django) ; ce module applique les règles communes.
"""
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

CATEGORIES = {
    'berline': {'nom': 'Berline', 'description': 'Toyota Corolla ou similaire, climatisée', 'passagers': 3, 'bagages': 3},
    'confort': {'nom': 'SUV confort', 'description': 'Toyota RAV4 ou similaire, plus d\'espace', 'passagers': 4, 'bagages': 4},
    'van': {'nom': 'Minibus', 'description': 'Toyota Hiace ou similaire, pour les groupes', 'passagers': 7, 'bagages': 8},
}
CATEGORIE_CHOICES = [(code, c['nom']) for code, c in CATEGORIES.items()]

# Arrivée entre 22 h et 6 h (heure locale de l'aéroport) : majoration de nuit
DEBUT_NUIT, FIN_NUIT = time(22, 0), time(6, 0)
MAJORATION_NUIT = Decimal('0.25')

# Part du prix conservée par Kwa-Ba, le reste revient au chauffeur partenaire
COMMISSION_CHAUFFEUR = Decimal('0.20')

# Il faut le temps d'attribuer un chauffeur : réservation au plus tard 6 h avant l'arrivée
DELAI_MIN_RESERVATION = timedelta(hours=6)
# Annulation gratuite jusqu'à 24 h avant l'arrivée ; ensuite le chauffeur est payé
DELAI_ANNULATION_GRATUITE = timedelta(hours=24)
# Le chauffeur est payé 24 h après la prise en charge (le temps de signaler un problème)
DELAI_VERSEMENT = timedelta(hours=24)
# Attente gratuite du chauffeur après l'atterrissage
ATTENTE_INCLUSE_MINUTES = 60


def arrondi_500(montant) -> int:
    """Prix arrondis aux 500 FCFA supérieurs : plus simples à lire et à rendre en espèces."""
    return int((Decimal(montant) / 500).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * 500)


def est_de_nuit(arrivee_locale: datetime) -> bool:
    heure = arrivee_locale.time()
    return heure >= DEBUT_NUIT or heure < FIN_NUIT


@dataclass(frozen=True)
class Prix:
    prix: int
    commission: int
    nuit: bool

    @property
    def montant_chauffeur(self) -> int:
        return self.prix - self.commission


def calculer(prix_base: int, arrivee_locale: datetime) -> Prix:
    nuit = est_de_nuit(arrivee_locale)
    prix = arrondi_500(Decimal(prix_base) * (1 + MAJORATION_NUIT)) if nuit else int(prix_base)
    commission = int((Decimal(prix) * COMMISSION_CHAUFFEUR).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    return Prix(prix=prix, commission=commission, nuit=nuit)


def capacite_suffisante(categorie: str, passagers: int, bagages: int) -> str | None:
    """Explique pourquoi le véhicule ne convient pas, ou None."""
    c = CATEGORIES[categorie]
    if passagers > c['passagers']:
        return f"{c['passagers']} passagers maximum"
    if bagages > c['bagages']:
        return f"{c['bagages']} bagages maximum"
    return None
