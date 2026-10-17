from datetime import datetime

from apps.transferts import tarifs


def test_prix_de_jour_sans_majoration():
    p = tarifs.calculer(10000, datetime(2026, 11, 2, 14, 30))
    assert (p.prix, p.nuit) == (10000, False)
    assert (p.commission, p.montant_chauffeur) == (2000, 8000)


def test_majoration_de_nuit_arrondie_a_500():
    assert tarifs.calculer(10000, datetime(2026, 11, 2, 23, 15)).prix == 12500
    assert tarifs.calculer(15000, datetime(2026, 11, 2, 5, 59)).prix == 19000  # 18 750 → 19 000
    assert tarifs.calculer(15000, datetime(2026, 11, 2, 6, 0)).nuit is False
    assert tarifs.calculer(15000, datetime(2026, 11, 2, 22, 0)).nuit is True


def test_capacite_des_vehicules():
    assert tarifs.capacite_suffisante('berline', 3, 3) is None
    assert tarifs.capacite_suffisante('berline', 4, 1) == '3 passagers maximum'
    assert tarifs.capacite_suffisante('confort', 2, 5) == '4 bagages maximum'
    assert tarifs.capacite_suffisante('van', 7, 8) is None
