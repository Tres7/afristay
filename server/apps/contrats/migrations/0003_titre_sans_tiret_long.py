from django.db import migrations

ANCIEN = 'Contrat de partenariat Chauffeur — transferts aéroport'
NOUVEAU = 'Contrat de partenariat Chauffeur (transferts aéroport)'


def renommer(apps, schema_editor):
    """Titre du modèle par défaut sans tiret long. Les contrats déjà signés gardent leur titre (pièces signées)."""
    apps.get_model('contrats', 'ModeleContratModel').objects.filter(titre=ANCIEN).update(titre=NOUVEAU)


def annuler(apps, schema_editor):
    apps.get_model('contrats', 'ModeleContratModel').objects.filter(titre=NOUVEAU).update(titre=ANCIEN)


class Migration(migrations.Migration):
    dependencies = [('contrats', '0002_modeles_defaut')]
    operations = [migrations.RunPython(renommer, annuler)]
