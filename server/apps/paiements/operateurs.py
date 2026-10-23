"""Pays ouverts au paiement et opérateurs Mobile Money utilisables pour les versements aux hôtes.

`mode` = identifiant du moyen de versement chez FedaPay. À vérifier dans le tableau de bord
FedaPay (Paramètres → Moyens de paiement / Payouts) avant la mise en production : un mode
non activé sur le compte est refusé par l'API, et le versement passe alors en échec avec le
message de FedaPay (visible dans l'admin Django).

Au lancement, seuls Moov Money (Flooz) et Mixx by Yas (T-Money) sont ouverts : les autres opérateurs restent
définis ici mais ne sont proposés que si l'interrupteur MODULE_PAIEMENTS_NON_OUVERTS est actif (config/site.py).
"""
from django.conf import settings

PAYS = {
    'TG': {'nom': 'Togo', 'indicatif': '228', 'chiffres': 8, 'operateurs': [
        ('moov_tg', 'Moov Money (Flooz)'),
        ('togocel', 'Mixx by Yas (T-Money)'),
    ]},
    'BJ': {'nom': 'Bénin', 'indicatif': '229', 'chiffres': 10, 'operateurs': [
        ('mtn_open', 'MTN Mobile Money'),
        ('moov', 'Moov Money'),
        ('sbin', 'Celtiis Cash'),
    ]},
    'BF': {'nom': 'Burkina Faso', 'indicatif': '226', 'chiffres': 8, 'operateurs': [
        ('orange_bf', 'Orange Money'),
        ('moov_bf', 'Moov Money'),
    ]},
    'NE': {'nom': 'Niger', 'indicatif': '227', 'chiffres': 8, 'operateurs': [
        ('airtel_ne', 'Airtel Money'),
    ]},
    'ML': {'nom': 'Mali', 'indicatif': '223', 'chiffres': 8, 'operateurs': [
        ('orange_ml', 'Orange Money'),
        ('moov_ml', 'Moov Money'),
    ]},
}

PAYS_CHOICES = [(code, p['nom']) for code, p in PAYS.items()]
OPERATEUR_CHOICES = [op for p in PAYS.values() for op in p['operateurs']]


OUVERTS = {'moov_tg', 'togocel'}


def pays_ouverts() -> dict:
    """Pays et opérateurs proposés aux utilisateurs (remboursement, versement de l'hôte)."""
    if settings.MODULES['paiements_non_ouverts']:
        return PAYS
    ouverts = {code: {**p, 'operateurs': [op for op in p['operateurs'] if op[0] in OUVERTS]} for code, p in PAYS.items()}
    return {code: p for code, p in ouverts.items() if p['operateurs']}


def operateurs_du_pays(pays: str) -> dict[str, str]:
    """Tous les opérateurs du pays (versements aux partenaires saisis par l'équipe dans le back-office)."""
    return dict(PAYS.get(pays, {}).get('operateurs', []))


def operateurs_ouverts(pays: str) -> dict[str, str]:
    """Opérateurs proposés aux utilisateurs (numéro de remboursement, compte de versement de l'hôte)."""
    return dict(pays_ouverts().get(pays, {}).get('operateurs', []))


def nom_operateur(mode: str) -> str:
    return dict(OPERATEUR_CHOICES).get(mode, mode)
