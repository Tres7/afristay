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
        assert devis == {'jours': 4, 'prix_jour': 30000, 'frais_lieux': 8000, 'prix': 128000, 'caution': 100000,
                         'caution_en_ligne': True, 'a_payer': 228000}  # caution payée avec la location


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
    assert client.get(f'{LOCATIONS}{loc.id}/').data['vehicule_attribue'] is None

    paiements.passe()
    sujets = {m.subject for m in mail.outbox}
    assert 'Location confirmée : Lomé' in sujets
    assert any(s.startswith('[Kwa-Ba] Loueur à attribuer') for s in sujets)

    assert list(services.partenaires_disponibles(loc)) == [loueur]
    services.assigner_partenaire(loc, loueur, vehicule='Toyota Corolla blanche', immatriculation='TG-5678-CD',
                                 chauffeur_nom='Kodjo', chauffeur_telephone='+228 91 00 00 00')
    detail = client.get(f'{LOCATIONS}{loc.id}/').data
    assert detail['statut'] == 'partenaire_assigne'
    # Le site montre le véhicule, jamais le loueur ni son chauffeur
    assert detail['vehicule_attribue'] == {'vehicule': 'Toyota Corolla blanche', 'immatriculation': 'TG-5678-CD'}
    assert not any(x in str(detail) for x in ('Lomé Auto Location', 'Yao', '90 44 55 66', 'Kodjo', '91 00 00 00'))
    mail.outbox.clear()
    paiements.passe()
    emails = {m.to[0]: m.body for m in mail.outbox}
    assert set(emails) == {'voyageur@test.afristay', 'yao@test.afristay'}
    # Coordonnées du loueur et du chauffeur : par email au voyageur, après le paiement
    assert '+228 90 44 55 66' in emails['voyageur@test.afristay'] and '+228 91 00 00 00' in emails['voyageur@test.afristay']
    # Le loueur n'a pas le téléphone du voyageur : il passe par Kwa-Ba
    assert '12 34 56 78' not in emails['yao@test.afristay'] and 'siège enfant' in emails['yao@test.afristay']

    v = VersementPartenaireModel.objects.get(location=loc)
    assert (v.montant_brut, v.commission, v.montant) == (190000, 28500, 161500)  # 15 % de commission
    VersementPartenaireModel.objects.filter(pk=v.pk).update(date_prevue=timezone.now() - timedelta(minutes=1))
    paiements.passe()  # envoi
    paiements.passe()  # FedaPay confirme : versé, location terminée
    assert faux.payouts[0]['montant'] == 161500
    loc.refresh_from_db()
    assert loc.statut == 'terminee'


def test_contacts_in_free_text_are_masked_for_the_partner(client_for, make_user, faux, catalogue, loueur):
    client = client_for(make_user())
    loc = _reserver_et_payer(client, faux, catalogue, lieu_prise=catalogue['livraison'].id,
                             adresse_prise='Bè Kpota, appelez le 90 11 22 33',
                             precisions='Siège enfant svp, écrivez-moi sur ama.k@gmail.com ou au 99 88 77 66.')
    services.assigner_partenaire(loc, loueur)
    mail.outbox.clear()
    paiements.passe()
    au_loueur = next(m.body for m in mail.outbox if m.to == ['yao@test.afristay'])
    assert 'Bè Kpota' in au_loueur and 'Siège enfant' in au_loueur
    assert not any(x in au_loueur for x in ('90 11 22 33', '99 88 77 66', 'ama.k@gmail.com'))


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


# --- Caution payée en ligne et gardée par Kwa-Ba ---------------------------------------------------------------

SANS_CHAUFFEUR = {'formule': 'sans_chauffeur', 'conducteur': 'Ama Kossi', 'permis_numero': 'TG-123456', 'permis_pays': 'Togo'}


def _vehicule_rendu(loc, heures=25):
    """Le véhicule a été pris il y a 3 jours et rendu il y a `heures` heures."""
    maintenant = timezone.now()
    LocationModel.objects.filter(pk=loc.pk).update(debut=maintenant - timedelta(days=3), fin=maintenant - timedelta(hours=heures))
    VersementPartenaireModel.objects.filter(location=loc).update(date_prevue=maintenant - timedelta(minutes=1))
    loc.refresh_from_db()
    return loc


