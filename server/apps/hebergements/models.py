import uuid
from django.conf import settings
from django.db import models
from django.db.models import Exists, OuterRef
from django.db.models.functions import Trim

from config import prelancement
from apps.contrats.models import ContratModel
from apps.documents.models import ParametresSocieteModel


def _societe_immatriculee() -> Exists:
    """Same rule as ParametresSocieteModel.immatriculee, as a SQL condition (no query when the queryset is built)."""
    return Exists(
        ParametresSocieteModel.objects.filter(pk=1)
        .annotate(_raison=Trim('raison_sociale'), _adresse=Trim('adresse'), _rccm=Trim('rccm'), _nif=Trim('nif'))
        .exclude(_raison='').exclude(_adresse='').exclude(_rccm='').exclude(_nif='')
    )


def contrat_hote_exige() -> bool:
    """Once the company is registered (RCCM and NIF), a listing is public only if its host signed the agreement."""
    # One read, never a write (courants() would create the row during a public request)
    societe = ParametresSocieteModel.objects.filter(pk=1).first()
    return bool(societe and societe.immatriculee)


class HebergementQuerySet(models.QuerySet):
    def publiees(self):
        """Annonces visibles du public : vérifiées par un agent de terrain et non masquées par l'hôte."""
        if prelancement.actif():
            return self.none()  # pre-launch: verified listings wait for the opening
        # Once the company is registered, listings verified before wait for their host's signed agreement. The rule is
        # a SQL condition, evaluated by the database at each query: this queryset can be built at import time
        # (serializer fields), before the tables exist, and must follow a registration made while the API runs.
        contrat_signe = Exists(ContratModel.objects.filter(hote=OuterRef('host'), statut='signe'))
        return self.filter(is_available=True, statut_verification='verifiee').filter(~_societe_immatriculee() | contrat_signe)


class HebergementModel(models.Model):
    STATUTS_VERIFICATION = [
        ('en_attente', 'En attente de vérification'),
        ('verifiee', 'Vérifiée'),
        ('refusee', 'Refusée'),
    ]
    # Modifier l'un de ces champs après la visite remet l'annonce en vérification (ce que l'agent a contrôlé)
    CHAMPS_VERIFIES = ('city', 'location', 'image_url', 'images')

    TYPE_CHOICES = [
        ('hotel', 'Hôtel'),
        ('villa', 'Villa'),
        ('appartement', 'Appartement'),
        ('auberge', 'Auberge'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='hotel')
    city = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    rating = models.FloatField(default=0.0)
    review_count = models.IntegerField(default=0)
    image_url = models.URLField(blank=True)
    images = models.JSONField(default=list, blank=True)
    max_guests = models.PositiveIntegerField(default=4)
    # Détails affichés sur la fiche ; obligatoires pour une nouvelle annonce, vides pour les plus anciennes
    surface_m2 = models.PositiveIntegerField(null=True, blank=True)
    chambres = models.PositiveSmallIntegerField(null=True, blank=True)
    salles_de_bain = models.PositiveSmallIntegerField(null=True, blank=True)
    lits_doubles = models.PositiveSmallIntegerField(default=0)
    lits_simples = models.PositiveSmallIntegerField(default=0)
    canapes_lits = models.PositiveSmallIntegerField(default=0)
    PETIT_DEJEUNER = [('non', 'Non proposé'), ('inclus', 'Inclus'), ('option', 'En option')]
    petit_dejeuner = models.CharField(max_length=10, choices=PETIT_DEJEUNER, blank=True)
    petit_dejeuner_prix = models.PositiveIntegerField(null=True, blank=True, help_text='FCFA par personne et par jour (option)')
    arrivee_a_partir = models.TimeField(null=True, blank=True, help_text="Heure d'arrivée à partir de")
    depart_avant = models.TimeField(null=True, blank=True, help_text='Heure de départ au plus tard')
    # Politique d'annulation choisie par l'hôte (CGV, annexe 1) : voir apps/paiements/tarifs.py
    POLITIQUES_ANNULATION = [('souple', 'Souple'), ('moderee', 'Modérée'), ('ferme', 'Ferme')]
    politique_annulation = models.CharField(max_length=10, choices=POLITIQUES_ANNULATION, default='moderee', db_default='moderee')
    amenities = models.JSONField(default=list)
    is_available = models.BooleanField(default=True)
    # Publiée seulement après la visite d'un agent de terrain (apps.verifications)
    statut_verification = models.CharField(max_length=20, choices=STATUTS_VERIFICATION, default='en_attente', db_index=True)
    verifiee_le = models.DateTimeField(null=True, blank=True)
    motif_refus = models.TextField(blank=True)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hebergements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = HebergementQuerySet.as_manager()

    class Meta:
        app_label = 'hebergements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.city})"

    @property
    def est_publiee(self) -> bool:
        if not (self.is_available and self.statut_verification == 'verifiee') or prelancement.actif():
            return False
        return not contrat_hote_exige() or self.host.contrats.filter(statut='signe').exists()


def _photo_upload_path(instance, filename):
    # Nom généré côté serveur : le nom d'origine du fichier n'est jamais réutilisé
    return f"hebergements/{instance.owner_id}/{instance.id}.jpg"


class HebergementPhotoModel(models.Model):
    """Photo envoyée par un hôte. Son URL est ensuite référencée dans image_url / images d'une annonce."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hebergement_photos',
    )
    image = models.ImageField(upload_to=_photo_upload_path)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'hebergements'
        ordering = ['-created_at']

    def __str__(self):
        return f"Photo {self.id} ({self.owner_id})"


class BlocageModel(models.Model):
    """Période fermée à la réservation par l'hôte. Comme une réservation, `fin` est exclusive (jour de départ)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hebergement = models.ForeignKey(HebergementModel, on_delete=models.CASCADE, related_name='blocages')
    debut = models.DateField()
    fin = models.DateField()
    motif = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'hebergements'
        ordering = ['debut']
        constraints = [
            models.CheckConstraint(check=models.Q(fin__gt=models.F('debut')), name='blocage_fin_apres_debut'),
        ]

    def __str__(self):
        return f"Blocage {self.hebergement_id} {self.debut} → {self.fin}"


class InscriptionLancementModel(models.Model):
    """Liste d'attente : visiteurs à prévenir par email quand les premiers logements sont en ligne."""
    email = models.EmailField(unique=True)
    langue = models.CharField(max_length=2, default='fr')
    cree_le = models.DateTimeField(auto_now_add=True)
    prevenu_le = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-cree_le']
        verbose_name = "Inscription à l'ouverture des logements"

    def __str__(self):
        return self.email
