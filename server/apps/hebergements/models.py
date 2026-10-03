import uuid
from django.conf import settings
from django.db import models


class HebergementModel(models.Model):
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
    amenities = models.JSONField(default=list)
    is_available = models.BooleanField(default=True)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hebergements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'hebergements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.city})"
