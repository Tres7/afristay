"""Location de voitures (PostgreSQL). FedaPay est simulé : aucun appel réseau."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

import pytest
from django.core import mail
from django.utils import timezone

from apps.locations import services
from apps.locations.models import (
    CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel, PartenaireLocationModel,
    VersementPartenaireModel,
)
from apps.paiements import fedapay
from apps.paiements import services as paiements
from apps.paiements.models import RemboursementModel

LOCATIONS = '/api/v1/locations/'
FEDAPAY_TEST = {'SECRET_KEY': 'sk_sandbox_test', 'ENV': 'sandbox', 'WEBHOOK_SECRET': '', 'EXPIRATION_MINUTES': 30}


class FauxFedaPay:
    def __init__(self):
        self.statut = 'pending'
        self.payouts = []

    def creer_transaction(self, **kwargs):
        self.transaction = kwargs
        return '888', 'https://sandbox-process.fedapay.com/888'

    def lire_transaction(self, identifiant):
        return {'id': identifiant, 'status': self.statut, 'mode': 'momo_test'}

    def creer_versement(self, **kwargs):
        self.payouts.append(kwargs)
        return f'P{len(self.payouts)}'

    def lire_versement(self, identifiant):
        return {'id': identifiant, 'status': 'sent'}


@pytest.fixture
def faux(settings, monkeypatch):
    settings.FEDAPAY = FEDAPAY_TEST
    settings.PAYPAL = {'CLIENT_ID': '', 'CLIENT_SECRET': '', 'ENV': 'sandbox'}
    settings.PAIEMENTS_PAUSE_EMAIL = 0
    f = FauxFedaPay()
    monkeypatch.setattr(fedapay, 'client', mock.Mock(return_value=f))
    return f


@pytest.fixture
def catalogue():
    """Paramétrage par l'administration : règles, une catégorie avec ses prix, deux lieux."""
    ParametresLocationModel.objects.create(
        commission_pourcent=Decimal('15'), delai_min_jours=2, duree_max_jours=30, annulation_gratuite_heures=48,
        conditions='21 ans minimum, permis depuis 2 ans.',
    )
    berline = CategorieVehiculeModel.objects.get(nom='Berline')  # créée sans prix par la migration
    berline.prix_jour_sans_chauffeur, berline.prix_jour_avec_chauffeur, berline.caution = 30000, 45000, 100000
    berline.actif = True
    berline.save()
    aeroport = LieuRemiseModel.objects.create(nom='Aéroport de Lomé', ville='Lomé', fuseau='Africa/Lome', frais=5000)
    livraison = LieuRemiseModel.objects.create(nom='Livraison à votre adresse, Lomé', ville='Lomé', fuseau='Africa/Lome',
                                               adresse_requise=True, frais=3000)
    return {'berline': berline, 'aeroport': aeroport, 'livraison': livraison}


@pytest.fixture
def loueur(catalogue):
    p = PartenaireLocationModel.objects.create(
        nom='Lomé Auto Location', contact='Yao Mensah', telephone='+228 90 44 55 66', email='yao@test.afristay',
        pays_versement='TG', operateur_versement='togocel', numero_versement='90445566',
    )
    p.categories.add(catalogue['berline'])
    p.lieux.add(catalogue['aeroport'])
    return p


def _date(jours=5, heure='10:00'):
    return f"{(timezone.localdate() + timedelta(days=jours)).isoformat()}T{heure}"


def _demande(catalogue, **champs):
    return {
        'categorie': catalogue['berline'].id, 'formule': 'avec_chauffeur', 'lieu_prise': catalogue['aeroport'].id,
        'lieu_retour': catalogue['aeroport'].id, 'debut': _date(5, '10:00'), 'fin': _date(8, '12:00'), 'passagers': 3,
        'telephone': '+33 6 12 34 56 78', 'precisions': 'Trajets Lomé - Kpalimé, un siège enfant pour 2 ans.', **champs,
    }


def _reserver_et_payer(client, faux, catalogue, **champs):
    r = client.post(LOCATIONS, _demande(catalogue, **champs), format='json')
    assert r.status_code == 201, r.data
    lid = r.data['id']
    assert client.post(f'{LOCATIONS}{lid}/payer/', {'moyen': 'mobile_money'}, format='json').status_code == 200
    faux.statut = 'approved'
    assert client.get(f'{LOCATIONS}{lid}/').data['statut'] == 'confirmee'
    return LocationModel.objects.get(pk=lid)


