"""Tests du module de paiement. FedaPay est simulé : aucun appel réseau.

    python manage.py test apps.paiements
"""
import hashlib
import hmac
import json
import time
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.hebergements.disponibilites import conflit
from apps.hebergements.models import HebergementModel
from apps.reservations.models import ReservationModel

from . import fedapay, paypal, services, tarifs
from .models import PaiementModel, ProfilVersementModel, RemboursementModel, VersementModel

FEDAPAY_TEST = {'SECRET_KEY': 'sk_sandbox_test', 'ENV': 'sandbox', 'WEBHOOK_SECRET': 'whsec_test', 'EXPIRATION_MINUTES': 30}
PAYPAL_TEST = {'CLIENT_ID': 'id', 'CLIENT_SECRET': 'secret', 'ENV': 'sandbox'}


class TarifsTests(TestCase):
    def test_montants(self):
        m = tarifs.calculer(20000, 3)
        self.assertEqual((m.prix_nuits, m.frais_service, m.commission_hote), (60000, 4800, 3000))
        self.assertEqual(m.total, 64800)
        self.assertEqual(m.montant_hote, 57000)

    def test_arrondi_au_franc(self):
        m = tarifs.calculer('12345.00', 1)
        self.assertEqual((m.frais_service, m.commission_hote), (988, 617))

    def test_bareme(self):
        m = tarifs.calculer(20000, 3)
        resa = mock.Mock(check_in=(timezone.localdate() + timedelta(days=10)))
        self.assertEqual(tarifs.bareme_voyageur(m, resa).rembourse_voyageur, 64800)

        resa.check_in = timezone.localdate() + timedelta(days=4)
        a = tarifs.bareme_voyageur(m, resa)
        self.assertEqual((a.rembourse_voyageur, a.nuits_retenues, a.montant_hote), (34800, 30000, 28500))

        resa.check_in = timezone.localdate() + timedelta(days=1)
        a = tarifs.bareme_voyageur(m, resa)
        self.assertEqual((a.rembourse_voyageur, a.montant_hote), (0, 57000))


class FauxFedaPay:
    def __init__(self):
        self.statut_transaction = 'pending'
        self.statut_payout = 'started'
        self.payouts = []
        self.compteur = 0

    def creer_transaction(self, **kwargs):
        self.compteur += 1
        return str(1000 + self.compteur), f'https://sandbox-process.fedapay.com/{self.compteur}'

    def lire_transaction(self, identifiant):
        return {'id': identifiant, 'status': self.statut_transaction, 'mode': 'moov_tg',
                'payment_method': {'number': '90000001', 'country': 'tg'}}

    def creer_versement(self, **kwargs):
        self.payouts.append(kwargs)
        return str(5000 + len(self.payouts))

    def lire_versement(self, identifiant):
        return {'id': identifiant, 'status': self.statut_payout}


class FauxPayPal:
    def __init__(self):
        self.statut = 'PAYER_ACTION_REQUIRED'
        self.remboursements = []

    def creer_commande(self, **kwargs):
        self.commande = kwargs
        return 'ORDER1', 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER1'

    def lire_commande(self, identifiant):
        return {'id': identifiant, 'status': self.statut}

    def capturer(self, identifiant):
        return {'id': identifiant, 'status': 'COMPLETED',
                'purchase_units': [{'payments': {'captures': [{'id': 'CAP1'}]}}]}

    def rembourser(self, capture, montant_eur, reference):
        self.remboursements.append((capture, montant_eur))
        return {'id': 'REF1', 'status': 'COMPLETED'}


