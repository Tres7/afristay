import uuid

from django.conf import settings
from django.core.files.storage import storages
from django.db import models


def stockage_prive():
    """Factures : espace privé (jamais d'URL publique), lues par l'API qui vérifie les droits."""
    return storages['prive']


class ParametresSocieteModel(models.Model):
    """Informations légales de Kwa-Ba imprimées sur les documents (une seule ligne, modifiable dans le back-office).

    Tant que la raison sociale et l'adresse ne sont pas renseignées, aucune facture ne peut être émise.
    """
    raison_sociale = models.CharField(max_length=150, blank=True)
    nom_commercial = models.CharField(max_length=80, default='Kwa-Ba')
    forme_juridique = models.CharField(max_length=80, blank=True, help_text='SARL, SAS, entreprise individuelle…')
    adresse = models.TextField(blank=True)
    pays = models.CharField(max_length=60, blank=True, default='Togo')
    nif = models.CharField('NIF', max_length=40, blank=True, help_text="Numéro d'identification fiscale")
    rccm = models.CharField('RCCM', max_length=60, blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    site = models.CharField(max_length=80, blank=True, default='kwa-ba.com')
    assujetti_tva = models.BooleanField(default=False)
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=18, help_text='En %, si assujetti')
    mentions = models.TextField(blank=True, help_text='Pied de facture : conditions de paiement, mentions légales…')
    # Signataire des contrats pour Kwa-Ba
    representant_nom = models.CharField(max_length=120, blank=True, help_text='Représentant légal, signataire des contrats')
    representant_qualite = models.CharField(max_length=80, blank=True, help_text='Gérant, directeur général…')
    signature_representant = models.ImageField(upload_to='societe/', storage=stockage_prive, blank=True,
                                               help_text='Signature scannée (PNG sur fond transparent de préférence)')
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Informations de la société'

    def save(self, *args, **kwargs):
        self.pk = 1  # une seule ligne
        super().save(*args, **kwargs)

    @classmethod
    def courants(cls) -> 'ParametresSocieteModel':
        return cls.objects.get_or_create(pk=1)[0]

    @property
    def complets(self) -> bool:
        return bool(self.raison_sociale.strip() and self.adresse.strip())

    def __str__(self):
        return self.raison_sociale or self.nom_commercial


class SequenceFactureModel(models.Model):
    """Dernier numéro de facture émis par année : numérotation continue, sans trou (verrou à chaque émission)."""
    annee = models.PositiveSmallIntegerField(primary_key=True)
    dernier = models.PositiveIntegerField(default=0)


class FactureModel(models.Model):
    """Facture émise (document légal) : jamais modifiée ni supprimée ; son PDF est figé à l'émission."""
    OBJETS = [('reservation', 'Séjour'), ('transfert', 'Transfert aéroport'), ('location', 'Location de voiture'),
              ('libre', 'Facture libre')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero = models.CharField(max_length=20, unique=True)
    emise_le = models.DateTimeField(auto_now_add=True)
    emise_par = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    objet_type = models.CharField(max_length=20, choices=OBJETS)
    objet_id = models.UUIDField(null=True, blank=True, db_index=True)
    client_nom = models.CharField(max_length=150)
    client_email = models.EmailField(blank=True)
    client_adresse = models.TextField(blank=True)
    lignes = models.JSONField(default=list, help_text='[{libelle, quantite, prix_unitaire}] en FCFA TTC')
    total_ht = models.PositiveIntegerField()
    tva = models.PositiveIntegerField(default=0)
    total_ttc = models.PositiveIntegerField()
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pdf = models.FileField(upload_to='factures/', storage=stockage_prive, blank=True)

    class Meta:
        ordering = ['-emise_le']
        verbose_name = 'Facture'
        constraints = [models.UniqueConstraint(fields=['objet_type', 'objet_id'], condition=~models.Q(objet_type='libre'),
                                               name='une_facture_par_objet')]

    def __str__(self):
        return f"{self.numero} — {self.client_nom} — {self.total_ttc} FCFA"
