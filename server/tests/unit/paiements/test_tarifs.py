from datetime import timedelta
from types import SimpleNamespace

from django.utils import timezone

from apps.paiements import paypal, tarifs


def test_montants_trois_nuits():
    m = tarifs.calculer(20000, 3)
    assert (m.prix_nuits, m.frais_service, m.commission_hote) == (60000, 4800, 3000)
    assert m.total == 64800
    assert m.montant_hote == 57000


def test_arrondi_au_franc():
    m = tarifs.calculer('12345.00', 1)
    assert (m.frais_service, m.commission_hote) == (988, 617)


def _resa(dans_jours):
    return SimpleNamespace(check_in=timezone.localdate() + timedelta(days=dans_jours))


def test_bareme_plus_de_7_jours_tout_rembourse():
    m = tarifs.calculer(20000, 3)
    assert tarifs.bareme_voyageur(m, _resa(10)).rembourse_voyageur == 64800


def test_bareme_entre_7_jours_et_48_heures():
    a = tarifs.bareme_voyageur(tarifs.calculer(20000, 3), _resa(4))
    assert (a.rembourse_voyageur, a.nuits_retenues, a.montant_hote) == (34800, 30000, 28500)


def test_bareme_moins_de_48_heures():
    a = tarifs.bareme_voyageur(tarifs.calculer(20000, 3), _resa(1))
    assert (a.rembourse_voyageur, a.montant_hote) == (0, 57000)


def test_conversion_euros_parite_fixe():
    assert str(paypal.en_euros(64800)) == '98.79'
    assert str(paypal.en_euros(655957)) == '1000.00'
