"""Emails des locations, envoyés par le worker (même principe que apps.transferts.notifications)."""
import logging
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import formats, timezone

from apps.paiements.notifications import _admins, _documents, _envoyer, _fcfa, alerte_admin
from apps.securite import coordonnees

from .models import LocationModel, VersementPartenaireModel

logger = logging.getLogger('apps.locations.notifications')

ALERTE_SANS_PARTENAIRE = timedelta(hours=48)


def _date(location: LocationModel, moment) -> str:
    return formats.date_format(moment.astimezone(ZoneInfo(location.lieu_prise.fuseau)), 'l j F Y à H\\hi')


def _location(loc: LocationModel) -> dict:
    return {
        'reference': loc.reference, 'categorie': loc.categorie.nom, 'exemple': loc.categorie.exemple_modele,
        'formule': loc.get_formule_display(), 'avec_chauffeur': loc.formule == 'avec_chauffeur',
        'prise': f"{loc.lieu_prise.nom}{', ' + loc.adresse_prise if loc.adresse_prise else ''}",
        'retour': f"{loc.lieu_retour.nom}{', ' + loc.adresse_retour if loc.adresse_retour else ''}",
        'debut': _date(loc, loc.debut), 'fin': _date(loc, loc.fin), 'jours': loc.jours, 'passagers': loc.passagers,
        'precisions': loc.precisions, 'voyageur': f"{loc.voyageur.first_name} {loc.voyageur.last_name}".strip(),
        'telephone_voyageur': loc.telephone, 'conducteur': loc.conducteur, 'permis': loc.permis_numero,
        'permis_pays': loc.permis_pays, 'caution': _fcfa(loc.caution) if loc.caution else '',
        'url': f"{settings.FRONTEND_URL}/location/{loc.id}",
    }


def confirmee(loc: LocationModel):
    _envoyer('emails/locations/location_confirmee.txt', f"Location confirmée : {loc.lieu_prise.ville}", [loc.voyageur.email], {
        **_location(loc), 'prenom': loc.voyageur.first_name, 'montant': _fcfa(loc.prix),
    }, pieces_jointes=_documents(loc))


def a_attribuer(loc: LocationModel, urgent: bool = False):
    destinataires = _admins()
    if not destinataires:
        logger.error("Location %s à attribuer mais aucun administrateur à prévenir", loc.reference)
        return
    from .services import partenaires_disponibles

    sujet = f"[Kwa-Ba] {'URGENT : ' if urgent else ''}Loueur à attribuer : {loc.reference}"
    _envoyer('emails/locations/a_attribuer.txt', sujet, destinataires, {
        **_location(loc), 'urgent': urgent, 'nb_partenaires': partenaires_disponibles(loc).count(),
        'url_admin': f"{settings.BACKEND_URL}/admin/locations/locationmodel/{loc.id}/change/",
    })


def partenaire_au_voyageur(loc: LocationModel):
    p = loc.partenaire
    _envoyer('emails/locations/partenaire_assigne.txt', f"Votre véhicule à {loc.lieu_prise.ville}", [loc.voyageur.email], {
        **_location(loc), 'prenom': loc.voyageur.first_name, 'partenaire': p.nom, 'contact': p.contact,
        'telephone_partenaire': p.telephone, 'vehicule': loc.vehicule, 'immatriculation': loc.immatriculation,
        'chauffeur': loc.chauffeur_nom, 'telephone_chauffeur': loc.chauffeur_telephone,
        'assistance': settings.ASSISTANCE_CONTACT,
    })


def location_au_partenaire(loc: LocationModel):
    """Le loueur ne reçoit pas le téléphone du voyageur (ni ceux glissés dans ses précisions ou son adresse) : pour le joindre, il
    passe par Kwa-Ba. Le voyageur reçoit, lui, les coordonnées du loueur par email (partenaire_au_voyageur)."""
    p = loc.partenaire
    if not p.email:
        return  # loueur prévenu par téléphone par l'équipe
    infos = _location(loc)
    del infos['telephone_voyageur']
    sans_coordonnees = {cle: coordonnees.analyser(infos[cle])[0] for cle in ('prise', 'retour', 'precisions')}
    _envoyer('emails/locations/location_partenaire.txt', f"Nouvelle location Kwa-Ba : {_date(loc, loc.debut)}", [p.email], {
        **infos, **sans_coordonnees, 'contact': p.contact,
        'montant': _fcfa(loc.montant_partenaire), 'assistance': settings.ASSISTANCE_CONTACT,
    })


def versement_au_partenaire(v: VersementPartenaireModel):
    p, loc = v.partenaire, v.location
    if not p.email:
        return
    _envoyer('emails/locations/versement_partenaire.txt', f"Versement de {_fcfa(v.montant)} envoyé", [p.email], {
        'contact': p.contact, 'reference': loc.reference, 'debut': _date(loc, loc.debut), 'montant': _fcfa(v.montant),
        'montant_brut': _fcfa(v.montant_brut), 'commission': _fcfa(v.commission),
    })


def _traiter(qs, fonction, drapeau):
    envoyes = 0
    for ligne in qs[:50]:
        try:
            fonction(ligne)
        except Exception:
            logger.exception("Email non envoyé pour %s (nouvel essai à la prochaine passe)", ligne.pk)
            continue
        type(ligne).objects.filter(pk=ligne.pk).update(**{drapeau: True})
        envoyes += 1
    return envoyes


def envoyer_notifications() -> int:
    qs = LocationModel.objects.select_related('voyageur', 'categorie', 'lieu_prise', 'lieu_retour', 'partenaire')
    payees = qs.filter(statut__in=('confirmee', 'partenaire_assigne'))
    total = _traiter(payees.filter(confirmation_notifiee=False), confirmee, 'confirmation_notifiee')
    total += _traiter(payees.filter(admins_notifies=False), a_attribuer, 'admins_notifies')
    total += _traiter(
        qs.filter(statut='confirmee', alerte_sans_partenaire=False, debut__lte=timezone.now() + ALERTE_SANS_PARTENAIRE),
        lambda loc: a_attribuer(loc, urgent=True), 'alerte_sans_partenaire',
    )
    assignees = qs.filter(statut='partenaire_assigne')
    total += _traiter(assignees.filter(partenaire_notifie=False), partenaire_au_voyageur, 'partenaire_notifie')
    total += _traiter(assignees.filter(location_envoyee_partenaire=False), location_au_partenaire, 'location_envoyee_partenaire')

    versements = VersementPartenaireModel.objects.select_related('partenaire', 'location__lieu_prise')
    total += _traiter(versements.filter(statut='envoye', notifie=False), versement_au_partenaire, 'notifie')
    total += _traiter(
        versements.filter(statut='echoue', notifie=False),
        lambda v: alerte_admin(
            'Versement à un loueur', v, f"{v.partenaire} ({v.mode} {v.numero})",
            reference=v.location.reference, libelle=f"Location {v.location.lieu_prise.ville}", section='locations',
        ),
        'notifie',
    )
    return total