@override_settings(FEDAPAY=FEDAPAY_TEST, PAYPAL=PAYPAL_TEST)
class CycleTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.hote = User.objects.create_user('hote@test.tg', 'x', first_name='Ama', last_name='Hote', role='hote')
        self.voyageur = User.objects.create_user('voy@test.tg', 'x', first_name='Kofi', last_name='Voy', role='voyageur')
        self.logement = HebergementModel.objects.create(
            name='Villa test', city='Lomé', price_per_night=20000, host=self.hote, amenities=[],
        )
        self.faux = FauxFedaPay()
        self.faux_paypal = FauxPayPal()
        for module, faux in ((fedapay, self.faux), (paypal, self.faux_paypal)):
            patcher = mock.patch.object(module, 'client', return_value=faux)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.api = APIClient()
        self.api.force_authenticate(self.voyageur)

    def reserver(self, dans_jours=10, nuits=3):
        debut = timezone.localdate() + timedelta(days=dans_jours)
        r = self.api.post('/api/v1/reservations/', {
            'hebergement': str(self.logement.id), 'check_in': debut.isoformat(),
            'check_out': (debut + timedelta(days=nuits)).isoformat(), 'guests_count': 2,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return ReservationModel.objects.get(pk=r.data['id'])

    def payer(self, reservation):
        r = self.api.post(f'/api/v1/paiements/reservations/{reservation.id}/payer/')
        self.assertEqual(r.status_code, 200, r.content)
        self.faux.statut_transaction = 'approved'
        r = self.api.get(f'/api/v1/paiements/reservations/{reservation.id}/statut/')
        reservation.refresh_from_db()
        return r

    def test_reservation_en_attente_puis_confirmee(self):
        resa = self.reserver()
        self.assertEqual(resa.status, 'pending')
        self.assertEqual((resa.total_price, resa.prix_nuits, resa.commission_hote), (64800, 60000, 3000))
        self.assertIsNotNone(resa.expire_le)

        r = self.payer(resa)
        self.assertEqual(r.data['reservation'], 'confirmed')
        self.assertEqual(r.data['paiement'], 'reussi')
        versement = resa.versement
        self.assertEqual((versement.montant, versement.commission, versement.statut), (57000, 3000, 'planifie'))
        self.assertEqual(versement.date_prevue, tarifs.date_versement(resa))
        self.assertEqual(PaiementModel.objects.get(reservation=resa).telephone, '90000001')

    @override_settings(FEDAPAY={**FEDAPAY_TEST, 'SECRET_KEY': ''}, PAYPAL={**PAYPAL_TEST, 'CLIENT_ID': ''})
    def test_sans_paiement_en_ligne_confirmation_directe(self):
        self.assertEqual(self.reserver().status, 'confirmed')

    def test_webhook_en_double_idempotent(self):
        resa = self.reserver()
        self.payer(resa)
        paiement = PaiementModel.objects.get(reservation=resa)
        services.traiter_evenement({'name': 'transaction.approved', 'entity': {'id': paiement.transaction_id}})
        services._paiement_reussi(paiement.pk, {})
        self.assertEqual(VersementModel.objects.count(), 1)
        self.assertFalse(RemboursementModel.objects.exists())

    def test_reservation_expiree_libere_les_dates(self):
        resa = self.reserver()
        self.assertTrue(conflit(self.logement.id, resa.check_in, resa.check_out))
        ReservationModel.objects.filter(pk=resa.pk).update(expire_le=timezone.now() - timedelta(minutes=1))
        self.assertIsNone(conflit(self.logement.id, resa.check_in, resa.check_out))
        self.assertEqual(services.expirer_reservations(), 1)
        resa.refresh_from_db()
        self.assertEqual((resa.status, resa.annule_par), ('cancelled', 'expiration'))

    def test_paiement_tardif_dates_reprises_rembourse(self):
        resa = self.reserver()
        self.api.post(f'/api/v1/paiements/reservations/{resa.id}/payer/')
        ReservationModel.objects.filter(pk=resa.pk).update(expire_le=timezone.now() - timedelta(minutes=1))
        services.expirer_reservations()
        autre = self.reserver()  # quelqu'un d'autre prend les dates libérées
        self.assertNotEqual(autre.pk, resa.pk)

        self.faux.statut_transaction = 'approved'
        services.synchroniser_paiement(PaiementModel.objects.get(reservation=resa))
        resa.refresh_from_db()
        self.assertEqual(resa.status, 'cancelled')
        self.assertEqual(RemboursementModel.objects.get(reservation=resa).montant, 64800)

    def test_annulation_voyageur_bareme_50(self):
        resa = self.reserver(dans_jours=4)
        self.payer(resa)
        r = self.api.delete(f'/api/v1/reservations/{resa.id}/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['rembourse'], 34800)
        resa.versement.refresh_from_db()
        self.assertEqual((resa.versement.montant, resa.versement.statut), (28500, 'planifie'))

    def test_annulation_plus_7_jours_tout_rembourse(self):
        resa = self.reserver(dans_jours=10)
        self.payer(resa)
        self.assertEqual(self.api.delete(f'/api/v1/reservations/{resa.id}/').data['rembourse'], 64800)
        resa.versement.refresh_from_db()
        self.assertEqual(resa.versement.statut, 'annule')

    def test_versement_attend_le_profil_puis_part(self):
        resa = self.reserver(dans_jours=10)
        self.payer(resa)
        VersementModel.objects.filter(reservation=resa).update(date_prevue=timezone.now() - timedelta(minutes=1))

        services.envoyer_versements_dus()
        v = VersementModel.objects.get(reservation=resa)
        self.assertEqual(v.statut, 'planifie')
        self.assertIn("où recevoir", v.derniere_erreur)

        hote = APIClient()
        hote.force_authenticate(self.hote)
        r = hote.put('/api/v1/paiements/profil-versement/', {
            'pays': 'TG', 'operateur': 'moov_tg', 'numero': '90 00 00 02', 'titulaire': 'Ama Hote',
        }, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data['numero'], '90000002')

        self.assertEqual(services.envoyer_versements_dus(), 1)
        self.assertEqual(self.faux.payouts[0]['montant'], 57000)
        self.assertEqual(self.faux.payouts[0]['mode'], 'moov_tg')
        self.faux.statut_payout = 'sent'
        services.passe()
        v.refresh_from_db()
        self.assertEqual(v.statut, 'envoye')

        revenus = hote.get('/api/v1/paiements/revenus/').data
        self.assertEqual(revenus['totaux']['verse'], 57000)
        self.assertEqual(revenus['totaux']['commission'], 3000)

    def test_profil_versement_valide_operateur_et_numero(self):
        hote = APIClient()
        hote.force_authenticate(self.hote)
        r = hote.put('/api/v1/paiements/profil-versement/', {
            'pays': 'TG', 'operateur': 'mtn_open', 'numero': '90000002', 'titulaire': 'Ama Hote',
        }, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('operateur', r.data)
        r = hote.put('/api/v1/paiements/profil-versement/', {
            'pays': 'BJ', 'operateur': 'mtn_open', 'numero': '90000002', 'titulaire': 'Ama Hote',
        }, format='json')
        self.assertIn('numero', r.data)
        self.assertEqual(self.api.get('/api/v1/paiements/profil-versement/').status_code, 403)

    def test_remboursement_envoye_sur_le_numero_debite(self):
        resa = self.reserver(dans_jours=10)
        self.payer(resa)
        self.api.delete(f'/api/v1/reservations/{resa.id}/')
        self.assertEqual(services.envoyer_remboursements(), 1)
        self.assertEqual(self.faux.payouts[0]['client']['phone_number'], {'number': '90000001', 'country': 'tg'})

    def test_webhook_signature(self):
        corps = json.dumps({'name': 'transaction.approved', 'entity': {'id': 1}}).encode()
        t = str(int(time.time()))
        s = hmac.new(b'whsec_test', f'{t}.'.encode() + corps, hashlib.sha256).hexdigest()
        anonyme = APIClient()
        ok = anonyme.post('/api/v1/paiements/webhooks/fedapay/', corps, content_type='application/json',
                          HTTP_X_FEDAPAY_SIGNATURE=f't={t},s={s}')
        self.assertEqual(ok.status_code, 200)
        ko = anonyme.post('/api/v1/paiements/webhooks/fedapay/', corps, content_type='application/json',
                          HTTP_X_FEDAPAY_SIGNATURE=f't={t},s=faux')
        self.assertEqual(ko.status_code, 400)

    def test_paypal_en_euros_capture_et_remboursement(self):
        resa = self.reserver(dans_jours=10)
        r = self.api.post(f'/api/v1/paiements/reservations/{resa.id}/payer/', {'moyen': 'paypal'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn('paypal.com', r.data['url'])
        self.assertEqual(str(self.faux_paypal.commande['montant_eur']), '98.79')  # 64 800 FCFA

        self.faux_paypal.statut = 'APPROVED'  # le voyageur a validé chez PayPal
        statut = self.api.get(f'/api/v1/paiements/reservations/{resa.id}/statut/').data
        self.assertEqual(statut['reservation'], 'confirmed')
        paiement = PaiementModel.objects.get(reservation=resa)
        self.assertEqual((paiement.prestataire, paiement.capture_id), ('paypal', 'CAP1'))
        resa.refresh_from_db()
        self.assertEqual(resa.payment_method, 'paypal')
        self.assertEqual(resa.versement.montant, 57000)  # l'hôte est payé en FCFA comme les autres

        self.api.delete(f'/api/v1/reservations/{resa.id}/')
        services.envoyer_remboursements()
        self.assertEqual(self.faux_paypal.remboursements, [('CAP1', paypal.en_euros(64800))])
        self.assertEqual(RemboursementModel.objects.get(reservation=resa).statut, 'envoye')

    def test_carte_remboursement_manuel(self):
        resa = self.reserver(dans_jours=10)
        self.api.post(f'/api/v1/paiements/reservations/{resa.id}/payer/', {'moyen': 'carte'}, format='json')
        self.faux.lire_transaction = lambda i: {'id': i, 'status': 'approved', 'mode': 'card'}
        services.synchroniser_paiement(PaiementModel.objects.get(reservation=resa))
        resa.refresh_from_db()
        self.assertEqual((resa.status, resa.payment_method), ('confirmed', 'carte'))
        self.api.delete(f'/api/v1/reservations/{resa.id}/')
        services.envoyer_remboursements()
        self.assertEqual(RemboursementModel.objects.get(reservation=resa).statut, 'a_traiter')
        self.assertEqual(self.faux.payouts, [])

    def test_moyen_indisponible(self):
        resa = self.reserver()
        with override_settings(PAYPAL={**PAYPAL_TEST, 'CLIENT_ID': ''}):
            r = self.api.post(f'/api/v1/paiements/reservations/{resa.id}/payer/', {'moyen': 'paypal'}, format='json')
        self.assertEqual(r.status_code, 400)
