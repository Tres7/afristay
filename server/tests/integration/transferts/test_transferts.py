"""Cycle d'un transfert aéroport (PostgreSQL). FedaPay est simulé : aucun appel réseau."""
from datetime import UTC, timedelta
from unittest import mock

import pytest
from django.core import mail
from django.utils import timezone

from apps.paiements import fedapay
from apps.paiements import services as paiements
from apps.paiements.models import PaiementModel, RemboursementModel
from apps.transferts import services
from apps.transferts.models import AeroportModel, ChauffeurModel, TransfertModel, VersementChauffeurModel

TRANSFERTS = '/api/v1/transferts/'
FEDAPAY_TEST = {'SECRET_KEY': 'sk_sandbox_test', 'ENV': 'sandbox', 'WEBHOOK_SECRET': '', 'EXPIRATION_MINUTES': 30}


class FauxFedaPay:
    def __init__(self):
        self.statut = 'pending'
        self.payouts = []

    def creer_transaction(self, **kwargs):
        self.transaction = kwargs
        return '777', 'https://sandbox-process.fedapay.com/777'

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
def chauffeur():
    c = ChauffeurModel.objects.create(
        prenom='Komi', nom='Ablodé', telephone='+228 90 11 22 33', email='komi@test.afristay', categorie='confort',
        vehicule='Toyota RAV4 grise', immatriculation='TG-1234-AB',
        pays_versement='TG', operateur_versement='togocel', numero_versement='90112233',
    )
    c.aeroports.add('LFW')
    return c


def _arrivee(dans_heures=72, heure='14:30'):
    jour = (timezone.localtime() + timedelta(hours=dans_heures)).date()
    return f'{jour.isoformat()}T{heure}'


def _payload(**champs):
    return {
        'aeroport': 'LFW', 'arrivee': _arrivee(), 'numero_vol': 'AF 520', 'passagers': 2, 'bagages': 3,
        'categorie': 'berline', 'destination': 'Villa test, Lomé', 'telephone': '+33 6 12 34 56 78', **champs,
    }


def _reserver_et_payer(client, faux, **champs):
    r = client.post(TRANSFERTS, _payload(**champs), format='json')
    assert r.status_code == 201, r.data
    tid = r.data['id']
    assert client.post(f'{TRANSFERTS}{tid}/payer/', {'moyen': 'mobile_money'}, format='json').status_code == 200
    faux.statut = 'approved'
    assert client.get(f'{TRANSFERTS}{tid}/').data['statut'] == 'confirme'
    return TransfertModel.objects.get(pk=tid)


def test_aeroports_de_lancement_et_devis():
    from rest_framework.test import APIClient
    api = APIClient()
    codes = {a['code'] for a in api.get(f'{TRANSFERTS}aeroports/').data}
    assert {'LFW', 'COO', 'OUA', 'NIM', 'BKO'} <= codes

    jour = api.get(f'{TRANSFERTS}devis/', {'aeroport': 'LFW', 'arrivee': _arrivee(), 'passagers': 4, 'bagages': 2}).data
    prix = {o['categorie']: (o['prix'], o['disponible']) for o in jour['options']}
    assert prix == {'berline': (10000, False), 'confort': (15000, True), 'van': (25000, True)}

    nuit = api.get(f'{TRANSFERTS}devis/', {'aeroport': 'LFW', 'arrivee': _arrivee(heure='23:40')}).data
    assert nuit['options'][0]['prix'] == 12500 and nuit['options'][0]['nuit'] is True


def test_heure_saisie_dans_le_fuseau_de_l_aeroport(client_for, make_user, faux):
    client = client_for(make_user())
    r = client.post(TRANSFERTS, _payload(aeroport='COO', arrivee=_arrivee(heure='14:30')), format='json')
    assert r.status_code == 201, r.data
    assert r.data['arrivee_locale'].endswith('T14:30')
    t = TransfertModel.objects.get(pk=r.data['id'])
    assert t.arrivee.astimezone(UTC).hour == 13  # Cotonou = UTC+1


def test_regles_de_creation(client_for, make_user, faux):
    client = client_for(make_user())
    dans_2h = timezone.localtime() + timedelta(hours=2)  # Lomé est à UTC+0, comme le serveur
    trop_tot = client.post(TRANSFERTS, _payload(arrivee=dans_2h.strftime('%Y-%m-%dT%H:%M')), format='json')
    assert trop_tot.status_code == 400 and '6 heures' in trop_tot.data['detail']
    trop_grand = client.post(TRANSFERTS, _payload(passagers=5), format='json')
    assert trop_grand.status_code == 400 and '3 passagers maximum' in trop_grand.data['detail']
    vol = client.post(TRANSFERTS, _payload(numero_vol='???'), format='json')
    assert 'numero_vol' in vol.data


def test_sans_paiement_en_ligne_confirme_directement(client_for, make_user, settings):
    settings.FEDAPAY = {**FEDAPAY_TEST, 'SECRET_KEY': ''}
    settings.PAYPAL = {'CLIENT_ID': '', 'CLIENT_SECRET': '', 'ENV': 'sandbox'}
    r = client_for(make_user()).post(TRANSFERTS, _payload(), format='json')
    assert r.data['statut'] == 'confirme'


