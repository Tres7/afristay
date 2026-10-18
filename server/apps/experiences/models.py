"""Expériences de la page Découvrir : activités, restaurants, loisirs et sites, gérés depuis le back-office."""
from django.db import models


class ExperienceModel(models.Model):
    CATEGORIES = [
        ('activites', 'Activité'),
        ('restaurants', 'Restaurant'),
        ('loisirs', 'Loisir'),
        ('sites', 'Site touristique'),
    ]

    categorie = models.CharField(max_length=20, choices=CATEGORIES, db_index=True)
    nom = models.CharField(max_length=120)
    nom_en = models.CharField(max_length=120, blank=True, help_text='Vide : le nom français est affiché')
    etiquette = models.CharField(max_length=40, help_text='Par ex. « Culture », « Plage », « Ivoirien »')
    etiquette_en = models.CharField(max_length=40, blank=True)
    ville = models.CharField(max_length=100, db_index=True)
    pays = models.CharField(max_length=100)
    pays_en = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    description_en = models.TextField(blank=True)
    prix = models.PositiveIntegerField(null=True, blank=True, help_text='FCFA, indicatif. Vide : pas de prix affiché')
    gratuit = models.BooleanField(default=False)
    image = models.ImageField(upload_to='experiences/', blank=True)
    # Photo externe des expériences reprises de l'ancien guide ; une photo envoyée depuis le back-office la remplace
    image_url = models.URLField(max_length=500, blank=True)
    actif = models.BooleanField(default=True, help_text='Affichée sur la page Découvrir')
    ordre = models.PositiveSmallIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordre', 'id']
        verbose_name = 'Expérience'
        verbose_name_plural = 'Expériences'

    def __str__(self):
        return f"{self.nom} ({self.ville})"

    def photo(self, request=None) -> str | None:
        if self.image:
            return request.build_absolute_uri(self.image.url) if request else self.image.url
        return self.image_url or None
