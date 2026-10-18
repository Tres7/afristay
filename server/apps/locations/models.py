"""Location de voitures, avec ou sans chauffeur, auprès de loueurs partenaires.

Tout le catalogue est administré (prix, lieux, commission, conditions) : rien n'est proposé au voyageur tant que
l'administration n'a pas renseigné les paramètres, au moins une catégorie avec un prix et un lieu de remise.
"""
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.paiements.operateurs import OPERATEUR_CHOICES, PAYS_CHOICES

FUSEAUX = [
    ('Africa/Lome', 'Togo, Ghana, Burkina Faso, Mali, Côte d\'Ivoire, Sénégal (UTC)'),
    ('Africa/Porto-Novo', 'Bénin, Niger, Nigeria (UTC+1)'),
]


class ParametresLocationModel(models.Model):
    """Règles de la location (une seule ligne) : sans elle, la location n'est pas proposée."""
    commission_pourcent = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Part du prix gardée par Kwa-Ba, en % (le reste est versé au loueur)',
    )
    delai_min_jours = models.PositiveSmallIntegerField(
        default=2, validators=[MinValueValidator(1)],
        help_text='Réservation au plus tard N jours avant la prise du véhicule (temps de préparation du loueur)',
    )
    duree_max_jours = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)], help_text='Durée maximale d\'une location')
    annulation_gratuite_heures = models.PositiveSmallIntegerField(
        help_text='Remboursement intégral si le voyageur annule au moins N heures avant la prise ; rien ensuite',
    )
    conditions = models.TextField(
        blank=True, help_text='Affiché au voyageur avant de réserver : âge minimum, permis, carburant, kilométrage…',
    )
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Paramètres de la location'
        verbose_name_plural = 'Paramètres de la location'

    def __str__(self):
        return 'Paramètres de la location'

    def save(self, *args, **kwargs):
        self.pk = 1  # une seule ligne
        super().save(*args, **kwargs)

    @classmethod
    def courants(cls):
        return cls.objects.filter(pk=1).first()


class CategorieVehiculeModel(models.Model):
    """Catégorie proposée au voyageur. Une formule sans prix n'est pas proposée."""
    GAMMES = [
        ('citadine', 'Citadine'),
        ('berline', 'Berline'),
        ('suv', 'SUV'),
        ('4x4', '4x4 tout-terrain'),
        ('minibus', 'Minibus'),
        ('utilitaire', 'Utilitaire'),
    ]
    BOITES = [('manuelle', 'Manuelle'), ('automatique', 'Automatique')]
    CARBURANTS = [('essence', 'Essence'), ('diesel', 'Diesel'), ('hybride', 'Hybride'), ('electrique', 'Électrique')]

    nom = models.CharField(max_length=80, help_text='Par ex. « Berline confort »')
    gamme = models.CharField(max_length=20, choices=GAMMES, db_index=True)
    exemple_modele = models.CharField(max_length=120, blank=True, help_text='Par ex. « Toyota Corolla ou similaire »')
    description = models.TextField(blank=True)
    places = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    bagages = models.PositiveSmallIntegerField(help_text='Grandes valises')
    boite = models.CharField(max_length=20, choices=BOITES)
    carburant = models.CharField(max_length=20, choices=CARBURANTS, default='essence')
    climatisation = models.BooleanField(default=True)
    image = models.ImageField(upload_to='locations/', blank=True)
    prix_jour_sans_chauffeur = models.PositiveIntegerField(
        null=True, blank=True, help_text='FCFA par jour, le voyageur conduit. Vide : formule non proposée',
    )
    prix_jour_avec_chauffeur = models.PositiveIntegerField(
        null=True, blank=True, help_text='FCFA par jour, chauffeur du loueur compris. Vide : formule non proposée',
    )
    caution = models.PositiveIntegerField(
        default=0, help_text='FCFA, voiture sans chauffeur seulement, réglée au loueur à la remise du véhicule (0 : aucune)',
    )
    actif = models.BooleanField(default=False, help_text='Proposée aux voyageurs (avec au moins un prix)')
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['ordre', 'places', 'nom']
        verbose_name = 'Catégorie de véhicule'
        verbose_name_plural = 'Catégories de véhicules'

    def __str__(self):
        return f"{self.nom} ({self.get_gamme_display()}, {self.places} places)"

    def prix_jour(self, formule: str) -> int | None:
        return self.prix_jour_avec_chauffeur if formule == 'avec_chauffeur' else self.prix_jour_sans_chauffeur


