from django.db import migrations, models

TYPES = [
    ('hote', 'Hôte particulier'),
    ('hotel', 'Hôtel ou résidence hôtelière'),
    ('loueur', 'Propriétaire de véhicule'),
    ('chauffeur', 'Chauffeur partenaire'),
    ('ong', 'ONG partenaire'),
]


def installer(apps, schema_editor):
    """Contrats B1, B2, B4, B5 et B6 du 18 octobre 2026, avec la charte du Réseau Kwa-Ba Partenaires en annexe.

    Les modèles sont remplacés (nouvelle version) : les contrats déjà émis gardent le texte de leur version.
    """
    from apps.contrats.modeles_defaut import MODELES

    Modele = apps.get_model('contrats', 'ModeleContratModel')
    for type_contrat, (titre, corps) in MODELES.items():
        modele, cree = Modele.objects.get_or_create(type=type_contrat, defaults={'titre': titre, 'corps': corps})
        if not cree and modele.corps.replace('\r\n', '\n') != corps:
            modele.titre, modele.corps, modele.version = titre, corps, modele.version + 1
            modele.save(update_fields=['titre', 'corps', 'version'])


class Migration(migrations.Migration):
    dependencies = [('contrats', '0005_preinscription')]
    operations = [
        migrations.AlterField(model_name='modelecontratmodel', name='type', field=models.CharField(choices=TYPES, max_length=20, unique=True)),
        migrations.AlterField(model_name='contratmodel', name='type', field=models.CharField(choices=TYPES, max_length=20)),
        migrations.RunPython(installer, migrations.RunPython.noop),
    ]
