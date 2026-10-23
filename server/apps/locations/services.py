"""Cycle d'une location de voiture (ou d'un chauffeur pour le véhicule du client).

    demande (véhicule, formule, lieux, dates, précisions) au moins `delai_min_jours` avant la prise
        → « en_attente_paiement » (même délai de paiement que les séjours)
        → paiement reçu → « confirmee » : les administrateurs sont prévenus pour attribuer
        → propriétaire et/ou chauffeur attribués (admin) → « partenaire_assigne » : le voyageur reçoit leurs
          coordonnées, eux le détail, et leurs versements sont planifiés
        → le worker paie le propriétaire et le chauffeur, puis passe la location à « terminee »
    annulation par le voyageur (CGV, annexe 1) : intégral jusqu'à `annulation_gratuite_heures` (48 h) avant la prise,
    50 % jusqu'à 24 h avant, rien ensuite ; délai de réflexion de 48 h au moins 7 jours avant (CGV, art. 10.3)
    annulation par Kwa-Ba (aucun propriétaire ou chauffeur disponible…) : remboursement intégral

Prix (CGV, art. 6.5) : prix du véhicule fixé par le propriétaire (aucun frais de service pour le client) ; chauffeur
7 000 FCFA par jour, dont 6 000 pour lui (6 500 au statut Excellence ou s'il est redemandé : « Mon chauffeur ») ; primes
de déplacement (1 500 FCFA par jour hors de Lomé, 2 000 hors du pays) reversées en totalité au chauffeur. Commission du
propriétaire : 15 %, 10 % pendant le Programme Fondateurs, 12 % après 20 locations sans incident.

Caution (voiture seule) : payée en ligne avec la location et gardée par Kwa-Ba, le voyageur ne règle rien au
propriétaire ; divisée par deux après 3 locations sans incident. Après le retour, le propriétaire a
`restitution_caution_heures` pour signaler un dommage à Kwa-Ba, qui enregistre une retenue (back-office) ; la caution
moins la retenue est alors remboursée au voyageur, la retenue versée au propriétaire. Une location annulée rend toujours
la caution.
"""
import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.paiements import services as paiements
from config.site import module_actif

from .models import (
    CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel, PartenaireLocationModel,
    VersementChauffeurLocationModel, VersementPartenaireModel,
)

logger = logging.getLogger('apps.locations')

DELAI_VERSEMENT = timedelta(hours=24)

# Chauffeur (offre mobilité, CGV art. 6.5, contrat chauffeur art. 3)
CHAUFFEUR_JOUR = 7000
PART_KWABA_JOUR = 1000
PART_KWABA_JOUR_REDUITE = 500  # Chauffeur Excellence ou « Mon chauffeur » : le chauffeur touche 6 500
PRIME_HORS_LOME = 1500
PRIME_HORS_PAYS = 2000
# Commission du propriétaire
COMMISSION_FONDATEUR = Decimal('10')
COMMISSION_FIDELE = Decimal('12')
LOCATIONS_FIDELE = 20
# Caution divisée par deux pour un client qui a fait 3 locations sans incident
LOCATIONS_CLIENT_FIDELE = 3
# Annulation (CGV, annexe 1) et délai de réflexion (art. 10.3)
DEMI_REMBOURSEMENT = timedelta(hours=24)
REFLEXION, REFLEXION_AVANT = timedelta(hours=48), timedelta(days=7)


class LocationErreur(Exception):
    """Erreur dont le message peut être affiché tel quel au voyageur."""