class LieuRemiseModel(models.Model):
    """Où le véhicule est remis et rendu : aéroport, agence, ou livraison à l'adresse du voyageur."""
    nom = models.CharField(max_length=120, help_text='Par ex. « Aéroport de Lomé » ou « Livraison à votre adresse, Lomé »')
    ville = models.CharField(max_length=100)
    fuseau = models.CharField(max_length=40, choices=FUSEAUX, help_text='Heure locale des réservations')
    adresse_requise = models.BooleanField(default=False, help_text='Le voyageur indique une adresse (livraison)')
    frais = models.PositiveIntegerField(default=0, help_text='FCFA ajoutés à la location, à la remise et au retour')
    actif = models.BooleanField(default=True)
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['ville', 'ordre', 'nom']
        verbose_name = 'Lieu de remise'
        verbose_name_plural = 'Lieux de remise'

    def __str__(self):
        return f"{self.nom} ({self.ville})"


class PartenaireLocationModel(models.Model):
    """Loueur partenaire, payé par Mobile Money après chaque location (moins la commission)."""
    nom = models.CharField(max_length=120, help_text="Nom de l'agence")
    contact = models.CharField(max_length=120, help_text='Personne à contacter')
    telephone = models.CharField(max_length=20, help_text="Avec l'indicatif, par ex. +228 90 00 00 00")
    email = models.EmailField(blank=True, help_text='Facultatif : reçoit le détail des locations attribuées')
    categories = models.ManyToManyField(CategorieVehiculeModel, related_name='partenaires')
    lieux = models.ManyToManyField(LieuRemiseModel, related_name='partenaires', help_text='Lieux où il remet ses véhicules')
    actif = models.BooleanField(default=True)
    pays_versement = models.CharField(max_length=2, choices=PAYS_CHOICES)
    operateur_versement = models.CharField(max_length=30, choices=OPERATEUR_CHOICES)
    numero_versement = models.CharField(max_length=15, help_text="Sans l'indicatif")
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = 'Loueur partenaire'
        verbose_name_plural = 'Loueurs partenaires'

    def __str__(self):
        return self.nom


