from django.db import migrations

# Tarifs de départ (FCFA, aéroport → centre-ville), indicatifs : à ajuster dans l'admin
# avec les chauffeurs partenaires. Majoration de nuit (22 h – 6 h) : +25 %.
AEROPORTS = [
    ('LFW', 'Aéroport international Gnassingbé Eyadéma', 'Lomé', 'TG', 'Africa/Lome', (10000, 15000, 25000)),
    ('COO', 'Aéroport international Cardinal Bernardin Gantin', 'Cotonou', 'BJ', 'Africa/Porto-Novo', (10000, 15000, 25000)),
    ('OUA', 'Aéroport international de Ouagadougou', 'Ouagadougou', 'BF', 'Africa/Ouagadougou', (10000, 15000, 25000)),
    ('NIM', 'Aéroport international Diori Hamani', 'Niamey', 'NE', 'Africa/Niamey', (12000, 18000, 30000)),
    ('BKO', 'Aéroport international Modibo Keïta', 'Bamako', 'ML', 'Africa/Bamako', (15000, 22000, 35000)),
]


def creer(apps, schema_editor):
    Aeroport = apps.get_model('transferts', 'AeroportModel')
    Tarif = apps.get_model('transferts', 'TarifTransfertModel')
    for code, nom, ville, pays, fuseau, prix in AEROPORTS:
        aeroport, _ = Aeroport.objects.get_or_create(
            code=code, defaults={'nom': nom, 'ville': ville, 'pays': pays, 'fuseau': fuseau},
        )
        for categorie, montant in zip(('berline', 'confort', 'van'), prix):
            Tarif.objects.get_or_create(aeroport=aeroport, categorie=categorie, defaults={'prix': montant})


class Migration(migrations.Migration):
    dependencies = [('transferts', '0001_initial')]
    operations = [migrations.RunPython(creer, migrations.RunPython.noop)]