def _arrondi(montant) -> int:
    return int(Decimal(montant).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def categories_proposees():
    """Véhicules actifs, avec un prix, et dont l'assurance et la visite technique ne sont pas expirées."""
    aujourd_hui = timezone.localdate()
    return (CategorieVehiculeModel.objects.filter(actif=True, prix_jour__isnull=False)
            .filter(Q(sans_chauffeur=True) | Q(avec_chauffeur=True))
            .exclude(assurance_fin__lt=aujourd_hui).exclude(visite_technique_fin__lt=aujourd_hui)
            .exclude(proprietaire__actif=False)
            .prefetch_related('photos'))


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


# --- Taux -------------------------------------------------------------------------------------------

def taux_commission(params: ParametresLocationModel, partenaire: PartenaireLocationModel | None, jour=None) -> Decimal:
    """Commission du propriétaire en % : 15 (paramètres), 10 pendant le Programme Fondateurs, 12 au statut Fidèle."""
    taux = Decimal(params.commission_pourcent)
    if partenaire is None:
        return taux
    jour = jour or timezone.localdate()
    if partenaire.fondateur_debut and partenaire.fondateur_fin and partenaire.fondateur_debut <= jour <= partenaire.fondateur_fin:
        taux = min(taux, COMMISSION_FONDATEUR)
    if partenaire.locations.filter(statut='terminee', caution_retenue=0).count() >= LOCATIONS_FIDELE:
        taux = min(taux, COMMISSION_FIDELE)
    return taux


def client_sans_incident(voyageur) -> bool:
    """Au moins 3 locations terminées sans retenue sur la caution : caution divisée par deux."""
    if not voyageur or not getattr(voyageur, 'is_authenticated', False):
        return False
    return LocationModel.objects.filter(voyageur=voyageur, statut='terminee', caution_retenue=0).count() >= LOCATIONS_CLIENT_FIDELE


def mes_chauffeurs(voyageur):
    """Chauffeurs qui ont déjà conduit ce voyageur (location ou transfert terminés) : « Mon chauffeur »."""
    from apps.transferts.models import ChauffeurModel

    return ChauffeurModel.objects.filter(actif=True).filter(
        Q(locations__voyageur=voyageur, locations__statut='terminee')
        | Q(transferts__voyageur=voyageur, transferts__statut='termine'),
    ).distinct()


# --- Prix -------------------------------------------------------------------------------------------

@dataclass
class Devis:
    jours: int
    prix_jour: int
    frais_lieux: int
    prix_chauffeur: int
    primes: int
    prix: int
    commission: int
    part_kwaba_chauffeur: int
    caution: int


def chiffrer(params: ParametresLocationModel, categorie: CategorieVehiculeModel | None, formule: str,
             lieu_prise: LieuRemiseModel, lieu_retour: LieuRemiseModel, debut: datetime, fin: datetime,
             voyageur=None, jours_hors_lome: int = 0, jours_hors_pays: int = 0) -> Devis:
    jours = nombre_de_jours(debut, fin)
    if formule not in dict(LocationModel.FORMULES):
        raise LocationErreur("Formule inconnue.")
    if formule == 'sans_chauffeur' and not module_actif('location_sans_chauffeur'):
        # Hors de l'offre de lancement (interrupteur MODULE_LOCATION_SANS_CHAUFFEUR)
        raise LocationErreur("La location sans chauffeur n'est pas encore proposée.")
    avec_chauffeur = formule in ('avec_chauffeur', 'chauffeur_seul')
    if formule == 'chauffeur_seul':
        prix_jour, frais, caution, commission = 0, 0, 0, 0
    else:
        if categorie is None or not categorie.propose(formule):
            raise LocationErreur("Cette formule n'est pas proposée pour ce véhicule.")
        prix_jour = categorie.prix_jour
        frais = lieu_prise.frais + lieu_retour.frais
        taux = taux_commission(params, categorie.proprietaire)
        commission = _arrondi(Decimal(prix_jour * jours) * taux / 100)
        caution = categorie.caution if formule == 'sans_chauffeur' else 0
        if caution and client_sans_incident(voyageur):
            caution = _arrondi(Decimal(caution) / 2)
    if not avec_chauffeur:
        jours_hors_lome = jours_hors_pays = 0
    if jours_hors_lome < 0 or jours_hors_pays < 0 or jours_hors_lome + jours_hors_pays > jours:
        raise LocationErreur(f"Les jours hors de Lomé ne peuvent pas dépasser la durée de la location ({jours} jours).")
    prix_chauffeur = CHAUFFEUR_JOUR * jours if avec_chauffeur else 0
    primes = PRIME_HORS_LOME * jours_hors_lome + PRIME_HORS_PAYS * jours_hors_pays
    return Devis(
        jours=jours, prix_jour=prix_jour, frais_lieux=frais, prix_chauffeur=prix_chauffeur, primes=primes,
        prix=prix_jour * jours + frais + prix_chauffeur + primes, commission=commission,
        part_kwaba_chauffeur=PART_KWABA_JOUR * jours if avec_chauffeur else 0, caution=caution,
    )


def verifier_dates(params: ParametresLocationModel, debut: datetime, fin: datetime) -> None:
    if fin <= debut:
        raise LocationErreur("Le retour doit être après la prise du véhicule.")
    if debut - timezone.now() < timedelta(days=params.delai_min_jours):
        raise LocationErreur(
            f"Réservez au moins {params.delai_min_jours} jours avant : "
            "le propriétaire et le chauffeur ont besoin de ce délai pour se préparer."
        )
    if nombre_de_jours(debut, fin) > params.duree_max_jours:
        raise LocationErreur(f"La location est limitée à {params.duree_max_jours} jours.")


def creer(*, voyageur, categorie: CategorieVehiculeModel | None, formule: str, lieu_prise: LieuRemiseModel,
          lieu_retour: LieuRemiseModel, debut: datetime, fin: datetime, passagers: int, jours_hors_lome: int = 0,
          jours_hors_pays: int = 0, chauffeur_demande=None, **champs) -> LocationModel:
    params = ParametresLocationModel.courants()
    if not params or not active():
        raise LocationErreur("La location de voitures n'est pas encore disponible.")
    if formule == 'chauffeur_seul':
        categorie = None
    else:
        if categorie is None or not categories_proposees().filter(pk=categorie.pk).exists():
            raise LocationErreur("Ce véhicule n'est plus proposé.")
        if passagers > categorie.places:
            raise LocationErreur(f"Ce véhicule accueille {categorie.places} personnes au plus.")
    if not (lieu_prise.actif and lieu_retour.actif):
        raise LocationErreur("Ce lieu de remise n'est plus proposé.")
    for lieu, cle in ((lieu_prise, 'adresse_prise'), (lieu_retour, 'adresse_retour')):
        if lieu.adresse_requise and len(champs.get(cle, '').strip()) < 5:
            raise LocationErreur(f"Indiquez l'adresse pour « {lieu.nom} ».")
    if formule == 'sans_chauffeur' and not all(champs.get(c, '').strip() for c in ('conducteur', 'permis_numero', 'permis_pays')):
        raise LocationErreur("Pour conduire vous-même, indiquez le nom du conducteur et son permis de conduire.")
    if chauffeur_demande and (formule == 'sans_chauffeur' or not mes_chauffeurs(voyageur).filter(pk=chauffeur_demande.pk).exists()):
        raise LocationErreur("Vous ne pouvez redemander qu'un chauffeur qui vous a déjà conduit.")
    verifier_dates(params, debut, fin)

    if not paiements.reservation_possible():
        raise LocationErreur(paiements.INDISPONIBLE)
    devis = chiffrer(params, categorie, formule, lieu_prise, lieu_retour, debut, fin, voyageur=voyageur,
                     jours_hors_lome=jours_hors_lome, jours_hors_pays=jours_hors_pays)
    en_ligne = paiements.paiement_actif()
    return LocationModel.objects.create(
        voyageur=voyageur, categorie=categorie, formule=formule, lieu_prise=lieu_prise, lieu_retour=lieu_retour,
        debut=debut, fin=fin, passagers=passagers, jours=devis.jours, prix_jour=devis.prix_jour,
        frais_lieux=devis.frais_lieux, prix_chauffeur=devis.prix_chauffeur, primes=devis.primes, prix=devis.prix,
        commission=devis.commission, part_kwaba_chauffeur=devis.part_kwaba_chauffeur, caution=devis.caution,
        caution_en_ligne=params.caution_en_ligne and devis.caution > 0,
        jours_hors_lome=jours_hors_lome if devis.prix_chauffeur else 0,
        jours_hors_pays=jours_hors_pays if devis.prix_chauffeur else 0, chauffeur_demande=chauffeur_demande,
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
        objet=location, montant=location.montant_a_payer, moyen=moyen, voyageur=location.voyageur,
        description=f"Kwa-Ba {location.reference}, {location.libelle}, {location.lieu_prise.ville}",
        url_retour=f"{settings.FRONTEND_URL}/location/{location.id}",
    )


def appliquer_pack_sejour(location: LocationModel) -> int:
    """Pack Séjour + Chauffeur (CGV, art. 6.4) : un séjour Kwa-Ba à venir réservé avec une formule avec chauffeur a des
    frais de service ramenés à 3 % ; la différence est remboursée au voyageur. Renvoie le montant remboursé."""
    from apps.paiements import tarifs
    from apps.reservations.models import ReservationModel

    if not location.reservation_id or not location.avec_chauffeur:
        return 0
    r = ReservationModel.objects.select_for_update().filter(pk=location.reservation_id).first()
    if not r or r.guest_id != location.voyageur_id or r.status != 'confirmed' or r.check_in <= timezone.localdate():
        return 0
    if r.prix_nuits is None or r.frais_service is None:
        return 0
    nouveaux_frais = tarifs.arrondi(Decimal(r.prix_nuits) * tarifs.FRAIS_REDUITS)
    ecart = r.frais_service - nouveaux_frais
    if ecart <= 0:
        return 0
    r.frais_service, r.total_price = nouveaux_frais, r.prix_nuits + nouveaux_frais
    r.save(update_fields=['frais_service', 'total_price'])
    paiement = paiements.paiement_reussi(r)
    if paiement:
        paiements.rembourser(paiement, ecart, "Pack Séjour + Chauffeur : frais de service ramenés à 3 %")
    logger.info("Pack Séjour : %s FCFA rendus sur %s (location %s)", ecart, r.reference, location.reference)
    return ecart


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
    appliquer_pack_sejour(location)
    logger.info("Location %s payée : à attribuer", location.reference)


# --- Attribution ------------------------------------------------------------------------------------

def partenaires_disponibles(location: LocationModel):
    """Propriétaire du véhicule ; pour les anciennes catégories sans propriétaire, les loueurs qui la proposent à ce
    lieu de remise. Aucun pour un chauffeur seul."""
    if location.categorie_id is None:
        return PartenaireLocationModel.objects.none()
    if location.categorie.proprietaire_id:
        return PartenaireLocationModel.objects.filter(pk=location.categorie.proprietaire_id, actif=True)
    return PartenaireLocationModel.objects.filter(
        actif=True, categories=location.categorie, lieux=location.lieu_prise,
    ).distinct()


def chauffeurs_disponibles(location: LocationModel):
    """Chauffeurs partenaires actifs, le chauffeur redemandé (« Mon chauffeur ») et les Excellence d'abord."""
    from django.db.models import Case, IntegerField, Value, When

    from apps.transferts.models import ChauffeurModel

    return ChauffeurModel.objects.filter(actif=True).annotate(
        demande=Case(When(pk=location.chauffeur_demande_id, then=Value(0)), default=Value(1), output_field=IntegerField()),
    ).order_by('demande', '-excellence', 'prenom')


def _date_versement(location: LocationModel):
    """Propriétaire : 24 h après le début de la location ; avec une caution en ligne, après le retour et la fin du délai
    de signalement des dommages, pour verser la retenue éventuelle avec la location."""
    if location.caution_gardee:
        params = ParametresLocationModel.courants()
        return location.fin + max(DELAI_VERSEMENT, timedelta(hours=params.restitution_caution_heures if params else 24))
    return location.debut + DELAI_VERSEMENT


def _montants_versement(location: LocationModel, part: Decimal = Decimal(1)) -> dict:
    """Propriétaire : véhicule et frais de remise (et retenue sur la caution), moins la commission. `part` : fraction
    retenue après une annulation tardive."""
    brut = _arrondi(location.part_proprietaire * part) + location.caution_retenue
    commission = _arrondi(location.commission * part)
    return {'montant_brut': brut, 'commission': commission, 'montant': brut - commission}


def _montants_chauffeur(location: LocationModel, part: Decimal = Decimal(1)) -> dict:
    brut = _arrondi((location.prix_chauffeur + location.primes) * part)
    commission = _arrondi(location.part_kwaba_chauffeur * part)
    return {'montant_brut': brut, 'commission': commission, 'montant': brut - commission}


def attribuer(location: LocationModel, *, partenaire: PartenaireLocationModel | None = None, chauffeur=None,
              vehicule: str = '', immatriculation: str = ''):
    """Attribue (ou change) le propriétaire et/ou le chauffeur partenaire, enregistre le véhicule remis, planifie les
    versements. Le chauffeur touche 6 500 FCFA par jour au statut Excellence ou s'il a été redemandé."""
    with transaction.atomic():
        location = LocationModel.objects.select_for_update(of=('self',)).select_related('categorie').get(pk=location.pk)
        if location.statut not in ('confirmee', 'partenaire_assigne'):
            raise LocationErreur("Une location ne peut être attribuée que payée et non annulée.")
        if location.formule != 'chauffeur_seul' and not partenaire:
            raise LocationErreur("Choisissez le propriétaire du véhicule.")
        if location.formule == 'chauffeur_seul':
            partenaire = None
        if location.avec_chauffeur and not chauffeur:
            raise LocationErreur("Formule avec chauffeur : choisissez le chauffeur partenaire.")
        if not location.avec_chauffeur:
            chauffeur = None
        if partenaire and not partenaires_disponibles(location).filter(pk=partenaire.pk).exists():
            raise LocationErreur("Ce propriétaire ne fournit pas ce véhicule à ce lieu de remise.")

        changement = ((location.partenaire_id and location.partenaire_id != getattr(partenaire, 'pk', None))
                      or (location.chauffeur_partenaire_id and location.chauffeur_partenaire_id != getattr(chauffeur, 'pk', None)))
        location.partenaire, location.chauffeur_partenaire, location.statut = partenaire, chauffeur, 'partenaire_assigne'
        categorie = location.categorie
        location.vehicule = vehicule or (f"{categorie.exemple_modele or categorie.nom}" if categorie else '')
        location.immatriculation = immatriculation or (categorie.immatriculation if categorie else '')
        if chauffeur:
            location.chauffeur_nom, location.chauffeur_telephone = f"{chauffeur.prenom} {chauffeur.nom}", chauffeur.telephone
            reduite = chauffeur.excellence or chauffeur.pk == location.chauffeur_demande_id
            location.part_kwaba_chauffeur = (PART_KWABA_JOUR_REDUITE if reduite else PART_KWABA_JOUR) * location.jours
        else:
            location.chauffeur_nom = location.chauffeur_telephone = ''
        if changement:
            # Le voyageur reçoit les nouvelles coordonnées, et les nouveaux partenaires le détail
            location.partenaire_notifie = location.location_envoyee_partenaire = location.mission_envoyee_chauffeur = False
        location.save()

        if partenaire:
            VersementPartenaireModel.objects.update_or_create(location=location, defaults={
                'partenaire': partenaire, **_montants_versement(location), 'date_prevue': _date_versement(location),
                'statut': 'planifie',
            })
        else:
            VersementPartenaireModel.objects.filter(location=location, statut__in=('planifie', 'echoue')).update(statut='annule')
        if chauffeur:
            VersementChauffeurLocationModel.objects.update_or_create(location=location, defaults={
                'chauffeur': chauffeur, **_montants_chauffeur(location), 'date_prevue': location.fin + DELAI_VERSEMENT,
                'statut': 'planifie',
            })
        else:
            VersementChauffeurLocationModel.objects.filter(location=location, statut__in=('planifie', 'echoue')).update(statut='annule')
    logger.info("Location %s attribuée (propriétaire %s, chauffeur %s)", location.reference,
                getattr(partenaire, 'pk', None), getattr(chauffeur, 'pk', None))
    return location


# --- Annulation ----------------------------------------------------------------------------------

def retenue_si_annulation(location: LocationModel, maintenant=None) -> int:
    """Part du prix gardée si le voyageur annule maintenant (CGV, annexe 1 et art. 10.3)."""
    maintenant = maintenant or timezone.now()
    delai = location.debut - maintenant
    if maintenant - location.cree_le <= REFLEXION and delai >= REFLEXION_AVANT:
        return 0
    params = ParametresLocationModel.courants()
    if delai >= timedelta(hours=params.annulation_gratuite_heures if params else 48):
        return 0
    if delai >= DEMI_REMBOURSEMENT:
        return _arrondi(Decimal(location.prix) / 2)
    return location.prix


def annulation_gratuite(location: LocationModel) -> bool:
    return retenue_si_annulation(location) == 0


def annuler(location: LocationModel, par: str) -> int:
    """Annule la location ; renvoie le montant remboursé au voyageur. En cas d'annulation tardive, la part retenue est
    versée au propriétaire et au chauffeur, au prorata."""
    with transaction.atomic():
        location = LocationModel.objects.select_for_update().get(pk=location.pk)
        if location.statut in ('annulee', 'terminee'):
            raise LocationErreur("Cette location ne peut plus être annulée.")
        if par == 'voyageur' and location.debut <= timezone.now():
            raise LocationErreur("La location a commencé : elle ne peut plus être annulée.")

        rembourse = 0
        paiement = location.paiements.filter(statut='reussi').order_by('cree_le').first()
        if paiement:
            retenu = retenue_si_annulation(location) if par == 'voyageur' else 0
            rembourse = location.prix - retenu
            part = Decimal(retenu) / location.prix if location.prix else Decimal(0)
            for modele, montants in ((VersementPartenaireModel, _montants_versement), (VersementChauffeurLocationModel, _montants_chauffeur)):
                for v in modele.objects.select_for_update().filter(location=location, statut__in=('planifie', 'echoue')):
                    if part:
                        for champ, valeur in montants(location, part).items():
                            setattr(v, champ, valeur)
                        v.statut = 'planifie'
                    else:
                        v.statut = 'annule'
                    v.save()
            # La caution est toujours rendue : le véhicule n'a pas été remis
            if location.caution_gardee and not location.caution_restituee_le:
                rembourse += location.caution_gardee
                location.caution_retenue, location.caution_restituee_le = 0, timezone.now()
            motif = "Annulation par le voyageur" if par == 'voyageur' else "Annulation par Kwa-Ba"
            paiements.rembourser(paiement, rembourse, motif)

        location.statut, location.annulee_par, location.annulee_le = 'annulee', par, timezone.now()
        location.save(update_fields=['statut', 'annulee_par', 'annulee_le', 'caution_retenue', 'caution_restituee_le'])
        return rembourse


def retenir_caution(location: LocationModel, montant: int, motif: str) -> LocationModel:
    """Retenue sur la caution (dommage, carburant manquant… signalé par le propriétaire), avant sa restitution. Elle est
    versée au propriétaire avec la location ; 0 annule la retenue."""
    with transaction.atomic():
        location = LocationModel.objects.select_for_update().get(pk=location.pk)
        if not location.caution_gardee:
            raise LocationErreur("Cette location n'a pas de caution gardée par Kwa-Ba.")
        if location.statut != 'partenaire_assigne' or location.caution_restituee_le:
            raise LocationErreur("La caution a déjà été restituée, ou la location n'est plus en cours.")
        if location.debut > timezone.now():
            raise LocationErreur("Le véhicule n'a pas encore été remis : rien à retenir sur la caution.")
        if not 0 <= montant <= location.caution:
            raise LocationErreur(f"La retenue doit être comprise entre 0 et la caution ({location.caution} FCFA).")
        if montant and not motif.strip():
            raise LocationErreur("Indiquez le motif de la retenue : il est communiqué au voyageur.")
        location.caution_retenue, location.caution_motif = montant, motif.strip() if montant else ''
        location.save(update_fields=['caution_retenue', 'caution_motif'])
        VersementPartenaireModel.objects.filter(location=location, statut__in=('planifie', 'echoue')).update(
            **_montants_versement(location),
        )
    logger.info("Retenue de %s FCFA sur la caution de %s", montant, location.reference)
    return location


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


def restituer_cautions() -> int:
    """Fin du délai de signalement des dommages : rembourse au voyageur la caution moins la retenue."""
    params = ParametresLocationModel.courants()
    limite = timezone.now() - timedelta(hours=params.restitution_caution_heures if params else 24)
    restituees = 0
    a_restituer = LocationModel.objects.filter(
        statut='partenaire_assigne', caution_en_ligne=True, caution__gt=0, caution_restituee_le__isnull=True,
        fin__lte=limite,
    ).values_list('pk', flat=True)[:50]
    for pk in a_restituer:
        with transaction.atomic():
            loc = LocationModel.objects.select_for_update().get(pk=pk)
            if loc.caution_restituee_le:
                continue
            paiement = loc.paiements.filter(statut='reussi').order_by('cree_le').first()
            if paiement:
                paiements.rembourser(paiement, loc.caution - loc.caution_retenue, "Restitution de la caution")
            loc.caution_restituee_le = timezone.now()
            loc.save(update_fields=['caution_restituee_le'])
            restituees += 1
    return restituees


def envoyer_versements_partenaires() -> int:
    if not paiements.fedapay_actif():
        return 0
    envoyes = 0
    maintenant = timezone.now()
    # Annulation tardive : la location est annulée, mais la part retenue reste versée au prorata
    statuts = ('partenaire_assigne', 'annulee')
    # Caution en ligne : le propriétaire est payé une fois la caution réglée (la retenue éventuelle s'ajoute)
    dus = VersementPartenaireModel.objects.filter(
        statut='planifie', date_prevue__lte=maintenant, location__statut__in=statuts,
    ).exclude(
        location__caution_en_ligne=True, location__caution__gt=0, location__caution_restituee_le__isnull=True,
    ).select_related('partenaire')[:50]
    for v in dus:
        p = v.partenaire
        envoyes += paiements.envoyer_payout(
            v, mode=p.operateur_versement, numero=p.numero_versement, pays=p.pays_versement,
            email=p.email or settings.DEFAULT_FROM_EMAIL, titulaire=p.contact,
        )
    chauffeurs = VersementChauffeurLocationModel.objects.filter(
        statut='planifie', date_prevue__lte=maintenant, location__statut__in=statuts,
    ).select_related('chauffeur')[:50]
    for v in chauffeurs:
        c = v.chauffeur
        envoyes += paiements.envoyer_payout(
            v, mode=c.operateur_versement, numero=c.numero_versement, pays=c.pays_versement,
            email=c.email or settings.DEFAULT_FROM_EMAIL, titulaire=f"{c.prenom} {c.nom}",
        )
    for modele in (VersementPartenaireModel, VersementChauffeurLocationModel):
        for v in modele.objects.filter(statut='en_cours').exclude(payout_id='')[:50]:
            paiements.synchroniser_payout(v)
    # Propriétaire et chauffeur payés : la location est terminée
    (LocationModel.objects.filter(statut='partenaire_assigne')
     .filter(Q(versement__isnull=False) | Q(versement_chauffeur__isnull=False))
     .exclude(Q(versement__isnull=False) & ~Q(versement__statut__in=('envoye', 'annule')))
     .exclude(Q(versement_chauffeur__isnull=False) & ~Q(versement_chauffeur__statut__in=('envoye', 'annule')))
     .update(statut='terminee'))
    return envoyes


def passe() -> dict:
    from . import notifications  # import local : notifications importe les modèles

    return {
        'locations_expirees': expirer(),
        'cautions_restituees': restituer_cautions(),
        'versements_loueurs': envoyer_versements_partenaires(),
        'emails_locations': notifications.envoyer_notifications(),
    }
