from django.db import migrations

# Gammes proposées, sans prix et inactives : l'administration saisit les prix (et une photo) puis les active.
# Les places, bagages et modèles d'exemple se modifient aussi dans l'administration.
CATEGORIES = [
    # nom, gamme, exemple, places, bagages, boîte, carburant, ordre
    ('Citadine', 'citadine', 'Toyota Yaris, Hyundai i10 ou similaire', 4, 1, 'manuelle', 'essence', 10),
    ('Citadine automatique', 'citadine', 'Toyota Yaris, Kia Picanto ou similaire', 4, 1, 'automatique', 'essence', 15),
    ('Berline', 'berline', 'Toyota Corolla, Hyundai Elantra ou similaire', 5, 2, 'automatique', 'essence', 20),
    ('SUV', 'suv', 'Toyota RAV4, Hyundai Tucson ou similaire', 5, 3, 'automatique', 'essence', 30),
    ('4x4 tout-terrain', '4x4', 'Toyota Land Cruiser, Prado ou similaire', 7, 4, 'automatique', 'diesel', 40),
    ('Minibus', 'minibus', 'Toyota Hiace ou similaire', 14, 10, 'manuelle', 'diesel', 50),
    ('Utilitaire', 'utilitaire', 'Toyota Hilux (pick-up) ou similaire', 5, 6, 'manuelle', 'diesel', 60),
]


def creer(apps, schema_editor):
    Categorie = apps.get_model('locations', 'CategorieVehiculeModel')
    for nom, gamme, exemple, places, bagages, boite, carburant, ordre in CATEGORIES:
        Categorie.objects.get_or_create(nom=nom, defaults=dict(
            gamme=gamme, exemple_modele=exemple, places=places, bagages=bagages, boite=boite, carburant=carburant,
            climatisation=True, ordre=ordre, actif=False,
        ))


class Migration(migrations.Migration):

    dependencies = [
        ('locations', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(creer, migrations.RunPython.noop),
    ]
