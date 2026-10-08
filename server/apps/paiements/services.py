"""Cycle de vie de l'argent d'une réservation.

Encaissement : FedaPay (Mobile Money, carte Visa/Mastercard) ou PayPal (en euros).
Versements aux hôtes : toujours FedaPay (Mobile Money).

    réservation « pending » (dates bloquées 30 min)
        → paiement FedaPay réussi → réservation « confirmed » + versement planifié (arrivée + 24 h)
        → le worker (manage.py traiter_paiements) envoie le versement à l'hôte à l'échéance
    annulation → remboursement du voyageur selon le barème, versement réduit ou annulé

Règle d'or : on ne croit jamais le navigateur ni le contenu d'un webhook. Le statut d'une
transaction est toujours relu auprès de FedaPay avant d'agir.
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.hebergements.disponibilites import conflit
from apps.reservations.models import ReservationModel

from . import fedapay, paypal, tarifs
from .models import PaiementModel, ProfilVersementModel, RemboursementModel, VersementModel

logger = logging.getLogger('apps.paiements')

MAX_TENTATIVES = 5
# Délai avant un nouvel essai après un échec : 15 min, 30 min, 1 h, 2 h (puis traitement manuel)
DELAI_NOUVEL_ESSAI = timedelta(minutes=15)


def _peut_reessayer(ligne) -> bool:
    if not ligne.tentatives:
        return True
    attente = DELAI_NOUVEL_ESSAI * (2 ** (ligne.tentatives - 1))
    return timezone.now() - ligne.mis_a_jour_le >= attente


class PaiementErreur(Exception):
    """Erreur dont le message peut être affiché tel quel à l'utilisateur."""


# Moyen choisi par le voyageur → prestataire qui encaisse
MOYENS = {
    'mobile_money': 'fedapay',
    'carte': 'fedapay',
    'paypal': 'paypal',
}


def fedapay_actif() -> bool:
    return bool(settings.FEDAPAY['SECRET_KEY'])


def paypal_actif() -> bool:
    return bool(settings.PAYPAL['CLIENT_ID'] and settings.PAYPAL['CLIENT_SECRET'])


def moyens_actifs() -> list[str]:
    actifs = {'fedapay': fedapay_actif(), 'paypal': paypal_actif()}
    return [moyen for moyen, prestataire in MOYENS.items() if actifs[prestataire]]


def paiement_actif() -> bool:
    return fedapay_actif() or paypal_actif()


def delai_paiement() -> timedelta:
    return timedelta(minutes=settings.FEDAPAY['EXPIRATION_MINUTES'])


def paiement_reussi(reservation) -> PaiementModel | None:
    return reservation.paiements.filter(statut='reussi').order_by('cree_le').first()


# --- Encaissement ------------------------------------------------------------------------

def demarrer_paiement(reservation, moyen: str = 'mobile_money') -> str:
    """Crée la transaction chez le prestataire et renvoie l'adresse de sa page de paiement."""
    if moyen not in moyens_actifs():
        raise PaiementErreur("Ce moyen de paiement n'est pas disponible.")
    if reservation.status != 'pending':
        raise PaiementErreur("Cette réservation n'attend pas de paiement.")
    if reservation.expire_le and reservation.expire_le <= timezone.now():
        raise PaiementErreur("Le délai de paiement est dépassé : les dates ont été libérées. Refaites la réservation.")

    montants = tarifs.montants_de(reservation)
    if reservation.payment_method != moyen:
        reservation.payment_method = moyen
        reservation.save(update_fields=['payment_method'])
    if MOYENS[moyen] == 'paypal':
        return _demarrer_paypal(reservation, montants)

    voyageur = reservation.guest
    try:
        transaction_id, url = fedapay.client().creer_transaction(
            montant=montants.total,
            description=f"AfriStay {reservation.reference} — {reservation.hebergement.name}",
            callback_url=f"{settings.FRONTEND_URL}/reservation/paiement/{reservation.id}",
            client={
                'firstname': voyageur.first_name or 'Voyageur',
                'lastname': voyageur.last_name or 'AfriStay',
                'email': voyageur.email,
            },
        )
    except fedapay.FedaPayErreur:
        logger.exception("Création de la transaction impossible pour %s", reservation.id)
        raise PaiementErreur("Le service de paiement est momentanément indisponible. Réessayez dans quelques instants.")

    PaiementModel.objects.create(
        reservation=reservation, montant=montants.total, transaction_id=transaction_id, url_paiement=url,
    )
    return url


