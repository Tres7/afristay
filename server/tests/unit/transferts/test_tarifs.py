from apps.transferts import tarifs


def test_prix_et_commission():
    p = tarifs.calculer(10000)
    assert p.prix == 10000
    assert (p.commission, p.montant_chauffeur) == (1500, 8500)  # 15 % (grille du 18 octobre 2026)


def test_aucune_majoration_de_nuit():
    # Supprimée par décision des fondateurs (audit n° 3) : plus de variable ni de calcul de nuit
    assert not any('nuit' in nom.lower() for nom in vars(tarifs))
    assert tarifs.calculer(15000).prix == 15000


def test_capacite_des_vehicules():
    assert tarifs.capacite_suffisante('berline', 3, 3) is None
    assert tarifs.capacite_suffisante('berline', 4, 1) == '3 passagers maximum'
    assert tarifs.capacite_suffisante('confort', 2, 5) == '4 bagages maximum'
    assert tarifs.capacite_suffisante('van', 7, 8) is None
