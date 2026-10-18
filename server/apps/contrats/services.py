"""Contrats : émission (texte figé, variables remplacées), lien de signature personnel, signature et preuves.

Parcours :
1. Kwa-Ba émet le contrat (le back-office pour un loueur, un chauffeur ou une ONG ; automatiquement pour un
   hôte, qui le signe depuis son espace). Le représentant légal de Kwa-Ba en est le signataire.
2. La partie reçoit un lien personnel (valable 30 jours, stocké haché), lit le contrat, tape son nom,
   dessine sa signature et accepte expressément.
3. Le PDF signé (avec certificat de signature) est figé, son empreinte SHA-256 conservée, et envoyé aux
   deux parties.
"""
import base64
import binascii
import hashlib
import logging
import re
import secrets
from datetime import timedelta
from io import BytesIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.template.loader import render_to_string
from django.utils import timezone
from PIL import Image, UnidentifiedImageError

from apps.documents.models import ParametresSocieteModel
from apps.documents.pdf import date
from apps.notifications.infrastructure.email.envoi import send_mail

from .models import ContratModel, ModeleContratModel, hacher_jeton

logger = logging.getLogger('apps.contrats')

VALIDITE_LIEN = timedelta(days=30)
TAILLE_MAX_SIGNATURE = 400_000  # octets, image dessinée encodée en base64 comprise

DESIGNATIONS = {'hote': "l'Hôte", 'loueur': 'le Loueur', 'chauffeur': 'le Chauffeur', 'ong': "l'Association"}

# Variables utilisables dans les modèles (affichées dans l'éditeur du back-office)
VARIABLES = {
    'societe.raison_sociale': 'Raison sociale de Kwa-Ba', 'societe.forme_juridique': 'Forme juridique',
    'societe.adresse': 'Adresse du siège', 'societe.pays': 'Pays', 'societe.rccm': 'RCCM', 'societe.nif': 'NIF',
    'societe.site': 'Site web', 'societe.representant': 'Représentant légal et sa qualité',
    'partie.nom': 'Nom de la partie', 'partie.email': 'Email', 'partie.telephone': 'Téléphone',
    'partie.coordonnees': "« joignable au … et à l'adresse … »", 'partie.details': 'Précisions (véhicule, enregistrement…)', 'partie.designation': "« l'Hôte », « le Loueur »…",
    'date': "Date d'émission", 'tarifs.frais_voyageur': 'Frais de service voyageur (%)',
    'tarifs.commission_hote': 'Commission hôte (%)', 'tarifs.commission_chauffeur': 'Commission chauffeur (%)',
    'tarifs.commission_loueur': 'Commission loueur (%)', 'tarifs.delai_location': 'Délai minimal de réservation (jours)',
    'give.jour_reversement': 'Jour du reversement mensuel aux ONG',
}
_VARIABLE = re.compile(r'\{\{\s*([\w.]+)\s*\}\}')
FACULTATIVES = {'partie.details', 'partie.coordonnees'}


class ContratErreur(Exception):
    """Message affichable."""


# --- Texte -----------------------------------------------------------------------------------------

def _pourcent(valeur) -> str:
    texte = f"{float(valeur):.2f}".rstrip('0').rstrip('.').replace('.', ',')
    return f"{texte} %"


def _tarifs() -> dict:
    from apps.give.montants import JOUR_REVERSEMENT
    from apps.locations.models import ParametresLocationModel
    from apps.paiements.tarifs import COMMISSION_HOTE, FRAIS_VOYAGEUR
    from apps.transferts.tarifs import COMMISSION_CHAUFFEUR

    location = ParametresLocationModel.objects.first()
    return {
        'tarifs.frais_voyageur': _pourcent(FRAIS_VOYAGEUR * 100), 'tarifs.commission_hote': _pourcent(COMMISSION_HOTE * 100),
        'tarifs.commission_chauffeur': _pourcent(COMMISSION_CHAUFFEUR * 100),
        'tarifs.commission_loueur': _pourcent(location.commission_pourcent) if location else '',
        'tarifs.delai_location': str(location.delai_min_jours) if location else '2',
        'give.jour_reversement': str(JOUR_REVERSEMENT),
    }


def _nom(u) -> str:
    return f"{u.first_name} {u.last_name}".strip() or u.email