def _demarrer_paypal(reservation, montants) -> str:
    paiement = PaiementModel(
        reservation=reservation, montant=montants.total, prestataire='paypal',
        montant_eur=paypal.en_euros(montants.total),
    )
    retour = f"{settings.FRONTEND_URL}/reservation/paiement/{reservation.id}"
    try:
        paiement.transaction_id, paiement.url_paiement = paypal.client().creer_commande(
            montant_eur=paiement.montant_eur,
            description=f"AfriStay {reservation.reference} — {reservation.hebergement.name}",
            reference=str(paiement.id),
            url_retour=retour,
            url_annulation=f"{retour}?annule=1",
        )
    except paypal.PayPalErreur:
        logger.exception("Création de la commande PayPal impossible pour %s", reservation.id)
        raise PaiementErreur("PayPal est momentanément indisponible. Réessayez ou choisissez un autre moyen de paiement.")
    paiement.save()
    return paiement.url_paiement


def synchroniser_paiement(paiement: PaiementModel) -> str:
    """Relit la transaction chez le prestataire et applique son statut. Renvoie le statut interne à jour."""
    if paiement.statut != 'en_attente' or not paiement.transaction_id:
        return paiement.statut
    if paiement.prestataire == 'paypal':
        return _synchroniser_paypal(paiement)
    try:
        donnees = fedapay.client().lire_transaction(paiement.transaction_id)
    except fedapay.FedaPayErreur:
        return paiement.statut

    nouveau = fedapay.STATUTS_TRANSACTION.get(str(donnees.get('status', '')).lower())
    if nouveau == 'reussi':
        _paiement_reussi(paiement.pk, donnees)
    elif nouveau:
        PaiementModel.objects.filter(pk=paiement.pk, statut='en_attente').update(statut=nouveau)
    paiement.refresh_from_db()
    return paiement.statut


def _synchroniser_paypal(paiement: PaiementModel) -> str:
    """Commande validée par le voyageur (APPROVED) → on l'encaisse ; COMPLETED → paiement réussi."""
    try:
        api = paypal.client()
        commande = api.lire_commande(paiement.transaction_id)
        if commande.get('status') == 'APPROVED':
            commande = api.capturer(paiement.transaction_id)
    except paypal.PayPalErreur:
        return paiement.statut

    nouveau = paypal.STATUTS_COMMANDE.get(commande.get('status'))
    if nouveau == 'reussi':
        PaiementModel.objects.filter(pk=paiement.pk).update(capture_id=paypal.id_capture(commande))
        _paiement_reussi(paiement.pk, {'mode': 'paypal'})
    elif nouveau:
        PaiementModel.objects.filter(pk=paiement.pk, statut='en_attente').update(statut=nouveau)
    paiement.refresh_from_db()
    return paiement.statut


def _telephone(donnees: dict) -> tuple[str, str]:
    """Numéro débité (sert à rembourser), quand FedaPay le fournit."""
    for source in (donnees.get('payment_method'), (donnees.get('customer') or {}).get('phone_number')):
        if isinstance(source, dict) and source.get('number'):
            return str(source['number']), str(source.get('country') or '')[:2].upper()
    return '', ''


def _paiement_reussi(paiement_id, donnees: dict):
    with transaction.atomic():
        paiement = PaiementModel.objects.select_for_update().get(pk=paiement_id)
        if paiement.statut == 'reussi':
            return  # déjà traité (webhook reçu deux fois, ou webhook + vérification du navigateur)
        reservation = ReservationModel.objects.select_for_update().get(pk=paiement.reservation_id)

        paiement.statut = 'reussi'
        paiement.mode = str(donnees.get('mode') or '')[:40]
        if paiement.prestataire == 'fedapay':
            paiement.telephone, paiement.pays_telephone = _telephone(donnees)
        paiement.save()
        logger.info("Paiement reçu : %s FCFA pour %s", paiement.montant, reservation.reference)

        if reservation.paiements.filter(statut='reussi').exclude(pk=paiement.pk).exists():
            _rembourser(reservation, paiement, paiement.montant, "Paiement reçu en double")
            return
        if reservation.status == 'cancelled' and reservation.annule_par != 'expiration':
            _rembourser(reservation, paiement, paiement.montant, "Réservation annulée avant la confirmation du paiement")
            return
        # Paiement arrivé après l'expiration : on confirme si les dates sont toujours libres
        if conflit(reservation.hebergement_id, reservation.check_in, reservation.check_out, exclure=reservation.pk):
            _rembourser(reservation, paiement, paiement.montant, "Dates plus disponibles au moment du paiement")
            reservation.status, reservation.annule_par = 'cancelled', 'plateforme'
            reservation.annule_le = timezone.now()
            reservation.save(update_fields=['status', 'annule_par', 'annule_le'])
            return

        reservation.status = 'confirmed'
        reservation.expire_le = None
        reservation.annule_par, reservation.annule_le = '', None
        reservation.save(update_fields=['status', 'expire_le', 'annule_par', 'annule_le'])
        _planifier_versement(reservation)


