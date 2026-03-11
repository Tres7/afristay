import uuid
from django.conf import settings
from django.db import models

from apps.hebergements.models import HebergementModel


class ReservationModel(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmée'),
        ('cancelled', 'Annulée'),
    ]

    PAYMENT_CHOICES = [
        ('mobile_money', 'Mobile Money'),
        ('carte', 'Carte bancaire'),
        ('paypal', 'PayPal'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hebergement = models.ForeignKey(
        HebergementModel,
        on_delete=models.CASCADE,
        related_name='reservations',
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reservations',
    )
    check_in = models.DateField()
    check_out = models.DateField()
    guests_count = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='mobile_money')
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'reservations'
        ordering = ['-created_at']

    def __str__(self):
        return f"RES-{str(self.id)[:8].upper()} — {self.hebergement.name}"

    @property
    def nights(self):
        return (self.check_out - self.check_in).days

    @property
    def reference(self):
        return f"RES-AF{self.created_at.year}-{str(self.id)[:4].upper()}"
