from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import AvisModel
from .services import recalculer_note


@receiver(post_delete, sender=AvisModel)
def avis_supprime(sender, instance, **kwargs):
    # Ex. réservation ou compte supprimé : la note affichée reste fidèle aux avis restants
    recalculer_note(instance.hebergement_id)