def _planifier_versement(reservation):
    montants = tarifs.montants_de(reservation)
    VersementModel.objects.update_or_create(
        reservation=reservation,
        defaults={
            'hote_id': reservation.hebergement.host_id,
            'montant_brut': montants.prix_nuits,
            'commission': montants.commission_hote,
            'montant': montants.montant_hote,
            'date_prevue': tarifs.date_versement(reservation),
            'statut': 'planifie',
        },
    )


def _par_carte(paiement) -> bool:
    return paiement.reservation.payment_method == 'carte' or 'card' in paiement.mode.lower()


def _rembourser(reservation, paiement, montant: int, motif: str):
    if montant <= 0:
        return None
    logger.info("Remboursement de %s FCFA prévu pour %s : %s", montant, reservation.reference, motif)
    statut = 'a_envoyer'
    if paiement.prestataire == 'fedapay' and not paiement.telephone and not _par_carte(paiement):
        # Mobile Money : FedaPay ne donne pas le numéro débité, on le demande au voyageur
        statut = 'attente_numero'
    return RemboursementModel.objects.create(
        reservation=reservation, paiement=paiement, montant=montant, motif=motif, statut=statut,
    )


def indiquer_numero_remboursement(reservation, pays: str, operateur: str, numero: str) -> int:
    """Enregistre le compte Mobile Money du voyageur sur ses remboursements en attente. Renvoie leur nombre."""
    return RemboursementModel.objects.filter(reservation=reservation, statut='attente_numero').update(
        pays=pays, operateur=operateur, numero=numero, statut='a_envoyer', derniere_erreur='',
    )


# --- Annulation --------------------------------------------------------------------------

def annuler(reservation, par: str) -> int:
    """Annule la réservation. `par` : voyageur, hote ou plateforme. Renvoie le montant remboursé au voyageur."""
    with transaction.atomic():
        reservation = ReservationModel.objects.select_for_update().get(pk=reservation.pk)
        if reservation.status == 'cancelled':
            raise PaiementErreur("Cette réservation est déjà annulée.")

        rembourse = 0
        paiement = paiement_reussi(reservation)
        if paiement:
            montants = tarifs.montants_de(reservation)
            if par == 'voyageur':
                bareme = tarifs.bareme_voyageur(montants, reservation)
                motif = "Annulation par le voyageur"
            else:
                bareme = tarifs.Annulation(rembourse_voyageur=montants.total, nuits_retenues=0)
                motif = "Annulation par l'hôte" if par == 'hote' else "Annulation par AfriStay"

            versement = VersementModel.objects.select_for_update().filter(reservation=reservation).first()
            if versement and versement.statut in ('planifie', 'echoue'):
                if bareme.nuits_retenues:
                    versement.montant_brut = bareme.nuits_retenues
                    versement.commission = bareme.commission_hote
                    versement.montant = bareme.montant_hote
                    versement.statut = 'planifie'
                else:
                    versement.statut = 'annule'
                versement.save()
            elif versement and versement.statut in ('en_cours', 'envoye'):
                logger.warning("Annulation de %s après le versement à l'hôte : à régulariser", reservation.reference)

            _rembourser(reservation, paiement, bareme.rembourse_voyageur, motif)
            rembourse = bareme.rembourse_voyageur

        reservation.status = 'cancelled'
        reservation.annule_par = par
        reservation.annule_le = timezone.now()
        reservation.save(update_fields=['status', 'annule_par', 'annule_le'])
        return rembourse


# --- Versements et remboursements (worker) -----------------------------------------------

def _client_payout(utilisateur, numero: str, pays: str, titulaire: str = '') -> dict:
    prenom, _, nom = (titulaire or '').strip().partition(' ')
    return {
        'firstname': prenom or utilisateur.first_name or 'Client',
        'lastname': nom or utilisateur.last_name or 'AfriStay',
        'email': utilisateur.email,
        'phone_number': {'number': numero, 'country': pays.lower()},
    }


def _reserver(modele, pk, de: str) -> bool:
    """Prend la main sur une ligne (évite un double envoi si deux workers tournent)."""
    return modele.objects.filter(pk=pk, statut=de).update(statut='en_cours') == 1


