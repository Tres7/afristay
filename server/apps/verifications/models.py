import uuid

from django.conf import settings
from django.core.files.storage import storages
from django.db import models


def stockage_prive():
    """Bucket R2 privé ou dossier local non servi (settings.STORAGES['prive']) : jamais d'URL publique."""
    return storages['prive']


def _chemin_piece(instance, filename):
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f"identite/{instance.hote_id}/{uuid.uuid4()}.{extension}"


def _chemin_photo_visite(instance, filename):
    return f"visites/{instance.visite.hebergement_id}/{uuid.uuid4()}.jpg"


class PieceIdentiteModel(models.Model):
    """Pièce d'identité d'un hôte, contrôlée par l'agent lors de la visite.

    Le fichier est effacé dès que l'identité est validée : seul le résultat du contrôle est conservé.
    """
    TYPES = [
        ('cni', "Carte nationale d'identité"),
        ('passeport', 'Passeport'),
        ('permis', 'Permis de conduire'),
        ('sejour', 'Titre de séjour'),
    ]
    STATUTS = [('soumise', 'À contrôler'), ('verifiee', 'Vérifiée'), ('refusee', 'Refusée')]

    hote = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='piece_identite')
    type_piece = models.CharField(max_length=20, choices=TYPES)
    fichier = models.FileField(upload_to=_chemin_piece, storage=stockage_prive, blank=True)
    type_contenu = models.CharField(max_length=40, blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default='soumise')
    motif_refus = models.TextField(blank=True)
    soumise_le = models.DateTimeField(auto_now_add=True)
    verifiee_le = models.DateTimeField(null=True, blank=True)
    verifiee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+',
    )

    class Meta:
        verbose_name = "Pièce d'identité"
        verbose_name_plural = "Pièces d'identité"

    def __str__(self):
        return f"{self.get_type_piece_display()} de {self.hote}"


class VisiteModel(models.Model):
    """Compte rendu de la visite d'un logement par un agent de terrain."""
    DECISIONS = [('validee', 'Validée'), ('refusee', 'Refusée')]
    # Grille de contrôle : toutes les cases doivent être cochées pour valider
    CONTROLES = {
        'identite': "La pièce d'identité correspond à la personne rencontrée",
        'adresse': "Le logement est à l'adresse indiquée",
        'photos': 'Les photos correspondent au logement',
        'equipements': 'Les équipements annoncés sont présents',
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hebergement = models.ForeignKey('hebergements.HebergementModel', on_delete=models.CASCADE, related_name='visites')
    agent = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='visites_faites')
    decision = models.CharField(max_length=20, choices=DECISIONS)
    controles = models.JSONField(default=dict)
    commentaire = models.TextField(blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-cree_le']
        verbose_name = 'Visite de vérification'
        verbose_name_plural = 'Visites de vérification'

    def __str__(self):
        return f"Visite {self.get_decision_display().lower()} — {self.hebergement}"


class PhotoVisiteModel(models.Model):
    """Photo prise par l'agent pendant la visite (preuve en cas de litige), stockage privé."""
    visite = models.ForeignKey(VisiteModel, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to=_chemin_photo_visite, storage=stockage_prive)
    cree_le = models.DateTimeField(auto_now_add=True)