def partie(type_contrat: str, objet) -> dict:
    """Coordonnées de la partie, copiées dans le contrat, et le lien vers elle."""
    if type_contrat == 'hote':
        return {'nom': _nom(objet), 'email': objet.email, 'telephone': objet.phone or '', 'details': '', 'lien': {'hote': objet}}
    if type_contrat == 'chauffeur':
        return {'nom': f"{objet.prenom} {objet.nom}", 'email': objet.email, 'telephone': objet.telephone,
                'details': f"chauffeur, véhicule {objet.vehicule} immatriculé {objet.immatriculation},", 'lien': {'chauffeur': objet}}
    if type_contrat == 'loueur':
        return {'nom': objet.nom, 'email': objet.email, 'telephone': objet.telephone,
                'details': f"représenté par {objet.contact}," if objet.contact else '', 'lien': {'loueur': objet}}
    precisions = [f"association enregistrée sous le n° {objet.numero_enregistrement}" if objet.numero_enregistrement else '',
                  f"représentée par {objet.contact_nom}" if objet.contact_nom else '']
    return {'nom': objet.nom, 'email': objet.contact_email, 'telephone': objet.contact_telephone,
            'details': ''.join(f"{x}, " for x in precisions if x).strip(), 'lien': {'organisation': objet}}


def _coordonnees(telephone: str, email: str) -> str:
    """« joignable au … et à l'adresse … », sans la partie manquante."""
    morceaux = [f"au {telephone}" if telephone else '', f"à l'adresse {email}" if email else '']
    return f"joignable {' et '.join(m for m in morceaux if m)}" if any(morceaux) else ''


def contexte(type_contrat: str, infos: dict) -> dict:
    s = ParametresSocieteModel.courants()
    representant = ', '.join(x for x in (s.representant_nom, s.representant_qualite) if x) or 'son représentant légal'
    return {
        'societe.raison_sociale': s.raison_sociale or s.nom_commercial, 'societe.forme_juridique': s.forme_juridique,
        'societe.adresse': s.adresse, 'societe.pays': s.pays, 'societe.rccm': s.rccm, 'societe.nif': s.nif,
        'societe.site': s.site, 'societe.representant': representant,
        'partie.nom': infos['nom'], 'partie.email': infos['email'], 'partie.telephone': infos['telephone'],
        'partie.coordonnees': _coordonnees(infos['telephone'], infos['email']),
        'partie.details': infos['details'], 'partie.designation': DESIGNATIONS[type_contrat],
        'date': date(timezone.now()), **_tarifs(),
    }


def rendre(corps: str, valeurs: dict) -> str:
    """Remplace les variables ; une valeur manquante reste visible pour être complétée (« [à compléter] »)."""
    def valeur(m):
        cle = m.group(1)
        return str(valeurs.get(cle) or ('' if cle in FACULTATIVES else '[à compléter]'))

    texte = _VARIABLE.sub(valeur, corps)
    # Une précision vide laisse « , , » ou un espace avant la virgule : on nettoie
    texte = re.sub(r' +([,.])', r'\1', re.sub(r',[ \t]*,', ',', texte))
    return re.sub(r'[ \t]{2,}', ' ', texte)


def blocs(corps: str) -> list[dict]:
    """Paragraphes du contrat : {'type': 'titre' | 'texte', 'texte': …}. « ## » en tête = titre d'article."""
    resultat = []
    for paragraphe in re.split(r'\n\s*\n', corps.strip()):
        paragraphe = paragraphe.strip()
        if not paragraphe:
            continue
        if paragraphe.startswith('## '):
            titre, _, reste = paragraphe[3:].partition('\n')
            resultat.append({'type': 'titre', 'texte': titre.strip()})
            if reste.strip():
                resultat.append({'type': 'texte', 'texte': reste.strip()})
        else:
            resultat.append({'type': 'texte', 'texte': paragraphe})
    return resultat


# --- Signature dessinée ----------------------------------------------------------------------------

def signature_png(contenu: bytes, fond_blanc_transparent=False) -> bytes:
    """Image de signature vérifiée, recadrée et ré-encodée en PNG (aucune donnée d'origine conservée)."""
    try:
        with Image.open(BytesIO(contenu)) as sonde:
            if sonde.format not in ('PNG', 'JPEG', 'WEBP'):
                raise ContratErreur("Signature : format d'image non pris en charge.")
            if sonde.width * sonde.height > 4000 * 4000:
                raise ContratErreur("Signature : image trop grande.")
            sonde.verify()
        image = Image.open(BytesIO(contenu)).convert('RGBA')
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ContratErreur("Signature illisible.") from None
    if fond_blanc_transparent:
        # Signature scannée : le fond clair devient transparent
        image.putdata([(r, g, b, 0) if r > 225 and g > 225 and b > 225 else (r, g, b, a) for r, g, b, a in image.getdata()])
    cadre = image.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    if not cadre or (cadre[2] - cadre[0]) < 30 or (cadre[3] - cadre[1]) < 10:
        raise ContratErreur("La signature est vide ou trop petite : dessinez-la dans le cadre.")
    image = image.crop(cadre)
    image.thumbnail((900, 300))
    tampon = BytesIO()
    image.save(tampon, 'PNG', optimize=True)
    return tampon.getvalue()