def envoyer_versements_dus() -> int:
    if not fedapay_actif():
        return 0  # les versements aux hôtes passent par FedaPay
    envoyes = 0
    dus = VersementModel.objects.filter(
        statut='planifie', date_prevue__lte=timezone.now(), reservation__status='confirmed',
    ).select_related('hote')[:50]
    for versement in dus:
        if not _peut_reessayer(versement):
            continue
        profil = ProfilVersementModel.objects.filter(hote=versement.hote).first()
        if not profil:
            if not versement.derniere_erreur:
                versement.derniere_erreur = "L'hôte n'a pas encore indiqué où recevoir son argent."
                versement.save(update_fields=['derniere_erreur', 'mis_a_jour_le'])
            continue
        if not _reserver(VersementModel, versement.pk, 'planifie'):
            continue
        versement.tentatives += 1
        try:
            versement.payout_id = fedapay.client().creer_versement(
                montant=versement.montant, mode=profil.operateur,
                client=_client_payout(versement.hote, profil.numero, profil.pays, profil.titulaire),
            )
            versement.statut, versement.derniere_erreur = 'en_cours', ''
            versement.mode, versement.numero = profil.operateur, profil.numero
            envoyes += 1
        except fedapay.FedaPayErreur as exc:
            versement.derniere_erreur = str(exc)
            versement.statut = 'echoue' if versement.tentatives >= MAX_TENTATIVES else 'planifie'
        versement.save()
    return envoyes


def synchroniser_versement(versement: VersementModel):
    try:
        donnees = fedapay.client().lire_versement(versement.payout_id)
    except fedapay.FedaPayErreur:
        return
    statut = fedapay.STATUTS_PAYOUT.get(str(donnees.get('status', '')).lower())
    if statut == 'envoye':
        versement.statut, versement.envoye_le = 'envoye', timezone.now()
        logger.info("Versement de %s FCFA envoyé à %s", versement.montant, versement.hote_id)
    elif statut == 'echoue':
        versement.derniere_erreur = str(donnees.get('last_error_code') or 'Versement refusé par FedaPay')
        versement.statut = 'echoue' if versement.tentatives >= MAX_TENTATIVES else 'planifie'
    else:
        return
    versement.save()


def envoyer_remboursements() -> int:
    envoyes = 0
    for remboursement in RemboursementModel.objects.filter(statut='a_envoyer').select_related('paiement', 'reservation__guest')[:50]:
        if not _peut_reessayer(remboursement):
            continue
        paiement = remboursement.paiement
        if paiement.prestataire == 'paypal':
            envoyes += _rembourser_paypal(remboursement)
            continue
        # Compte indiqué par le voyageur, sinon numéro débité s'il est connu
        if remboursement.numero:
            mode, numero, pays = remboursement.operateur, remboursement.numero, remboursement.pays
        else:
            mode, numero, pays = paiement.mode, paiement.telephone, paiement.pays_telephone
        if not (mode and numero) or not fedapay_actif():
            # Carte bancaire : remboursement manuel depuis le tableau de bord FedaPay
            remboursement.statut = 'a_traiter'
            remboursement.derniere_erreur = "Paiement par carte ou compte inconnu : rembourser depuis le tableau de bord FedaPay."
            remboursement.save()
            continue
        if not _reserver(RemboursementModel, remboursement.pk, 'a_envoyer'):
            continue
        remboursement.tentatives += 1
        try:
            remboursement.payout_id = fedapay.client().creer_versement(
                montant=remboursement.montant, mode=mode,
                client=_client_payout(remboursement.reservation.guest, numero, pays),
            )
            remboursement.statut, remboursement.derniere_erreur = 'en_cours', ''
            envoyes += 1
        except fedapay.FedaPayErreur as exc:
            remboursement.derniere_erreur = str(exc)
            remboursement.statut = 'a_traiter' if remboursement.tentatives >= MAX_TENTATIVES else 'a_envoyer'
        remboursement.save()
    return envoyes