def test_deposit_paid_online_then_refunded_minus_damages(client_for, make_user, faux, catalogue, loueur):
    client = client_for(make_user(email='ama@test.afristay'))
    loc = _reserver_et_payer(client, faux, catalogue, **SANS_CHAUFFEUR)
    # 4 jours × 30 000 + 2 × 5 000 de frais, plus 100 000 de caution payés avec la location
    assert (loc.prix, loc.caution, loc.caution_en_ligne) == (130000, 100000, True)
    assert faux.transaction['montant'] == 230000
    detail = client.get(f'{LOCATIONS}{loc.id}/').data
    assert detail['a_payer'] == 230000 and detail['caution_etat']['restituee'] is False

    services.assigner_partenaire(loc, loueur, vehicule='Toyota Yaris grise')
    mail.outbox.clear()
    paiements.passe()
    au_loueur = next(m.body for m in mail.outbox if m.to == ['yao@test.afristay'])
    assert 'ne lui demandez rien' in au_loueur and 'Signalez-le à Kwa-Ba dans les 24 heures' in au_loueur

    loc = _vehicule_rendu(loc, heures=2)
    services.retenir_caution(loc, 30000, 'Rétroviseur cassé')
    v = VersementPartenaireModel.objects.get(location=loc)
    assert (v.montant_brut, v.commission, v.montant) == (160000, 19500, 140500)  # la retenue s'ajoute, sans commission
    paiements.passe()
    loc.refresh_from_db()
    assert loc.caution_restituee_le is None and faux.payouts == []  # délai de signalement pas écoulé : rien ne part

    loc = _vehicule_rendu(loc, heures=25)
    mail.outbox.clear()
    paiements.passe()
    loc.refresh_from_db()
    assert loc.caution_restituee_le is not None
    rb = RemboursementModel.objects.get(location=loc)
    assert (rb.montant, rb.motif, rb.statut) == (70000, 'Restitution de la caution', 'attente_numero')
    au_voyageur = next(m for m in mail.outbox if m.to == ['ama@test.afristay'] and 'caution' in m.subject)
    assert '70 000' in au_voyageur.body and 'Rétroviseur cassé' in au_voyageur.body and 'numéro Mobile Money' in au_voyageur.body
    assert [p['montant'] for p in faux.payouts] == [140500]  # loueur payé avec la retenue
    with pytest.raises(services.LocationErreur):
        services.retenir_caution(loc, 10000, 'Trop tard')


def test_deposit_retention_rules(client_for, make_user, faux, catalogue, loueur):
    loc = _reserver_et_payer(client_for(make_user()), faux, catalogue, **SANS_CHAUFFEUR)
    services.assigner_partenaire(loc, loueur)
    with pytest.raises(services.LocationErreur, match='pas encore été remis'):
        services.retenir_caution(loc, 10000, 'Rayure')
    loc = _vehicule_rendu(loc, heures=2)
    with pytest.raises(services.LocationErreur, match='entre 0 et la caution'):
        services.retenir_caution(loc, 100001, 'Trop')
    with pytest.raises(services.LocationErreur, match='motif'):
        services.retenir_caution(loc, 10000, '  ')
    services.retenir_caution(loc, 10000, 'Rayure')
    services.retenir_caution(loc, 0, '')  # annule la retenue
    loc.refresh_from_db()
    assert (loc.caution_retenue, loc.caution_motif) == (0, '')
    assert VersementPartenaireModel.objects.get(location=loc).montant == loc.montant_partenaire


def test_back_office_records_a_retention(client_for, make_user, faux, catalogue, loueur):
    loc = _reserver_et_payer(client_for(make_user()), faux, catalogue, **SANS_CHAUFFEUR)
    services.assigner_partenaire(loc, loueur)
    loc = _vehicule_rendu(loc, heures=2)
    admin = client_for(make_user(role='admin'))
    url = f'/api/v1/admin/location/locations/{loc.id}/caution/'
    assert client_for(make_user()).post(url, {'montant': 5000, 'motif': 'Plein non fait'}, format='json').status_code == 403
    r = admin.post(url, {'montant': 5000, 'motif': 'Plein non fait'}, format='json')
    assert r.status_code == 200 and (r.data['caution_retenue'], r.data['caution_motif']) == (5000, 'Plein non fait')
    assert admin.post(url, {'montant': 200000, 'motif': 'Trop'}, format='json').status_code == 400


def test_cancelled_rental_always_refunds_the_deposit(client_for, make_user, faux, catalogue, loueur):
    client = client_for(make_user())
    loc = _reserver_et_payer(client, faux, catalogue, **SANS_CHAUFFEUR)
    services.assigner_partenaire(loc, loueur)
    LocationModel.objects.filter(pk=loc.pk).update(debut=timezone.now() + timedelta(hours=20))
    # Hors délai d'annulation gratuite : la location n'est pas remboursée, la caution si
    assert client.delete(f'{LOCATIONS}{loc.id}/').data['rembourse'] == 100000
    assert VersementPartenaireModel.objects.get(location=loc).statut == 'planifie'


def test_deposit_paid_to_the_partner_when_online_deposit_is_off(client_for, make_user, faux, catalogue, loueur):
    ParametresLocationModel.objects.filter(pk=1).update(caution_en_ligne=False)
    client = client_for(make_user())
    loc = _reserver_et_payer(client, faux, catalogue, **SANS_CHAUFFEUR)
    assert faux.transaction['montant'] == 130000 and loc.caution_en_ligne is False
    assert client.get(f'{LOCATIONS}{loc.id}/').data['caution_etat'] is None
    services.assigner_partenaire(loc, loueur)
    mail.outbox.clear()
    paiements.passe()
    au_loueur = next(m.body for m in mail.outbox if m.to == ['yao@test.afristay'])
    assert 'Caution à encaisser à la remise : 100 000' in au_loueur
