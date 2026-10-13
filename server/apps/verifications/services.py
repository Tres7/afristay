"""Vérification des annonces : visite d'un agent de terrain avant publication."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.notifications.infrastructure.email.envoi import send_mail

from .fichiers import image_normalisee
from .models import PhotoVisiteModel, PieceIdentiteModel, VisiteModel

logger = logging.getLogger('apps.verifications')

ROLES_VERIFICATEURS = ('agent', 'admin')
MAX_PHOTOS_VISITE = 10


class VerificationErreur(Exception):
    """Message affichable à l'agent."""


def _envoyer(gabarit: str, sujet: str, destinataires: list[str], contexte: dict) -> None:
    """Après la validation de la transaction ; un échec d'envoi n'annule jamais la vérification."""
    def envoyer():
        try:
            send_mail(sujet, render_to_string(f'emails/verifications/{gabarit}.txt', contexte),
                      settings.DEFAULT_FROM_EMAIL, destinataires)
        except Exception:
            logger.exception("Email %s non envoyé", gabarit)

    if destinataires:
        transaction.on_commit(envoyer)


def _verificateurs() -> list[str]:
    return list(get_user_model().objects.filter(role__in=ROLES_VERIFICATEURS, is_active=True)
                .values_list('email', flat=True))


def statut_piece(hote) -> str:
    piece = PieceIdentiteModel.objects.filter(hote=hote).first()
    return piece.statut if piece else 'absente'


def visite_a_planifier(hebergement, modification: bool = False) -> None:
    """Prévient les agents qu'une annonce attend une visite (nouvelle, ou modifiée après vérification)."""
    hote = hebergement.host
    libelles = {'absente': 'pas encore envoyée', 'soumise': 'envoyée, à contrôler', 'verifiee': 'déjà vérifiée',
                'refusee': 'refusée, à renvoyer'}
    _envoyer('visite_a_planifier', f"[Kwa-Ba] Visite à planifier — {hebergement.name} ({hebergement.city})",
             _verificateurs(), {
                 'modification': modification, 'hebergement': hebergement.name, 'ville': hebergement.city,
                 'adresse': hebergement.location, 'hote': f"{hote.first_name} {hote.last_name}".strip(),
                 'telephone': hote.phone or '—', 'email': hote.email, 'piece': libelles[statut_piece(hote)],
                 'url': f"{settings.FRONTEND_URL}/agent",
             })


def remettre_en_verification(hebergement, avant: dict) -> bool:
    """Après une modification par l'hôte : une annonce refusée repart en vérification, et une annonce vérifiée
    aussi si ce que l'agent a contrôlé (adresse, ville, photos) a changé. Renvoie True si elle y est remise."""
    if hebergement.statut_verification == 'en_attente':
        return False
    change = any(avant[champ] != getattr(hebergement, champ) for champ in hebergement.CHAMPS_VERIFIES)
    if hebergement.statut_verification == 'verifiee' and not change:
        return False
    deja_verifiee = hebergement.statut_verification == 'verifiee'
    hebergement.statut_verification, hebergement.motif_refus = 'en_attente', ''
    hebergement.save(update_fields=['statut_verification', 'motif_refus', 'updated_at'])
    visite_a_planifier(hebergement, modification=deja_verifiee)
    return True


@transaction.atomic
def decider(hebergement, agent, *, decision: str, controles: dict, commentaire: str, photos: list) -> VisiteModel:
    """Enregistre la visite et publie (ou refuse) l'annonce. Valider exige que tous les contrôles soient cochés."""
    from apps.hebergements.models import HebergementModel  # import local : hebergements n'importe pas cette app

    hebergement = HebergementModel.objects.select_for_update().select_related('host').get(pk=hebergement.pk)
    if hebergement.statut_verification != 'en_attente':
        raise VerificationErreur("Cette annonce n'attend pas de visite.")
    controles = {cle: bool(controles.get(cle)) for cle in VisiteModel.CONTROLES}
    commentaire = commentaire.strip()
    if len(photos) > MAX_PHOTOS_VISITE:
        raise VerificationErreur(f"{MAX_PHOTOS_VISITE} photos au plus.")

    hote = hebergement.host
    piece = PieceIdentiteModel.objects.select_for_update().filter(hote=hote).first()
    if decision == 'validee':
        if not all(controles.values()):
            raise VerificationErreur("Pour valider, tous les points de contrôle doivent être vérifiés.")
        if not piece or piece.statut == 'refusee':
            raise VerificationErreur("L'hôte n'a pas encore envoyé de pièce d'identité valable.")
    elif decision == 'refusee':
        if len(commentaire) < 10:
            raise VerificationErreur("Expliquez le motif du refus à l'hôte (10 caractères au moins).")
    else:
        raise VerificationErreur("Décision inconnue.")

    contenus = [image_normalisee(photo) for photo in photos]  # avant toute écriture : une photo invalide arrête tout
    visite = VisiteModel.objects.create(hebergement=hebergement, agent=agent, decision=decision,
                                        controles=controles, commentaire=commentaire)
    for contenu in contenus:
        photo = PhotoVisiteModel(visite=visite)
        photo.image.save('visite.jpg', contenu, save=False)
        photo.save()

    maintenant = timezone.now()
    if piece and piece.statut != 'verifiee':
        if controles['identite']:
            # Identité contrôlée : on ne garde que le résultat, jamais le document
            piece.statut, piece.verifiee_le, piece.verifiee_par, piece.motif_refus = 'verifiee', maintenant, agent, ''
            if piece.fichier:
                piece.fichier.delete(save=False)
            piece.save()
        elif decision == 'refusee':
            piece.statut, piece.motif_refus = 'refusee', commentaire
            piece.save(update_fields=['statut', 'motif_refus'])

    contexte = {'prenom': hote.first_name, 'hebergement': hebergement.name,
                'url_espace': f"{settings.FRONTEND_URL}/hote/espace",
                'url_annonce': f"{settings.FRONTEND_URL}/hebergements/{hebergement.id}"}
    if decision == 'validee':
        hebergement.statut_verification, hebergement.verifiee_le, hebergement.motif_refus = 'verifiee', maintenant, ''
        _envoyer('annonce_verifiee', f"Votre logement est vérifié — {hebergement.name}", [hote.email], contexte)
    else:
        hebergement.statut_verification, hebergement.motif_refus = 'refusee', commentaire
        _envoyer('annonce_refusee', f"Votre annonce n'est pas encore publiée — {hebergement.name}", [hote.email],
                 {**contexte, 'motif': commentaire})
    hebergement.save(update_fields=['statut_verification', 'verifiee_le', 'motif_refus', 'updated_at'])
    return visite
