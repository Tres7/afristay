"""Grille tarifaire du 18 octobre 2026 : frais voyageur, Client fidèle, commission selon l'hôte, réglage dans le back-office."""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.paiements import tarifs
from apps.paiements.models import ConditionsHoteModel
from apps.reservations.models import ReservationModel

ADMIN_USERS = '/api/v1/admin/users/'


@pytest.fixture(autouse=True)
def sans_paiement_en_ligne(settings):
    # Confirmation directe : les montants sont calculés à la création
    settings.FEDAPAY = {**settings.FEDAPAY, 'SECRET_KEY': ''}
    settings.PAYPAL = {**settings.PAYPAL, 'CLIENT_ID': '', 'CLIENT_SECRET': ''}


def _reserver(client, hebergement, dans=20, nuits=2):
    debut = timezone.localdate() + timedelta(days=dans)
    r = client.post('/api/v1/reservations/', {'hebergement': str(hebergement.id), 'check_in': debut.isoformat(),
                                               'check_out': (debut + timedelta(days=nuits)).isoformat(), 'guests_count': 1})
    assert r.status_code == 201, r.data
    return ReservationModel.objects.get(pk=r.data['id'])


def test_particulier_hotel_et_fondateur(client_for, make_user, make_hebergement):
    voyageur = client_for(make_user())
    particulier = make_hebergement(price_per_night=25000)
    resa = _reserver(voyageur, particulier)
    assert (resa.prix_nuits, resa.frais_service, resa.commission_hote) == (50000, 3000, 4000)

    hotel = make_hebergement(price_per_night=25000)
    ConditionsHoteModel.objects.create(hote=hotel.host, categorie='hotel')
    assert _reserver(voyageur, hotel).commission_hote == 6000

    fondateur = make_hebergement(price_per_night=25000)
    jour = timezone.localdate()
    ConditionsHoteModel.objects.create(hote=fondateur.host, fondateur_debut=jour, fondateur_fin=jour + timedelta(days=180))
    assert _reserver(voyageur, fondateur).commission_hote == 2500


def test_client_fidele_paie_3_pour_cent(client_for, make_user, make_hebergement, make_reservation):
    guest = make_user()
    logement = make_hebergement(price_per_night=25000)
    autre_logement_du_meme_hote = make_hebergement(host=logement.host, price_per_night=25000)
    client = client_for(guest)
    assert client.get(f'/api/v1/hebergements/{logement.id}/').data['frais_voyageur'] == 0.06

    make_reservation(logement, guest=guest, starts_in=-10, nights=2)  # séjour terminé chez cet hôte
    assert client.get(f'/api/v1/hebergements/{autre_logement_du_meme_hote.id}/').data['frais_voyageur'] == 0.03
    resa = _reserver(client, autre_logement_du_meme_hote)
    assert resa.frais_service == 1500  # 3 % de 50 000
    assert client.get(f'/api/v1/reservations/{resa.id}/').data['montants']['taux_frais'] == 3
    # Un autre hôte : tarif normal
    assert _reserver(client, make_hebergement(price_per_night=25000)).frais_service == 3000


def test_annulation_selon_la_politique_de_l_annonce(client_for, make_user, make_hebergement):
    client = client_for(make_user())
    ferme = make_hebergement(price_per_night=25000, politique_annulation='ferme')
    resa = _reserver(client, ferme, dans=10)
    # Réservée il y a 3 jours : plus de délai de réflexion ; Ferme à 10 jours : 50 % des nuits, frais conservés
    ReservationModel.objects.filter(pk=resa.pk).update(created_at=timezone.now() - timedelta(days=3))
    resa.refresh_from_db()
    bareme = tarifs.bareme_voyageur(tarifs.montants_de(resa), resa)
    assert (bareme.rembourse_voyageur, bareme.nuits_retenues) == (25000, 25000)


def test_back_office_regle_les_conditions_de_l_hote(client_for, make_user):
    admin = client_for(make_user(role='admin'))
    hote = make_user(role='hote')
    ligne = admin.get(ADMIN_USERS, {'q': hote.email}).data['results'][0]
    assert ligne['conditions'] == {'categorie': 'particulier', 'fondateur_debut': None, 'fondateur_fin': None, 'commission_pourcent': 8.0}

    jour = timezone.localdate()
    r = admin.patch(f'{ADMIN_USERS}{hote.id}/', {'conditions': {'categorie': 'particulier', 'fondateur_debut': jour.isoformat(),
                                                                'fondateur_fin': (jour + timedelta(days=180)).isoformat()}}, format='json')
    assert r.status_code == 200, r.data
    assert r.data['conditions']['commission_pourcent'] == 5.0

    r = admin.patch(f'{ADMIN_USERS}{hote.id}/', {'conditions': {'categorie': 'hotel', 'fondateur_debut': jour.isoformat(),
                                                                'fondateur_fin': (jour + timedelta(days=1)).isoformat()}}, format='json')
    assert r.status_code == 400  # le Programme Fondateurs concerne les hôtes particuliers
    r = admin.patch(f'{ADMIN_USERS}{hote.id}/', {'conditions': {'categorie': 'hotel'}}, format='json')
    assert r.data['conditions']['commission_pourcent'] == 12.0

    voyageur = make_user()
    assert admin.patch(f'{ADMIN_USERS}{voyageur.id}/', {'conditions': {'categorie': 'hotel'}}, format='json').status_code == 400
