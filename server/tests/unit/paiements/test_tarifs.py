from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.utils import timezone

from apps.paiements import paypal, tarifs


def test_montants_grille_particulier():
    # Exemple de la grille : 2,5 nuits à 25 000 FCFA, soit 62 500 FCFA (ici 1 nuit à 62 500)
    m = tarifs.calculer(62500, 1)
    assert (m.prix_nuits, m.frais_service, m.commission_hote) == (62500, 3750, 5000)
    assert (m.total, m.montant_hote, m.taux_frais) == (66250, 57500, 6)


def test_montants_hotel_fondateur_et_client_fidele():
    hotel = tarifs.calculer(62500, 1, commission=tarifs.COMMISSION_HOTEL)
    assert (hotel.commission_hote, hotel.montant_hote) == (7500, 55000)
    fondateur = tarifs.calculer(62500, 1, commission=tarifs.COMMISSION_FONDATEUR)
    assert fondateur.montant_hote == 59375
    fidele = tarifs.calculer(62500, 1, frais=tarifs.FRAIS_REDUITS)
    assert (fidele.frais_service, fidele.taux_frais) == (1875, 3)


def test_arrondi_au_franc():
    m = tarifs.calculer('12345.00', 1)
    assert (m.frais_service, m.commission_hote) == (741, 988)


def _resa(dans_jours, nuits=3, politique='moderee', reservee_il_y_a=timedelta(days=10)):
    arrivee = timezone.localdate() + timedelta(days=dans_jours)
    return SimpleNamespace(check_in=arrivee, check_out=arrivee + timedelta(days=nuits),
                           created_at=timezone.now() - reservee_il_y_a,
                           hebergement=SimpleNamespace(politique_annulation=politique))


M = tarifs.calculer(20000, 3)  # 60 000 + 3 600 de frais ; commission 4 800


@pytest.mark.parametrize('politique, jours, rembourse, retenu', [
    # Souple : intégral jusqu'à 24 h, puis la première nuit est retenue (frais conservés)
    ('souple', 2, 63600, 0), ('souple', 0, 40000, 20000),
    # Modérée : intégral jusqu'à 5 jours, 50 % jusqu'à 24 h, rien ensuite
    ('moderee', 6, 63600, 0), ('moderee', 3, 30000, 30000), ('moderee', 0, 0, 60000),
    # Ferme : intégral jusqu'à 30 jours, 50 % jusqu'à 7 jours, rien ensuite
    ('ferme', 31, 63600, 0), ('ferme', 10, 30000, 30000), ('ferme', 5, 0, 60000),
])
def test_bareme_selon_la_politique(politique, jours, rembourse, retenu):
    a = tarifs.bareme_voyageur(M, _resa(jours, politique=politique))
    assert (a.rembourse_voyageur, a.nuits_retenues) == (rembourse, retenu)


def test_commission_au_taux_de_la_reservation():
    hotel = tarifs.calculer(20000, 3, commission=tarifs.COMMISSION_HOTEL)
    a = tarifs.bareme_voyageur(hotel, _resa(3))
    assert (a.nuits_retenues, a.commission_hote, a.montant_hote) == (30000, 3600, 26400)


def test_delai_de_reflexion_de_48_heures():
    # Réservée hier, arrivée dans 10 jours : même en politique Ferme, tout est remboursé
    assert tarifs.bareme_voyageur(M, _resa(10, politique='ferme', reservee_il_y_a=timedelta(days=1))).rembourse_voyageur == 63600
    # Arrivée dans moins de 7 jours : le délai de réflexion ne s'applique pas
    assert tarifs.bareme_voyageur(M, _resa(5, politique='ferme', reservee_il_y_a=timedelta(hours=2))).rembourse_voyageur == 0


def test_long_sejour_premier_mois_retenu():
    m = tarifs.calculer(10000, 60)  # 600 000 + 36 000 de frais
    assert tarifs.bareme_voyageur(m, _resa(31, nuits=60, politique='souple')).rembourse_voyageur == 636000
    a = tarifs.bareme_voyageur(m, _resa(20, nuits=60, politique='souple'))
    assert (a.nuits_retenues, a.rembourse_voyageur) == (300000, 300000)


def test_taux_commission_selon_les_conditions(monkeypatch):
    jour = timezone.localdate()
    conditions = SimpleNamespace(categorie='particulier', fondateur_debut=jour - timedelta(days=1),
                                 fondateur_fin=jour + timedelta(days=1))
    conditions.fondateur_le = lambda j: conditions.fondateur_debut <= j <= conditions.fondateur_fin
    monkeypatch.setattr(tarifs, 'conditions', lambda hote: conditions)
    assert tarifs.taux_commission(object()) == Decimal('0.05')
    assert tarifs.taux_commission(object(), jour + timedelta(days=2)) == Decimal('0.08')
    conditions.categorie = 'hotel'
    assert tarifs.taux_commission(object()) == Decimal('0.12')
    monkeypatch.setattr(tarifs, 'conditions', lambda hote: None)
    assert tarifs.taux_commission(object()) == Decimal('0.08')


def test_conversion_euros_parite_fixe():
    assert str(paypal.en_euros(64800)) == '98.79'
    assert str(paypal.en_euros(655957)) == '1000.00'
