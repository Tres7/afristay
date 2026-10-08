"""Emails liés à l'argent, envoyés par le worker (jamais pendant une requête web).

Chaque ligne porte un drapeau `notifie` : un envoi qui échoue (SMTP indisponible) est retenté
à la passe suivante, et un email n'est jamais envoyé deux fois.
"""
import logging
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import formats

from . import tarifs
from .models import PaiementModel, ProfilVersementModel, RemboursementModel, VersementModel
from .operateurs import PAYS, nom_operateur

logger = logging.getLogger('apps.paiements.notifications')


def _fcfa(montant: int) -> str:
    return f"{montant:,}".replace(',', ' ') + ' FCFA'


def _date(valeur) -> str:
    return formats.date_format(valeur, 'j F Y')


def _envoyer(gabarit: str, sujet: str, destinataires: list[str], contexte: dict):
    # Les SMTP de test (Mailtrap) et certains fournisseurs limitent le nombre d'emails par seconde
    time.sleep(settings.PAIEMENTS_PAUSE_EMAIL)
    send_mail(
        subject=sujet,
        message=render_to_string(f'emails/paiements/{gabarit}.txt', contexte),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=destinataires,
    )


def _admins() -> list[str]:
    return list(get_user_model().objects.filter(role='admin', is_active=True).values_list('email', flat=True))


def _sejour(r) -> dict:
    return {
        'hebergement': r.hebergement.name, 'ville': r.hebergement.city, 'reference': r.reference,
        'arrivee': _date(r.check_in), 'depart': _date(r.check_out), 'voyageurs': r.guests_count,
    }


def reservation_payee_voyageur(paiement: PaiementModel):
    r = paiement.reservation
    voyageur = r.guest
    _envoyer('reservation_payee_voyageur', f"Séjour confirmé — {r.hebergement.name}", [voyageur.email], {
        **_sejour(r), 'prenom': voyageur.first_name, 'montant': _fcfa(paiement.montant),
        'url': f"{settings.FRONTEND_URL}/reservation/confirmation/{r.id}",
        'url_remboursement': f"{settings.FRONTEND_URL}/remboursement",
    })


def reservation_payee_hote(paiement: PaiementModel):
    r = paiement.reservation
    voyageur, hote = r.guest, r.hebergement.host
    montants = tarifs.montants_de(r)
    _envoyer('reservation_payee_hote', f"Nouvelle réservation payée — {r.hebergement.name}", [hote.email], {
        **_sejour(r), 'prenom': hote.first_name, 'voyageur': f"{voyageur.first_name} {voyageur.last_name}".strip(),
        'message': r.message, 'montant_hote': _fcfa(montants.montant_hote),
        'date_versement': _date(tarifs.date_versement(r)),
        'profil_complet': ProfilVersementModel.objects.filter(hote=hote).exists(),
        'url_revenus': f"{settings.FRONTEND_URL}/hote/espace?onglet=revenus",
        'url_reservations': f"{settings.FRONTEND_URL}/hote/espace?onglet=reservations",
    })


def versement_envoye(v: VersementModel):
    r = v.reservation
    indicatif = next((p['indicatif'] for p in PAYS.values() if any(c == v.mode for c, _ in p['operateurs'])), '')
    _envoyer('versement_envoye', f"Versement de {_fcfa(v.montant)} envoyé", [v.hote.email], {
        'prenom': v.hote.first_name, 'montant': _fcfa(v.montant), 'montant_brut': _fcfa(v.montant_brut),
        'commission': _fcfa(v.commission), 'operateur': nom_operateur(v.mode),
        'numero': f"+{indicatif} {v.numero}" if indicatif else v.numero,
        'voyageur': r.guest.first_name, 'hebergement': r.hebergement.name, 'reference': r.reference,
        'url_revenus': f"{settings.FRONTEND_URL}/hote/espace?onglet=revenus",
    })


def remboursement_envoye(rb: RemboursementModel):
    r = rb.reservation
    if rb.paiement.prestataire == 'paypal':
        destination = 'votre compte PayPal'
    elif rb.numero:
        destination = f"votre compte {nom_operateur(rb.operateur)} (+{PAYS[rb.pays]['indicatif']} {rb.numero})"
    else:
        destination = ''
    _envoyer('remboursement_envoye', f"Remboursement de {_fcfa(rb.montant)} envoyé", [r.guest.email], {
        'prenom': r.guest.first_name, 'montant': _fcfa(rb.montant), 'reference': r.reference,
        'hebergement': r.hebergement.name, 'destination': destination,
    })


def alerte_admin(type_: str, ligne, beneficiaire: str):
    destinataires = _admins()
    if not destinataires:
        logger.error("%s à traiter (%s) mais aucun administrateur à prévenir", type_, ligne.pk)
        return
    r = ligne.reservation
    _envoyer('alerte_admin', f"[AfriStay] {type_} à traiter — {r.reference}", destinataires, {
        'type': type_, 'reference': r.reference, 'hebergement': r.hebergement.name, 'montant': _fcfa(ligne.montant),
        'beneficiaire': beneficiaire, 'erreur': ligne.derniere_erreur or '—',
        'url_admin': f"{settings.BACKEND_URL}/admin/paiements/",
    })


def _traiter(qs, fonction, drapeau='notifie'):
    envoyes = 0
    for ligne in qs[:50]:
        try:
            fonction(ligne)
        except Exception:
            logger.exception("Email non envoyé pour %s %s (nouvel essai à la prochaine passe)", type(ligne).__name__, ligne.pk)
            continue
        type(ligne).objects.filter(pk=ligne.pk).update(**{drapeau: True})
        envoyes += 1
    return envoyes


def envoyer_notifications() -> int:
    relations = ('reservation__guest', 'reservation__hebergement__host')
    payes = PaiementModel.objects.filter(statut='reussi', reservation__status='confirmed').select_related(*relations)
    total = _traiter(payes.filter(notifie=False), reservation_payee_voyageur)
    total += _traiter(payes.filter(notifie_hote=False), reservation_payee_hote, drapeau='notifie_hote')
    total += _traiter(
        VersementModel.objects.filter(statut='envoye', notifie=False).select_related('hote', *relations),
        versement_envoye,
    )
    total += _traiter(
        VersementModel.objects.filter(statut='echoue', notifie=False).select_related('hote', *relations),
        lambda v: alerte_admin('Versement à un hôte', v, f"{v.hote.email} ({nom_operateur(v.mode)} {v.numero})"),
    )
    total += _traiter(
        RemboursementModel.objects.filter(statut='envoye', notifie=False).select_related('paiement', *relations),
        remboursement_envoye,
    )
    total += _traiter(
        RemboursementModel.objects.filter(statut='a_traiter', notifie=False).select_related('paiement', *relations),
        lambda rb: alerte_admin('Remboursement', rb, rb.reservation.guest.email),
    )
    return total