def _depuis_data_url(valeur: str) -> bytes:
    if not isinstance(valeur, str) or len(valeur) > TAILLE_MAX_SIGNATURE * 4 // 3 + 100:
        raise ContratErreur("Signature manquante ou trop lourde.")
    entete, _, donnees = valeur.partition(',')
    if not re.fullmatch(r'data:image/(png|jpeg|webp);base64', entete):
        raise ContratErreur("Signature manquante.")
    try:
        return base64.b64decode(donnees, validate=True)
    except (binascii.Error, ValueError):
        raise ContratErreur("Signature illisible.") from None


# --- Emails -----------------------------------------------------------------------------------------

def _envoyer(gabarit: str, sujet: str, destinataires: list[str], contexte_email: dict, pieces=None) -> None:
    def envoyer():
        try:
            send_mail(sujet, render_to_string(f'emails/contrats/{gabarit}.txt', contexte_email),
                      settings.DEFAULT_FROM_EMAIL, destinataires, pieces_jointes=pieces)
        except Exception:
            logger.exception("Email %s non envoyé", gabarit)

    destinataires = [d for d in destinataires if d]
    if destinataires:
        transaction.on_commit(envoyer)


def _destinataires_kwaba() -> list[str]:
    societe = ParametresSocieteModel.courants()
    if societe.email:
        return [societe.email]
    return list(get_user_model().objects.filter(role='admin', is_active=True).values_list('email', flat=True)[:5])


