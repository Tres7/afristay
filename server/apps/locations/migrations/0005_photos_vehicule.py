from django.db import migrations, models
import django.db.models.deletion


def vers_photos(apps, schema_editor):
    """La photo unique de chaque catégorie devient sa photo principale (même fichier, rien n'est recopié)."""
    Categorie = apps.get_model('locations', 'CategorieVehiculeModel')
    Photo = apps.get_model('locations', 'PhotoVehiculeModel')
    for categorie in Categorie.objects.exclude(image=''):
        Photo.objects.create(categorie=categorie, image=categorie.image.name, ordre=0)


def vers_image(apps, schema_editor):
    Categorie = apps.get_model('locations', 'CategorieVehiculeModel')
    Photo = apps.get_model('locations', 'PhotoVehiculeModel')
    for categorie in Categorie.objects.all():
        principale = Photo.objects.filter(categorie=categorie).order_by('ordre', 'id').first()
        if principale:
            categorie.image = principale.image.name
            categorie.save(update_fields=['image'])


class Migration(migrations.Migration):
    dependencies = [('locations', '0004_lieu_nom_aide')]

    operations = [
        migrations.CreateModel(
            name='PhotoVehiculeModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='locations/')),
                ('ordre', models.PositiveSmallIntegerField(default=0)),
                ('cree_le', models.DateTimeField(auto_now_add=True)),
                ('categorie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='photos',
                                                to='locations.categorievehiculemodel')),
            ],
            options={
                'verbose_name': 'Photo de véhicule',
                'verbose_name_plural': 'Photos de véhicules',
                'ordering': ['ordre', 'id'],
            },
        ),
        migrations.RunPython(vers_photos, vers_image),
        migrations.RemoveField(model_name='categorievehiculemodel', name='image'),
    ]
