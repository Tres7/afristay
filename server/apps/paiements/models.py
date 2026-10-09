import uuid

from django.conf import settings
from django.db import models

from .operateurs import OPERATEUR_CHOICES, PAYS_CHOICES


class ProfilVersementModel(models.Model):
    """Où l'hôte reçoit son argent."""
    hote = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profil_versement')
    pays = models.CharField(max_length=2, choices=PAYS_CHOICES)
    operateur = models.CharField(max_length=30, choices=OPERATEUR_CHOICES)
    numero = models.CharField(max_length=15, help_text="Numéro local, sans l'indicatif du pays")
    titulaire = models.CharField(max_length=120, help_text='Nom du titulaire du compte Mobile Money')
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'paiements'
        verbose_name = 'Profil de versement'
        verbose_name_plural = 'Profils de versement'

    def __str__(self):
        return f"{self.hote.email} — {self.get_operateur_display()} {self.numero}"


class ObjetPayeMixin:
    """Ce qui est payé : une réservation de logement ou un transfert aéroport."""

    @property
    def objet(self):
        return self.reservation if self.reservation_id else self.transfert

    @property
    def payeur(self):
        return self.reservation.guest if self.reservation_id else self.transfert.voyageur

    @property
    def reference(self):
        return self.objet.reference

    @property
    def libelle(self):
        if self.reservation_id:
            return self.reservation.hebergement.name
        return f"Transfert depuis l'aéroport {self.transfert.aeroport.ville}"


class PaiementModel(ObjetPayeMixin, models.Model):
    """Une tentative d'encaissement (un même objet peut en avoir plusieurs : échec puis nouvel essai)."""
    PRESTATAIRES = [
        ('fedapay', 'FedaPay (Mobile Money, carte)'),
        ('paypal', 'PayPal'),
    ]
    STATUTS = [
        ('en_attente', 'En attente'),
        ('reussi', 'Réussi'),
        ('echoue', 'Échoué'),
        ('annule', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        'reservations.ReservationModel', on_delete=models.PROTECT, related_name='paiements', null=True, blank=True,
    )
    transfert = models.ForeignKey(
        'transferts.TransfertModel', on_delete=models.PROTECT, related_name='paiements', null=True, blank=True,
    )
    montant = models.PositiveIntegerField()
    devise = models.CharField(max_length=3, default='XOF')
    prestataire = models.CharField(max_length=20, choices=PRESTATAIRES, default='fedapay')
    # Identifiant chez le prestataire : transaction FedaPay ou commande PayPal
    transaction_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    # PayPal : montant réellement débité en euros, et identifiant de l'encaissement (sert aux remboursements)
    montant_eur = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    capture_id = models.CharField(max_length=64, blank=True)
    url_paiement = models.URLField(max_length=500, blank=True)
    statut = models.CharField(max_length=20, choices=STATUTS, default='en_attente')
    # Moyen utilisé et numéro débité, renvoyés par FedaPay : servent aux remboursements
    mode = models.CharField(max_length=40, blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    pays_telephone = models.CharField(max_length=2, blank=True)
    # Emails de confirmation envoyés par le worker (un drapeau par destinataire : pas de doublon si l'un échoue)
    notifie = models.BooleanField(default=False)
    notifie_hote = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'paiements'
        ordering = ['-cree_le']
        verbose_name = 'Paiement'
        constraints = [models.CheckConstraint(
            condition=models.Q(reservation__isnull=False, transfert__isnull=True)
            | models.Q(reservation__isnull=True, transfert__isnull=False),
            name='paiement_reservation_ou_transfert',
        )]

    def __str__(self):
        return f"{self.montant} FCFA — {self.get_statut_display()} — {self.reference}"


class VersementModel(models.Model):
    """Reversement de la part de l'hôte, déclenché après l'arrivée du voyageur."""
    STATUTS = [
        ('planifie', 'Planifié'),
        ('en_cours', 'En cours'),
        ('envoye', 'Envoyé'),
        ('echoue', 'Échoué'),
        ('annule', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.OneToOneField('reservations.ReservationModel', on_delete=models.PROTECT, related_name='versement')
    hote = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='versements')
    montant_brut = models.PositiveIntegerField(help_text='Prix des nuits revenant à l\'hôte, avant commission')
    commission = models.PositiveIntegerField()
    montant = models.PositiveIntegerField(help_text='Montant versé à l\'hôte')
    devise = models.CharField(max_length=3, default='XOF')
    date_prevue = models.DateTimeField()
    statut = models.CharField(max_length=20, choices=STATUTS, default='planifie')
    payout_id = models.CharField(max_length=64, blank=True)
    mode = models.CharField(max_length=30, blank=True)
    numero = models.CharField(max_length=20, blank=True)
    tentatives = models.PositiveSmallIntegerField(default=0)
    derniere_erreur = models.TextField(blank=True)
    envoye_le = models.DateTimeField(null=True, blank=True)
    # Email envoyé pour l'état final (versé à l'hôte, ou échec signalé aux administrateurs)
    notifie = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'paiements'
        ordering = ['date_prevue']
        verbose_name = 'Versement à un hôte'
        verbose_name_plural = 'Versements aux hôtes'

    def __str__(self):
        return f"{self.montant} FCFA → {self.hote.email} ({self.get_statut_display()})"


class RemboursementModel(ObjetPayeMixin, models.Model):
    STATUTS = [
        ('attente_numero', 'En attente du numéro du voyageur'),
        ('a_envoyer', 'À envoyer'),
        ('en_cours', 'En cours'),
        ('envoye', 'Envoyé'),
        ('a_traiter', 'À traiter manuellement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        'reservations.ReservationModel', on_delete=models.PROTECT, related_name='remboursements', null=True, blank=True,
    )
    transfert = models.ForeignKey(
        'transferts.TransfertModel', on_delete=models.PROTECT, related_name='remboursements', null=True, blank=True,
    )
    paiement = models.ForeignKey(PaiementModel, on_delete=models.PROTECT, related_name='remboursements')
    montant = models.PositiveIntegerField()
    devise = models.CharField(max_length=3, default='XOF')
    motif = models.CharField(max_length=255)
    statut = models.CharField(max_length=20, choices=STATUTS, default='a_envoyer')
    # Compte Mobile Money indiqué par le voyageur (FedaPay ne communique pas le numéro débité)
    pays = models.CharField(max_length=2, blank=True, choices=PAYS_CHOICES)
    operateur = models.CharField(max_length=30, blank=True, choices=OPERATEUR_CHOICES)
    numero = models.CharField(max_length=15, blank=True)
    payout_id = models.CharField(max_length=64, blank=True)
    tentatives = models.PositiveSmallIntegerField(default=0)
    derniere_erreur = models.TextField(blank=True)
    envoye_le = models.DateTimeField(null=True, blank=True)
    # Email envoyé pour l'état final (remboursé, ou traitement manuel signalé aux administrateurs)
    notifie = models.BooleanField(default=False)
    cree_le = models.DateTimeField(auto_now_add=True)
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'paiements'
        ordering = ['-cree_le']
        verbose_name = 'Remboursement'

    def __str__(self):
        return f"{self.montant} FCFA — {self.reference} ({self.get_statut_display()})"
