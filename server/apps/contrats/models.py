import hashlib
import uuid

from django.conf import settings
from django.db import models

from apps.documents.models import stockage_prive

TYPES = [
    ('hote', 'Hôte'),
    ('loueur', 'Loueur partenaire'),
    ('chauffeur', 'Chauffeur partenaire'),
    ('ong', 'ONG partenaire'),
]


def hacher_jeton(jeton: str) -> str:
    """Le lien de signature n'est jamais stocké en clair : une fuite de la table ne permet de signer aucun contrat."""
    return hashlib.sha256(jeton.encode()).hexdigest()


class ModeleContratModel(models.Model):
    """Texte type d'un contrat, modifiable dans le back-office.

    Le corps contient des variables {{ partie.nom }}, {{ societe.raison_sociale }}… remplacées à l'émission.
    Un paragraphe qui commence par « ## » est un titre d'article. Chaque modification incrémente la version ;
    les contrats déjà émis gardent le texte de leur version.
    """
    type = models.CharField(max_length=20, choices=TYPES, unique=True)
    titre = models.CharField(max_length=150)
    corps = models.TextField()
    version = models.PositiveIntegerField(default=1)
    modifie_le = models.DateTimeField(auto_now=True)
    modifie_par = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        verbose_name = 'Modèle de contrat'
        ordering = ['type']

    def __str__(self):
        return f"{self.get_type_display()} · v{self.version}"


class ContratModel(models.Model):
    """Contrat émis vers une partie (hôte, loueur, chauffeur, ONG), signé en ligne par lien personnel.

    Le texte est figé à l'émission (copie du modèle, variables remplacées) : la partie signe exactement ce
    qu'elle a lu. Les preuves de la signature (horodatage, adresse IP, navigateur, empreintes SHA-256)
    sont conservées et imprimées sur le certificat joint au PDF signé.
    """
    STATUTS = [('a_signer', 'À signer'), ('signe', 'Signé'), ('annule', 'Annulé')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=20, choices=TYPES)
    titre = models.CharField(max_length=150)
    corps = models.TextField(help_text='Texte figé à l\'émission')
    version_modele = models.PositiveIntegerField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='a_signer')

    # Partie : un seul de ces liens selon le type ; ses coordonnées sont copiées à l'émission
    hote = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='contrats')
    chauffeur = models.ForeignKey('transferts.ChauffeurModel', null=True, blank=True, on_delete=models.PROTECT, related_name='contrats')
    loueur = models.ForeignKey('locations.PartenaireLocationModel', null=True, blank=True, on_delete=models.PROTECT, related_name='contrats')
    organisation = models.ForeignKey('give.OrganisationModel', null=True, blank=True, on_delete=models.PROTECT, related_name='contrats')
    partie_nom = models.CharField(max_length=150)
    partie_email = models.EmailField()
    partie_telephone = models.CharField(max_length=30, blank=True)

    # Émission (signature de Kwa-Ba : son représentant légal, à l'émission)
    cree_le = models.DateTimeField(auto_now_add=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    kwaba_signataire = models.CharField(max_length=200)
    jeton_hash = models.CharField(max_length=64, unique=True)
    envoye_le = models.DateTimeField(null=True, blank=True)
    expire_le = models.DateTimeField()

    # Signature de la partie
    signe_le = models.DateTimeField(null=True, blank=True)
    signataire_nom = models.CharField(max_length=150, blank=True)
    signature = models.ImageField(upload_to='contrats/signatures/', storage=stockage_prive, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    methode = models.CharField(max_length=40, blank=True, help_text='lien personnel ou compte Kwa-Ba')
    empreinte_texte = models.CharField(max_length=64, blank=True, help_text='SHA-256 du texte signé')
    empreinte_pdf = models.CharField(max_length=64, blank=True, help_text='SHA-256 du PDF signé')
    pdf = models.FileField(upload_to='contrats/', storage=stockage_prive, blank=True)

    annule_le = models.DateTimeField(null=True, blank=True)
    motif_annulation = models.TextField(blank=True)

    class Meta:
        ordering = ['-cree_le']
        verbose_name = 'Contrat'
        constraints = [
            # Un seul contrat en cours (à signer ou signé) par partie
            models.UniqueConstraint(fields=['hote'], condition=~models.Q(statut='annule') & models.Q(hote__isnull=False), name='un_contrat_par_hote'),
            models.UniqueConstraint(fields=['chauffeur'], condition=~models.Q(statut='annule') & models.Q(chauffeur__isnull=False), name='un_contrat_par_chauffeur'),
            models.UniqueConstraint(fields=['loueur'], condition=~models.Q(statut='annule') & models.Q(loueur__isnull=False), name='un_contrat_par_loueur'),
            models.UniqueConstraint(fields=['organisation'], condition=~models.Q(statut='annule') & models.Q(organisation__isnull=False), name='un_contrat_par_ong'),
        ]

    def __str__(self):
        return f"{self.reference} · {self.get_type_display()} · {self.partie_nom}"
