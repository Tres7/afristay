from django.db import migrations, models

STATUTS = [('en_attente', 'En attente de vérification'), ('verifiee', 'Vérifiée'), ('refusee', 'Refusée')]


class Migration(migrations.Migration):
    """Vérification des annonces par un agent de terrain avant publication.

    Les annonces existantes restent publiées (statut « verifiee ») ; seules les nouvelles attendent une visite.
    """

    dependencies = [
        ('hebergements', '0004_blocagemodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='hebergementmodel',
            name='motif_refus',
            field=models.TextField(blank=True),
        ),
        # Valeur appliquée aux lignes existantes…
        migrations.AddField(
            model_name='hebergementmodel',
            name='statut_verification',
            field=models.CharField(choices=STATUTS, db_index=True, default='verifiee', max_length=20),
        ),
        # … puis valeur par défaut des nouvelles annonces
        migrations.AlterField(
            model_name='hebergementmodel',
            name='statut_verification',
            field=models.CharField(choices=STATUTS, db_index=True, default='en_attente', max_length=20),
        ),
        migrations.AddField(
            model_name='hebergementmodel',
            name='verifiee_le',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