def lien(jeton: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/contrat/{jeton}"


def _envoyer_lien(contrat: ContratModel, jeton: str) -> None:
    _envoyer('a_signer', f"Votre contrat Kwa-Ba à signer : {contrat.reference}", [contrat.partie_email], {
        'nom': contrat.partie_nom, 'titre': contrat.titre, 'reference': contrat.reference, 'lien': lien(jeton),
        'expire_le': date(contrat.expire_le),
    })
    contrat.envoye_le = timezone.now()
    contrat.save(update_fields=['envoye_le'])


# --- Émission ---------------------------------------------------------------------------------------

def _reference() -> str:
    return f"CT-{timezone.localdate().year}-{secrets.token_hex(3).upper()}"


@transaction.atomic
def emettre(type_contrat: str, objet, par=None, envoyer=True) -> ContratModel:
    """Contrat pré-rempli pour cette partie ; envoie le lien de signature par email si `envoyer`."""
    societe = ParametresSocieteModel.courants()
    if not societe.complets:
        raise ContratErreur("Renseignez la raison sociale et l'adresse de la société (Back-office → Documents) avant d'émettre un contrat.")
    modele = ModeleContratModel.objects.filter(type=type_contrat).first()
    if not modele:
        raise ContratErreur("Aucun modèle pour ce type de contrat.")
    infos = partie(type_contrat, objet)
    if envoyer and not infos['email']:
        raise ContratErreur("Cette partie n'a pas d'adresse email : ajoutez-la avant d'envoyer le contrat.")
    jeton = secrets.token_urlsafe(32)
    representant = ', '.join(x for x in (societe.representant_nom, societe.representant_qualite) if x)
    try:
        with transaction.atomic():
            contrat = ContratModel.objects.create(
                reference=_reference(), type=type_contrat, titre=modele.titre, version_modele=modele.version,
                corps=rendre(modele.corps, contexte(type_contrat, infos)),
                partie_nom=infos['nom'], partie_email=infos['email'] or '', partie_telephone=infos['telephone'] or '',
                cree_par=par, kwaba_signataire=f"{societe.raison_sociale}" + (f", représentée par {representant}" if representant else ''),
                jeton_hash=hacher_jeton(jeton), expire_le=timezone.now() + VALIDITE_LIEN, **infos['lien'],
            )
    except IntegrityError:
        raise ContratErreur("Un contrat est déjà en cours pour cette partie : renvoyez-le ou annulez-le d'abord.") from None
    if envoyer:
        _envoyer_lien(contrat, jeton)
    return contrat


def renvoyer(contrat: ContratModel) -> ContratModel:
    """Nouveau lien (l'ancien ne fonctionne plus), valable 30 jours, envoyé par email."""
    if contrat.statut != 'a_signer':
        raise ContratErreur("Seul un contrat à signer peut être renvoyé.")
    if not contrat.partie_email:
        raise ContratErreur("Cette partie n'a pas d'adresse email.")
    jeton = secrets.token_urlsafe(32)
    contrat.jeton_hash, contrat.expire_le = hacher_jeton(jeton), timezone.now() + VALIDITE_LIEN
    contrat.save(update_fields=['jeton_hash', 'expire_le'])
    _envoyer_lien(contrat, jeton)
    return contrat


def annuler(contrat: ContratModel, motif: str) -> ContratModel:
    if contrat.statut == 'annule':
        raise ContratErreur("Ce contrat est déjà annulé.")
    if len(motif.strip()) < 5:
        raise ContratErreur("Indiquez le motif de l'annulation.")
    contrat.statut, contrat.annule_le, contrat.motif_annulation = 'annule', timezone.now(), motif.strip()
    contrat.save(update_fields=['statut', 'annule_le', 'motif_annulation'])
    return contrat


def par_jeton(jeton: str) -> ContratModel | None:
    if not jeton or len(jeton) > 100:
        return None
    return ContratModel.objects.filter(jeton_hash=hacher_jeton(jeton)).exclude(statut='annule').first()


# --- Hôtes ------------------------------------------------------------------------------------------

def contrat_hote(hote) -> ContratModel:
    """Contrat de l'hôte, émis à la première demande (il le signe depuis son espace, sans email)."""
    contrat = ContratModel.objects.filter(hote=hote).exclude(statut='annule').first()
    return contrat or emettre('hote', hote, envoyer=False)


def hote_a_signe(hote) -> bool:
    return ContratModel.objects.filter(hote=hote, statut='signe').exists()


# --- Signature --------------------------------------------------------------------------------------

def signer(contrat: ContratModel, *, nom: str, signature: str, accepte: bool, ip: str | None, user_agent: str, methode: str) -> ContratModel:
    from .pdf import contrat_pdf

    with transaction.atomic():
        contrat = ContratModel.objects.select_for_update().get(pk=contrat.pk)
        if contrat.statut == 'signe':
            raise ContratErreur("Ce contrat est déjà signé.")
        if contrat.statut != 'a_signer':
            raise ContratErreur("Ce contrat n'est plus à signer.")
        if methode == 'lien personnel' and contrat.expire_le < timezone.now():
            raise ContratErreur("Ce lien a expiré : demandez à Kwa-Ba de vous renvoyer le contrat.")
        if not accepte:
            raise ContratErreur("Cochez la case pour accepter le contrat.")
        nom = ' '.join((nom or '').split())
        if len(nom) < 3 or len(nom) > 150:
            raise ContratErreur("Tapez votre nom complet.")
        image = signature_png(_depuis_data_url(signature))

        contrat.signataire_nom, contrat.signe_le, contrat.statut = nom, timezone.now(), 'signe'
        contrat.ip, contrat.user_agent, contrat.methode = ip, (user_agent or '')[:300], methode
        contrat.empreinte_texte = hashlib.sha256(contrat.corps.encode()).hexdigest()
        contrat.signature.save(f"{contrat.reference}.png", ContentFile(image), save=False)
        pdf = contrat_pdf(contrat)
        contrat.empreinte_pdf = hashlib.sha256(pdf).hexdigest()
        contrat.pdf.save(f"{contrat.reference}.pdf", ContentFile(pdf), save=False)
        contrat.save()

    if contrat.type == 'hote' and contrat.hote_id:
        from apps.verifications.services import contrat_hote_signe

        contrat_hote_signe(contrat.hote)
    piece = [(f"contrat-{contrat.reference}.pdf", pdf, 'application/pdf')]
    contexte_email = {'nom': contrat.partie_nom, 'titre': contrat.titre, 'reference': contrat.reference,
                      'signe_le': date(contrat.signe_le, 'j F Y à H:i'), 'empreinte': contrat.empreinte_pdf,
                      'type': contrat.get_type_display()}
    _envoyer('signe', f"Contrat signé : {contrat.reference}", [contrat.partie_email], contexte_email, piece)
    _envoyer('signe_kwaba', f"Contrat signé par {contrat.partie_nom} : {contrat.reference}", _destinataires_kwaba(), contexte_email, piece)
    return contrat
