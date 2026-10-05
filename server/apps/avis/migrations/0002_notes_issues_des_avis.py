from django.db import migrations
from django.db.models import Avg, Count


def aligner_notes(apps, schema_editor):
    """Les notes étaient saisies à la main (données de démo) : elles proviennent désormais des seuls avis vérifiés."""
    Hebergement = apps.get_model('hebergements', 'HebergementModel')
    for h in Hebergement.objects.annotate(moy=Avg('avis__note'), nb=Count('avis')):
        Hebergement.objects.filter(pk=h.pk).update(rating=round(h.moy or 0, 2), review_count=h.nb)


class Migration(migrations.Migration):

    dependencies = [
        ('avis', '0001_initial'),
        ('hebergements', '0003_hebergementphotomodel'),
    ]

    operations = [
        migrations.RunPython(aligner_notes, migrations.RunPython.noop),
    ]
