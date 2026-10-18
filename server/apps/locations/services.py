"""Cycle d'une location de voiture.

    demande (catégorie, formule, lieux, dates, précisions) au moins `delai_min_jours` avant la prise
        → « en_attente_paiement » (même délai de paiement que les séjours)
        → paiement reçu → « confirmee » : les administrateurs sont prévenus pour attribuer un loueur
        → loueur attribué (admin) → « partenaire_assigne » : le voyageur reçoit ses coordonnées, le loueur le détail,
          et le versement du loueur est planifié (retour du véhicule + 24 h)
        → le worker paie le loueur et passe la location à « terminee »
    annulation par le voyageur : remboursement intégral jusqu'à `annulation_gratuite_heures` avant la prise, rien ensuite
    annulation par Kwa-Ba (aucun loueur disponible…) : remboursement intégral
"""
import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.paiements import services as paiements

from .models import (
    CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel, PartenaireLocationModel,
    VersementPartenaireModel,
)

logger = logging.getLogger('apps.locations')

DELAI_VERSEMENT = timedelta(hours=24)


class LocationErreur(Exception):
    """Erreur dont le message peut être affiché tel quel au voyageur."""


def categories_proposees():
    """Catégories actives qui ont au moins une formule avec un prix."""
    return CategorieVehiculeModel.objects.filter(actif=True).exclude(
        prix_jour_sans_chauffeur__isnull=True, prix_jour_avec_chauffeur__isnull=True,
    )


def active() -> bool:
    """La location n'est proposée que si l'administration l'a entièrement paramétrée."""
    return (ParametresLocationModel.courants() is not None and categories_proposees().exists()
            and LieuRemiseModel.objects.filter(actif=True).exists())


def heure_locale(lieu: LieuRemiseModel, naive: datetime) -> datetime:
    """Heure saisie par le voyageur (heure locale du lieu de remise) → datetime avec fuseau."""
    return naive.replace(tzinfo=ZoneInfo(lieu.fuseau))


def nombre_de_jours(debut: datetime, fin: datetime) -> int:
    """Par tranche de 24 h entamée (prise à 10 h, retour le lendemain à 12 h : 2 jours)."""
    return max(1, math.ceil((fin - debut) / timedelta(hours=24)))


@dataclass
class Devis:
    jours: int
    prix_jour: int
    frais_lieux: int
    prix: int
    commission: int
    caution: int