def test_cycle_complet_paiement_attribution_versement(client_for, make_user, faux, chauffeur, settings):
    make_user(role='admin', email='admin@test.afristay')
    voyageur = make_user(email='voyageur@test.afristay')
    client = client_for(voyageur)
    t = _reserver_et_payer(client, faux, categorie='berline')
    assert faux.transaction['montant'] == 10000
    assert client.get(f'{TRANSFERTS}{t.id}/').data['chauffeur'] is None  # pas encore attribué

    paiements.passe()
    sujets = {m.subject for m in mail.outbox}
    assert 'Transfert confirmé — Lomé' in sujets
    assert any(s.startswith('[Kwa-Ba] Chauffeur à attribuer') for s in sujets)

    # Un SUV convient pour une berline demandée ; il est proposé dans l'admin
    assert chauffeur in services.chauffeurs_disponibles(t)
    services.assigner_chauffeur(t, chauffeur)
    detail = client.get(f'{TRANSFERTS}{t.id}/').data
    assert detail['statut'] == 'chauffeur_assigne'
    assert detail['chauffeur']['telephone'] == '+228 90 11 22 33'
    mail.outbox.clear()
    paiements.passe()
    assert {m.to[0] for m in mail.outbox} == {'voyageur@test.afristay', 'komi@test.afristay'}

    v = VersementChauffeurModel.objects.get(transfert=t)
    assert (v.montant, v.commission) == (8000, 2000)
    VersementChauffeurModel.objects.filter(pk=v.pk).update(date_prevue=timezone.now() - timedelta(minutes=1))
    paiements.passe()  # envoi
    paiements.passe()  # FedaPay confirme : versé, course terminée
    assert faux.payouts[0]['mode'] == 'togocel' and faux.payouts[0]['montant'] == 8000
    t.refresh_from_db()
    assert t.statut == 'termine'


def test_annulation_gratuite_plus_de_24h(client_for, make_user, faux, chauffeur):
    client = client_for(make_user())
    t = _reserver_et_payer(client, faux)
    services.assigner_chauffeur(t, chauffeur)
    r = client.delete(f'{TRANSFERTS}{t.id}/')
    assert r.data['rembourse'] == 10000 and r.data['numero_requis'] is True
    assert VersementChauffeurModel.objects.get(transfert=t).statut == 'annule'

    url = f'{TRANSFERTS}{t.id}/compte-remboursement/'
    assert client.put(url, {'pays': 'TG', 'operateur': 'moov_tg', 'numero': '96000001'}, format='json').status_code == 200
    paiements.envoyer_remboursements()
    assert faux.payouts[-1]['client']['phone_number'] == {'number': '96000001', 'country': 'tg'}


def test_annulation_moins_de_24h_pas_de_remboursement(client_for, make_user, faux, chauffeur):
    client = client_for(make_user())
    t = _reserver_et_payer(client, faux, arrivee=_arrivee(dans_heures=12, heure=(timezone.localtime() + timedelta(hours=12)).strftime('%H:%M')))
    services.assigner_chauffeur(t, chauffeur)
    r = client.delete(f'{TRANSFERTS}{t.id}/')
    assert r.data['rembourse'] == 0
    assert not RemboursementModel.objects.filter(transfert=t).exists()
    assert VersementChauffeurModel.objects.get(transfert=t).statut == 'planifie'  # le chauffeur reste payé


def test_annulation_par_afristay_rembourse_tout(client_for, make_user, faux):
    client = client_for(make_user())
    t = _reserver_et_payer(client, faux, arrivee=_arrivee(dans_heures=12, heure=(timezone.localtime() + timedelta(hours=12)).strftime('%H:%M')))
    assert services.annuler(t, par='plateforme') == t.prix  # remboursement intégral, majoration de nuit comprise


def test_expiration_sans_paiement(client_for, make_user, faux):
    client = client_for(make_user())
    r = client.post(TRANSFERTS, _payload(), format='json')
    TransfertModel.objects.filter(pk=r.data['id']).update(expire_le=timezone.now() - timedelta(minutes=1))
    assert services.expirer() == 1
    t = TransfertModel.objects.get(pk=r.data['id'])
    assert (t.statut, t.annule_par) == ('annule', 'expiration')


def test_transfert_d_un_autre_voyageur_invisible(client_for, make_user, faux):
    t = _reserver_et_payer(client_for(make_user()), faux)
    autre = client_for(make_user())
    assert autre.get(f'{TRANSFERTS}{t.id}/').status_code == 404
    assert autre.delete(f'{TRANSFERTS}{t.id}/').status_code == 404


def test_paiement_de_transfert_lie_au_transfert():
    p = PaiementModel._meta.constraints[0]
    assert p.name == 'paiement_reservation_ou_transfert'
    assert AeroportModel.objects.get(pk='LFW').tarifs.count() == 3