def _rembourser_paypal(remboursement: RemboursementModel) -> int:
    """Remboursement sur la carte ou le compte PayPal du voyageur, au prorata en euros."""
    paiement = remboursement.paiement
    if not paiement.capture_id or not paypal_actif():
        remboursement.statut = 'a_traiter'
        remboursement.derniere_erreur = "Encaissement PayPal introuvable : rembourser depuis le compte PayPal."
        remboursement.save()
        return 0
    if not _reserver(RemboursementModel, remboursement.pk, 'a_envoyer'):
        return 0
    plafond = paiement.montant_eur or paypal.en_euros(paiement.montant)
    montant_eur = min(paypal.en_euros(remboursement.montant), plafond)
    remboursement.tentatives += 1
    try:
        reponse = paypal.client().rembourser(paiement.capture_id, montant_eur, reference=str(remboursement.id))
        remboursement.payout_id = reponse.get('id', '')
        if reponse.get('status') == 'COMPLETED':
            remboursement.statut, remboursement.envoye_le = 'envoye', timezone.now()
        else:
            remboursement.statut = 'en_cours'
        remboursement.derniere_erreur = ''
    except paypal.PayPalErreur as exc:
        remboursement.derniere_erreur = str(exc)
        remboursement.statut = 'a_traiter' if remboursement.tentatives >= MAX_TENTATIVES else 'a_envoyer'
    remboursement.save()
    return 1 if remboursement.statut in ('en_cours', 'envoye') else 0


def synchroniser_remboursement(remboursement: RemboursementModel):
    if remboursement.paiement.prestataire == 'paypal':
        try:
            statut = paypal.client().lire_remboursement(remboursement.payout_id).get('status')
        except paypal.PayPalErreur:
            return
        if statut == 'COMPLETED':
            remboursement.statut, remboursement.envoye_le = 'envoye', timezone.now()
            remboursement.save()
        elif statut in ('FAILED', 'CANCELLED'):
            remboursement.statut, remboursement.derniere_erreur = 'a_traiter', f"Remboursement PayPal {statut}"
            remboursement.save()
        return
    try:
        donnees = fedapay.client().lire_versement(remboursement.payout_id)
    except fedapay.FedaPayErreur:
        return
    statut = fedapay.STATUTS_PAYOUT.get(str(donnees.get('status', '')).lower())
    if statut == 'envoye':
        remboursement.statut, remboursement.envoye_le = 'envoye', timezone.now()
    elif statut == 'echoue':
        remboursement.statut = 'a_traiter'
        remboursement.derniere_erreur = str(donnees.get('last_error_code') or 'Remboursement refusé par FedaPay')
    else:
        return
    remboursement.save()


def expirer_reservations() -> int:
    """Libère les dates des réservations non payées à temps (après une dernière vérification)."""
    expirees = 0
    maintenant = timezone.now()
    for reservation in ReservationModel.objects.filter(status='pending', expire_le__lte=maintenant):
        for paiement in reservation.paiements.filter(statut='en_attente'):
            synchroniser_paiement(paiement)
        expirees += ReservationModel.objects.filter(pk=reservation.pk, status='pending').update(
            status='cancelled', annule_par='expiration', annule_le=maintenant,
        )
    return expirees


def passe() -> dict:
    """Une passe du worker. Rattrape aussi les webhooks perdus (et leur absence en local)."""
    recents = PaiementModel.objects.filter(statut='en_attente', cree_le__gte=timezone.now() - timedelta(hours=2))[:50]
    for paiement in recents:
        synchroniser_paiement(paiement)
    for versement in VersementModel.objects.filter(statut='en_cours').exclude(payout_id='')[:50]:
        synchroniser_versement(versement)
    for remboursement in RemboursementModel.objects.filter(statut='en_cours').exclude(payout_id='').select_related('paiement')[:50]:
        synchroniser_remboursement(remboursement)
    from . import notifications  # import local : notifications importe les modèles et les tarifs

    stats = {
        'reservations_expirees': expirer_reservations(),
        'versements_envoyes': envoyer_versements_dus(),
        'remboursements_envoyes': envoyer_remboursements(),
    }
    stats['emails'] = notifications.envoyer_notifications()
    return {k: v for k, v in stats.items() if v}


def traiter_evenement(evenement: dict):
    """Webhook FedaPay : on ne se sert que de l'identifiant, puis on relit l'objet chez FedaPay."""
    nom = str(evenement.get('name', ''))
    identifiant = str((evenement.get('entity') or {}).get('id', ''))
    if not identifiant:
        return
    if nom.startswith('transaction.'):
        paiement = PaiementModel.objects.filter(transaction_id=identifiant).first()
        if paiement:
            synchroniser_paiement(paiement)
    elif nom.startswith('payout.'):
        for versement in VersementModel.objects.filter(payout_id=identifiant, statut='en_cours'):
            synchroniser_versement(versement)
        for remboursement in RemboursementModel.objects.filter(payout_id=identifiant, statut='en_cours'):
            synchroniser_remboursement(remboursement)