class LocationModel(models.Model):
    STATUTS = [
        ('en_attente_paiement', 'En attente de paiement'),
        ('confirmee', 'Payée, loueur à attribuer'),
        ('partenaire_assigne', 'Loueur attribué'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
    ]
    FORMULES = [('sans_chauffeur', 'Voiture seule'), ('avec_chauffeur', 'Avec chauffeur')]
    ANNULEE_PAR = [('voyageur', 'Voyageur'), ('plateforme', 'Kwa-Ba'), ('expiration', 'Paiement non effectué à temps')]
    MOYENS = [('mobile_money', 'Mobile Money'), ('carte', 'Carte bancaire'), ('paypal', 'PayPal')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voyageur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='locations')
    reservation = models.ForeignKey(
        'reservations.ReservationModel', on_delete=models.SET_NULL, null=True, blank=True, related_name='locations',
        help_text='Séjour Kwa-Ba associé (facultatif)',
    )
    categorie = models.ForeignKey(CategorieVehiculeModel, on_delete=models.PROTECT, related_name='locations')
    formule = models.CharField(max_length=20, choices=FORMULES)
    lieu_prise = models.ForeignKey(LieuRemiseModel, on_delete=models.PROTECT, related_name='+')
    adresse_prise = models.CharField(max_length=255, blank=True)
    lieu_retour = models.ForeignKey(LieuRemiseModel, on_delete=models.PROTECT, related_name='+')
    adresse_retour = models.CharField(max_length=255, blank=True)
    debut = models.DateTimeField(help_text='Prise du véhicule')
    fin = models.DateTimeField(help_text='Retour du véhicule')
    passagers = models.PositiveSmallIntegerField()
    telephone = models.CharField(max_length=20, help_text='Numéro du voyageur (WhatsApp)')
    precisions = models.TextField(help_text='Ce que le voyageur veut : trajets prévus, siège enfant, horaires…')
    # Voiture seule : le conducteur
    conducteur = models.CharField(max_length=120, blank=True)
    permis_numero = models.CharField(max_length=40, blank=True)
    permis_pays = models.CharField(max_length=60, blank=True)

    # Prix figés à la réservation (les tarifs peuvent changer ensuite)
    jours = models.PositiveSmallIntegerField()
    prix_jour = models.PositiveIntegerField()
    frais_lieux = models.PositiveIntegerField()
    prix = models.PositiveIntegerField(help_text='Total payé par le voyageur')
    commission = models.PositiveIntegerField()
    caution = models.PositiveIntegerField(default=0, help_text='À régler au loueur à la remise du véhicule')
    moyen = models.CharField(max_length=20, choices=MOYENS, default='mobile_money')

    statut = models.CharField(max_length=20, choices=STATUTS, default='en_attente_paiement')
    expire_le = models.DateTimeField(null=True, blank=True)
    # Emails du paiement en attente : 0 aucun, 1 « à payer avant », 2 rappel envoyé, 3 annulation notifiée
    relance_paiement = models.PositiveSmallIntegerField(default=0, editable=False)
    annulee_par = models.CharField(max_length=20, choices=ANNULEE_PAR, blank=True)
    annulee_le = models.DateTimeField(null=True, blank=True)
    # Attribués par l'équipe
    partenaire = models.ForeignKey(PartenaireLocationModel, on_delete=models.PROTECT, null=True, blank=True, related_name='locations')
    vehicule = models.CharField(max_length=120, blank=True, help_text='Marque, modèle et couleur du véhicule remis')
    immatriculation = models.CharField(max_length=20, blank=True)
    chauffeur_nom = models.CharField(max_length=120, blank=True, help_text='Formule avec chauffeur')
    chauffeur_telephone = models.CharField(max_length=20, blank=True)
    # Emails envoyés par le worker (un drapeau par email : un envoi raté est retenté, jamais doublé)
    confirmation_notifiee = models.BooleanField(default=False)
    admins_notifies = models.BooleanField(default=False)
    alerte_sans_partenaire = models.BooleanField(default=False)
    partenaire_notifie = models.BooleanField(default=False, help_text='Coordonnées du loueur envoyées au voyageur')
    location_envoyee_partenaire = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-debut']
        verbose_name = 'Location de voiture'
        verbose_name_plural = 'Locations de voitures'

    def __str__(self):
        return f"{self.reference} — {self.categorie.nom}, {self.lieu_prise.ville}"

    @property
    def reference(self):
        return f"LOC-{str(self.id)[:6].upper()}"

    @property
    def montant_partenaire(self):
        return self.prix - self.commission


class VersementPartenaireModel(models.Model):
    """Paiement du loueur après la location (mêmes règles que les versements aux chauffeurs)."""
    STATUTS = [('planifie', 'Planifié'), ('en_cours', 'En cours'), ('envoye', 'Envoyé'), ('echoue', 'Échoué'), ('annule', 'Annulé')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    location = models.OneToOneField(LocationModel, on_delete=models.PROTECT, related_name='versement')
    partenaire = models.ForeignKey(PartenaireLocationModel, on_delete=models.PROTECT, related_name='versements')
    montant_brut = models.PositiveIntegerField()
    commission = models.PositiveIntegerField()
    montant = models.PositiveIntegerField()
    date_prevue = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='planifie')
    payout_id = models.CharField(max_length=64, blank=True)
    mode = models.CharField(max_length=30, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    tentatives = models.PositiveSmallIntegerField(default=0)
    derniere_erreur = models.TextField(blank=True)
    envoye_le = models.DateTimeField(null=True, blank=True)
    notifie = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_prevue']
        verbose_name = 'Versement à un loueur'
        verbose_name_plural = 'Versements aux loueurs'

    def __str__(self):
        return f"{self.montant} FCFA → {self.partenaire} ({self.get_statut_display()})"
