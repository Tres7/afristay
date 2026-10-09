import uuid

from django.conf import settings
from django.db import models


class ConversationModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations_concierge')
    titre = models.CharField(max_length=120, blank=True)
    # Dernière interaction Gemini : l'API garde l'historique côté Google (55 jours en offre payante)
    interaction_id = models.CharField(max_length=128, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    mis_a_jour_le = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'concierge'
        ordering = ['-mis_a_jour_le']
        verbose_name = 'Conversation avec le Concierge'

    def __str__(self):
        return self.titre or str(self.id)


class MessageModel(models.Model):
    """Un tour de la conversation (message du voyageur, réponse ou appels d'outils du Concierge)."""
    conversation = models.ForeignKey(ConversationModel, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=[('user', 'Voyageur'), ('assistant', 'Concierge')])
    contenu = models.JSONField(default=dict, blank=True, help_text="Détail technique : appels d'outils et leurs arguments")
    # Affichage : texte lisible et offres AfriStay (cartes) ; les résultats d'outils restent invisibles
    texte = models.TextField(blank=True)
    cartes = models.JSONField(default=list, blank=True)
    visible = models.BooleanField(default=True)
    tokens_entree = models.PositiveIntegerField(default=0)
    tokens_sortie = models.PositiveIntegerField(default=0)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'concierge'
        ordering = ['cree_le', 'id']
