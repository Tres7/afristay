from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('locations', '0003_locationmodel_relance_paiement')]

    operations = [
        migrations.AlterField(
            model_name='lieuremisemodel',
            name='nom',
            field=models.CharField(help_text='Par ex. « Aéroport de Lomé » ou « Livraison à votre adresse, Lomé »', max_length=120),
        ),
    ]
