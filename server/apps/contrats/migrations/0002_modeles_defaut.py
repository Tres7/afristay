from django.db import migrations


def installer(apps, schema_editor):
    from apps.contrats.modeles_defaut import MODELES

    Modele = apps.get_model('contrats', 'ModeleContratModel')
    for type_contrat, (titre, corps) in MODELES.items():
        Modele.objects.get_or_create(type=type_contrat, defaults={'titre': titre, 'corps': corps})


class Migration(migrations.Migration):
    dependencies = [('contrats', '0001_initial')]
    operations = [migrations.RunPython(installer, migrations.RunPython.noop)]
