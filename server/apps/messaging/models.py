import uuid
from django.conf import settings
from django.db import models

from apps.hebergements.models import HebergementModel


class ConversationModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hebergement = models.ForeignKey(
        HebergementModel,
        on_delete=models.SET_NULL,
        related_name='conversations',
        null=True,
        blank=True,
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_guest',
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations_as_host',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'messaging'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['guest', 'host', 'hebergement'],
                name='unique_conversation_guest_host_hebergement',
            ),
        ]

    def __str__(self):
        return f"Conversation {self.guest_id} ↔ {self.host_id}"

    def other_participant(self, user):
        return self.host if user.id == self.guest_id else self.guest


class MessageModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        ConversationModel,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'messaging'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender_id}: {self.content[:30]}"