def chiffrer(params: ParametresLocationModel, categorie: CategorieVehiculeModel, formule: str,
             lieu_prise: LieuRemiseModel, lieu_retour: LieuRemiseModel, debut: datetime, fin: datetime) -> Devis:
    prix_jour = categorie.prix_jour(formule)
    if prix_jour is None:
        raise LocationErreur("Cette formule n'est pas proposée pour ce véhicule.")
    jours = nombre_de_jours(debut, fin)
    frais = lieu_prise.frais + lieu_retour.frais
    prix = prix_jour * jours + frais
    commission = int((Decimal(prix) * params.commission_pourcent / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    return Devis(jours=jours, prix_jour=prix_jour, frais_lieux=frais, prix=prix, commission=commission,
                 caution=categorie.caution if formule == 'sans_chauffeur' else 0)


def verifier_dates(params: ParametresLocationModel, debut: datetime, fin: datetime) -> None:
    if fin <= debut:
        raise LocationErreur("Le retour doit être après la prise du véhicule.")
    if debut - timezone.now() < timedelta(days=params.delai_min_jours):
        raise LocationErreur(
            f"Réservez au moins {params.delai_min_jours} jours avant la prise du véhicule : "
            "le loueur a besoin de ce délai pour le préparer."
        )
    if nombre_de_jours(debut, fin) > params.duree_max_jours:
        raise LocationErreur(f"La location est limitée à {params.duree_max_jours} jours.")


def creer(*, voyageur, categorie: CategorieVehiculeModel, formule: str, lieu_prise: LieuRemiseModel,
          lieu_retour: LieuRemiseModel, debut: datetime, fin: datetime, passagers: int, **champs) -> LocationModel:
    params = ParametresLocationModel.courants()
    if not params or not active():
        raise LocationErreur("La location de voitures n'est pas encore disponible.")
    if not categories_proposees().filter(pk=categorie.pk).exists():
        raise LocationErreur("Ce véhicule n'est plus proposé.")
    if not (lieu_prise.actif and lieu_retour.actif):
        raise LocationErreur("Ce lieu de remise n'est plus proposé.")
    if passagers > categorie.places:
        raise LocationErreur(f"Ce véhicule accueille {categorie.places} personnes au plus.")
    for lieu, cle in ((lieu_prise, 'adresse_prise'), (lieu_retour, 'adresse_retour')):
        if lieu.adresse_requise and len(champs.get(cle, '').strip()) < 5:
            raise LocationErreur(f"Indiquez l'adresse de livraison pour « {lieu.nom} ».")
    if formule == 'sans_chauffeur' and not all(champs.get(c, '').strip() for c in ('conducteur', 'permis_numero', 'permis_pays')):
        raise LocationErreur("Pour conduire vous-même, indiquez le nom du conducteur et son permis de conduire.")
    verifier_dates(params, debut, fin)

    if not paiements.reservation_possible():
        raise LocationErreur(paiements.INDISPONIBLE)
    devis = chiffrer(params, categorie, formule, lieu_prise, lieu_retour, debut, fin)
    en_ligne = paiements.paiement_actif()
    return LocationModel.objects.create(
        voyageur=voyageur, categorie=categorie, formule=formule, lieu_prise=lieu_prise, lieu_retour=lieu_retour,
        debut=debut, fin=fin, passagers=passagers, jours=devis.jours, prix_jour=devis.prix_jour,
        frais_lieux=devis.frais_lieux, prix=devis.prix, commission=devis.commission, caution=devis.caution,
        statut='en_attente_paiement' if en_ligne else 'confirmee',
        expire_le=timezone.now() + paiements.delai_paiement() if en_ligne else None,
        **champs,
    )


def demarrer_paiement(location: LocationModel, moyen: str) -> str:
    if location.statut != 'en_attente_paiement':
        raise paiements.PaiementErreur("Cette location n'attend pas de paiement.")
    if location.expire_le and location.expire_le <= timezone.now():
        raise paiements.PaiementErreur("Le délai de paiement est dépassé. Refaites la demande de location.")
    if location.moyen != moyen:
        location.moyen = moyen
        location.save(update_fields=['moyen'])
    return paiements.creer_paiement(
        objet=location, montant=location.prix, moyen=moyen, voyageur=location.voyageur,
        description=f"Kwa-Ba {location.reference}, location {location.categorie.nom}, {location.lieu_prise.ville}",
        url_retour=f"{settings.FRONTEND_URL}/location/{location.id}",
    )


def paiement_recu(paiement):
    """Appelé par apps.paiements, dans sa transaction, quand un paiement de location réussit."""
    location = LocationModel.objects.select_for_update().get(pk=paiement.location_id)
    if location.paiements.filter(statut='reussi').exclude(pk=paiement.pk).exists():
        paiements.rembourser(paiement, paiement.montant, "Paiement reçu en double")
        return
    if location.statut == 'annulee' and location.annulee_par != 'expiration':
        paiements.rembourser(paiement, paiement.montant, "Location annulée avant la confirmation du paiement")
        return
    location.statut, location.expire_le = 'confirmee', None
    location.annulee_par, location.annulee_le = '', None
    location.save(update_fields=['statut', 'expire_le', 'annulee_par', 'annulee_le'])
    logger.info("Location %s payée : loueur à attribuer", location.reference)


def partenaires_disponibles(location: LocationModel):
    """Loueurs actifs qui proposent cette catégorie au lieu de remise."""
    return PartenaireLocationModel.objects.filter(
        actif=True, categories=location.categorie, lieux=location.lieu_prise,
    ).distinct()


def assigner_partenaire(location: LocationModel, partenaire: PartenaireLocationModel, **vehicule):
    """Attribue (ou change) le loueur, enregistre le véhicule (et le chauffeur), planifie le versement."""
    with transaction.atomic():
        location = LocationModel.objects.select_for_update().get(pk=location.pk)
        if location.statut not in ('confirmee', 'partenaire_assigne'):
            raise LocationErreur("Un loueur ne peut être attribué qu'à une location payée et non annulée.")
        changement = location.partenaire_id not in (None, partenaire.pk)
        location.partenaire, location.statut = partenaire, 'partenaire_assigne'
        for champ, valeur in vehicule.items():
            setattr(location, champ, valeur)
        if changement:
            # Le voyageur reçoit les coordonnées du nouveau loueur, et celui-ci le détail de la location
            location.partenaire_notifie = location.location_envoyee_partenaire = False
        location.save()
        VersementPartenaireModel.objects.update_or_create(
            location=location,
            defaults={
                'partenaire': partenaire, 'montant_brut': location.prix, 'commission': location.commission,
                'montant': location.montant_partenaire, 'date_prevue': location.fin + DELAI_VERSEMENT,
                'statut': 'planifie',
            },
        )
    logger.info("Loueur %s attribué à la location %s", partenaire.pk, location.reference)


def annulation_gratuite(location: LocationModel) -> bool:
    params = ParametresLocationModel.courants()
    heures = params.annulation_gratuite_heures if params else 0
    return location.debut - timezone.now() > timedelta(hours=heures)


def annuler(location: LocationModel, par: str) -> int:
    """Annule la location ; renvoie le montant remboursé au voyageur."""
    with transaction.atomic():
        location = LocationModel.objects.select_for_update().get(pk=location.pk)
        if location.statut in ('annulee', 'terminee'):
            raise LocationErreur("Cette location ne peut plus être annulée.")
        if par == 'voyageur' and location.debut <= timezone.now():
            raise LocationErreur("La location a commencé : elle ne peut plus être annulée.")

        rembourse = 0
        paiement = location.paiements.filter(statut='reussi').order_by('cree_le').first()
        if paiement:
            if par != 'voyageur' or annulation_gratuite(location):
                rembourse = location.prix
                VersementPartenaireModel.objects.filter(location=location, statut__in=('planifie', 'echoue')).update(
                    statut='annule',
                )
            # Hors délai d'annulation gratuite : le loueur a préparé le véhicule, il reste payé
            motif = "Annulation par le voyageur" if par == 'voyageur' else "Annulation par Kwa-Ba"
            paiements.rembourser(paiement, rembourse, motif)

        location.statut, location.annulee_par, location.annulee_le = 'annulee', par, timezone.now()
        location.save(update_fields=['statut', 'annulee_par', 'annulee_le'])
        return rembourse


# --- Worker ------------------------------------------------------------------------------

def expirer() -> int:
    expirees = 0
    maintenant = timezone.now()
    for location in LocationModel.objects.filter(statut='en_attente_paiement', expire_le__lte=maintenant):
        for paiement in location.paiements.filter(statut='en_attente'):
            paiements.synchroniser_paiement(paiement)
        expirees += LocationModel.objects.filter(pk=location.pk, statut='en_attente_paiement').update(
            statut='annulee', annulee_par='expiration', annulee_le=maintenant,
        )
    return expirees


def envoyer_versements_partenaires() -> int:
    if not paiements.fedapay_actif():
        return 0
    envoyes = 0
    dus = VersementPartenaireModel.objects.filter(
        statut='planifie', date_prevue__lte=timezone.now(), location__statut='partenaire_assigne',
    ).select_related('partenaire')[:50]
    for v in dus:
        p = v.partenaire
        envoyes += paiements.envoyer_payout(
            v, mode=p.operateur_versement, numero=p.numero_versement, pays=p.pays_versement,
            email=p.email or settings.DEFAULT_FROM_EMAIL, titulaire=p.contact,
        )
    for v in VersementPartenaireModel.objects.filter(statut='en_cours').exclude(payout_id='')[:50]:
        paiements.synchroniser_payout(v)
    # Loueur payé : la location est terminée
    LocationModel.objects.filter(statut='partenaire_assigne', versement__statut='envoye').update(statut='terminee')
    return envoyes


def passe() -> dict:
    from . import notifications  # import local : notifications importe les modèles

    return {
        'locations_expirees': expirer(),
        'versements_loueurs': envoyer_versements_partenaires(),
        'emails_locations': notifications.envoyer_notifications(),
    }
