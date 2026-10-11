"""Causes soutenues, montants des dons et calendrier des reversements.

Kwa-Ba ne prend aucune commission sur les dons. Seuls les frais du prestataire de paiement
(FedaPay, PayPal) s'appliquent ; le donateur choisit de les ajouter à son don (l'ONG reçoit alors
100 % du montant choisi) ou de les laisser déduire du montant reversé.

Exemple pour un don de 2 000 FCFA (frais de 3 %) :
    frais ajoutés  → le donateur paie 2 062, l'ONG reçoit 2 000
    frais déduits  → le donateur paie 2 000, l'ONG reçoit 1 940
"""
import math
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

CAUSES = {
    'education': {'nom': 'Éducation', 'description': "Écoles, fournitures, bourses et soutien scolaire."},
    'sante': {'nom': 'Santé', 'description': "Soins, centres de santé, prévention et accès aux médicaments."},
    'eau': {'nom': "Accès à l'eau", 'description': "Forages, puits, assainissement et hygiène."},
    'environnement': {'nom': 'Environnement', 'description': "Reboisement, gestion des déchets, protection des côtes."},
}
CAUSE_CHOICES = [(code, c['nom']) for code, c in CAUSES.items()]

# Frais moyens des prestataires de paiement (Mobile Money, carte, PayPal), à ajuster selon le contrat FedaPay
FRAIS_PAIEMENT = Decimal('0.03')
COMMISSION_KWABA = Decimal('0')  # gratuit pour les ONG partenaires au lancement

MONTANTS_SUGGERES = [500, 2000, 3000, 5000]
MONTANT_MIN = 500
MONTANT_MAX = 1_000_000

# Les dons d'un mois sont reversés à l'ONG au plus tard le 10 du mois suivant
JOUR_REVERSEMENT = 10


@dataclass(frozen=True)
class MontantsDon:
    don: int  # montant choisi par le donateur
    frais: int  # frais du prestataire de paiement
    total: int  # montant débité
    montant_ong: int  # montant reversé à l'ONG


def calculer(montant: int, couvre_frais: bool) -> MontantsDon:
    if couvre_frais:
        # Les frais s'appliquent au montant débité : on l'arrondit au franc supérieur pour que l'ONG reçoive tout
        total = math.ceil(Decimal(montant) / (1 - FRAIS_PAIEMENT))
        return MontantsDon(don=montant, frais=total - montant, total=total, montant_ong=montant)
    frais = int((Decimal(montant) * FRAIS_PAIEMENT).to_integral_value(ROUND_HALF_UP))  # comme Math.round côté site
    return MontantsDon(don=montant, frais=frais, total=montant, montant_ong=montant - frais)


def debut_du_mois(jour: date) -> date:
    return jour.replace(day=1)


def mois_suivant(jour: date) -> date:
    return date(jour.year + jour.month // 12, jour.month % 12 + 1, 1)


def date_reversement(jour_du_don: date) -> date:
    """Date limite du reversement à l'ONG d'un don fait ce jour-là."""
    return mois_suivant(jour_du_don).replace(day=JOUR_REVERSEMENT)