class TestCatalogue:
    def test_nothing_offered_until_the_admin_sets_it_up(self, api_client):
        # Catégories standard créées par la migration, mais sans prix et inactives
        assert CategorieVehiculeModel.objects.filter(gamme='suv').exists()
        assert api_client.get(f'{LOCATIONS}catalogue/').data == {'active': False}

    def test_only_priced_active_categories_are_offered(self, api_client, catalogue):
        data = api_client.get(f'{LOCATIONS}catalogue/').data
        assert data['active'] is True
        assert [c['nom'] for c in data['categories']] == ['Berline']
        assert data['categories'][0]['prix_jour'] == {'sans_chauffeur': 30000, 'avec_chauffeur': 45000}
        assert {g['code'] for g in data['filtres']['gammes']} >= {'citadine', 'berline', 'suv', '4x4', 'minibus'}
        assert data['regles']['delai_min_jours'] == 2

    def test_quote_counts_started_days_and_place_fees(self, api_client, catalogue):
        q = {'categorie': catalogue['berline'].id, 'formule': 'sans_chauffeur', 'lieu_prise': catalogue['aeroport'].id,
             'lieu_retour': catalogue['livraison'].id, 'debut': _date(5, '10:00'), 'fin': _date(8, '12:00')}
        devis = api_client.get(f'{LOCATIONS}devis/', q).data
        # 3 jours + 2 h entamées = 4 jours ; frais : 5 000 (aéroport) + 3 000 (livraison)
        assert devis == {'jours': 4, 'prix_jour': 30000, 'frais_lieux': 8000, 'prix': 128000, 'caution': 100000}


class TestReservation:
    def test_at_least_two_days_before_pickup(self, client_for, make_user, faux, catalogue):
        r = client_for(make_user()).post(LOCATIONS, _demande(catalogue, debut=_date(1), fin=_date(3)), format='json')
        assert r.status_code == 400 and '2 jours' in r.data['detail']

    def test_customer_must_describe_the_need(self, client_for, make_user, faux, catalogue):
        r = client_for(make_user()).post(LOCATIONS, _demande(catalogue, precisions='voiture'), format='json')
        assert r.status_code == 400 and 'precisions' in r.data

    def test_self_drive_needs_driver_and_licence(self, client_for, make_user, faux, catalogue):
        client = client_for(make_user())
        r = client.post(LOCATIONS, _demande(catalogue, formule='sans_chauffeur'), format='json')
        assert r.status_code == 400 and 'permis' in r.data['detail']
        r = client.post(LOCATIONS, _demande(catalogue, formule='sans_chauffeur', conducteur='Ama Kossi',
                                            permis_numero='TG-123456', permis_pays='Togo'), format='json')
        assert r.status_code == 201 and r.data['caution'] == 100000

    def test_delivery_needs_an_address(self, client_for, make_user, faux, catalogue):
        r = client_for(make_user()).post(LOCATIONS, _demande(catalogue, lieu_prise=catalogue['livraison'].id), format='json')
        assert r.status_code == 400 and 'adresse' in r.data['detail']

    def test_too_many_passengers(self, client_for, make_user, faux, catalogue):
        r = client_for(make_user()).post(LOCATIONS, _demande(catalogue, passagers=9), format='json')
        assert r.status_code == 400

    def test_price_is_computed_by_the_server(self, client_for, make_user, faux, catalogue):
        r = client_for(make_user()).post(LOCATIONS, _demande(catalogue, prix=1, commission=0), format='json')
        # 4 jours × 45 000 + 2 × 5 000 de frais d'aéroport
        assert r.data['prix'] == 190000

    def test_someone_else_s_rental_is_invisible(self, client_for, make_user, faux, catalogue):
        loc = _reserver_et_payer(client_for(make_user()), faux, catalogue)
        autre = client_for(make_user())
        assert autre.get(f'{LOCATIONS}{loc.id}/').status_code == 404
        assert autre.delete(f'{LOCATIONS}{loc.id}/').status_code == 404


def test_full_cycle_payment_partner_payout(client_for, make_user, faux, catalogue, loueur):
    make_user(role='admin', email='admin@test.afristay')
    voyageur = make_user(email='voyageur@test.afristay')
    client = client_for(voyageur)
    loc = _reserver_et_payer(client, faux, catalogue)
    assert faux.transaction['montant'] == 190000
    assert client.get(f'{LOCATIONS}{loc.id}/').data['partenaire'] is None

    paiements.passe()
    sujets = {m.subject for m in mail.outbox}
    assert 'Location confirmée : Lomé' in sujets
    assert any(s.startswith('[Kwa-Ba] Loueur à attribuer') for s in sujets)

    assert list(services.partenaires_disponibles(loc)) == [loueur]
    services.assigner_partenaire(loc, loueur, vehicule='Toyota Corolla blanche', immatriculation='TG-5678-CD',
                                 chauffeur_nom='Kodjo', chauffeur_telephone='+228 91 00 00 00')
    detail = client.get(f'{LOCATIONS}{loc.id}/').data
    assert detail['statut'] == 'partenaire_assigne'
    assert detail['partenaire']['immatriculation'] == 'TG-5678-CD'
    mail.outbox.clear()
    paiements.passe()
    assert {m.to[0] for m in mail.outbox} == {'voyageur@test.afristay', 'yao@test.afristay'}

    v = VersementPartenaireModel.objects.get(location=loc)
    assert (v.montant_brut, v.commission, v.montant) == (190000, 28500, 161500)  # 15 % de commission
    VersementPartenaireModel.objects.filter(pk=v.pk).update(date_prevue=timezone.now() - timedelta(minutes=1))
    paiements.passe()  # envoi
    paiements.passe()  # FedaPay confirme : versé, location terminée
    assert faux.payouts[0]['montant'] == 161500
    loc.refresh_from_db()
    assert loc.statut == 'terminee'


def test_free_cancellation_then_refund_to_the_given_number(client_for, make_user, faux, catalogue, loueur):
    client = client_for(make_user())
    loc = _reserver_et_payer(client, faux, catalogue)
    services.assigner_partenaire(loc, loueur)
    r = client.delete(f'{LOCATIONS}{loc.id}/')
    assert r.data['rembourse'] == loc.prix and r.data['numero_requis'] is True
    assert VersementPartenaireModel.objects.get(location=loc).statut == 'annule'
    url = f'{LOCATIONS}{loc.id}/compte-remboursement/'
    assert client.put(url, {'pays': 'TG', 'operateur': 'moov_tg', 'numero': '96000001'}, format='json').status_code == 200
    paiements.envoyer_remboursements()
    assert faux.payouts[-1]['client']['phone_number'] == {'number': '96000001', 'country': 'tg'}


def test_late_cancellation_keeps_the_partner_paid(client_for, make_user, faux, catalogue, loueur):
    client = client_for(make_user())
    loc = _reserver_et_payer(client, faux, catalogue)
    services.assigner_partenaire(loc, loueur)
    LocationModel.objects.filter(pk=loc.pk).update(debut=timezone.now() + timedelta(hours=20))
    assert client.delete(f'{LOCATIONS}{loc.id}/').data['rembourse'] == 0
    assert not RemboursementModel.objects.filter(location=loc).exists()
    assert VersementPartenaireModel.objects.get(location=loc).statut == 'planifie'


def test_cancellation_by_kwaba_refunds_everything(client_for, make_user, faux, catalogue):
    loc = _reserver_et_payer(client_for(make_user()), faux, catalogue)
    LocationModel.objects.filter(pk=loc.pk).update(debut=timezone.now() + timedelta(hours=20))
    assert services.annuler(LocationModel.objects.get(pk=loc.pk), par='plateforme') == loc.prix


def test_unpaid_rental_expires(client_for, make_user, faux, catalogue):
    r = client_for(make_user()).post(LOCATIONS, _demande(catalogue), format='json')
    LocationModel.objects.filter(pk=r.data['id']).update(expire_le=timezone.now() - timedelta(minutes=1))
    assert services.expirer() == 1
    loc = LocationModel.objects.get(pk=r.data['id'])
    assert (loc.statut, loc.annulee_par) == ('annulee', 'expiration')
