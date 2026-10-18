from django.db import migrations

# Textes du contrat Loueur avant et après la caution en ligne (locations/0006). Le modèle n'est mis à jour que s'il
# contient encore le texte d'origine : un texte modifié dans le back-office n'est pas touché. Les contrats déjà
# émis gardent le texte de leur version.
REMPLACEMENTS = [
    ('Le Loueur peut demander une caution, dont le montant est affiché au voyageur avant le paiement ; elle est restituée au retour du véhicule en bon état.',
     "Le Loueur peut demander une caution, dont le montant est affiché au voyageur avant le paiement ; elle est réglée à Kwa-Ba selon l'article « Caution »."),
    ('Le voyageur règle en ligne le prix de la location à Kwa-Ba. Kwa-Ba retient une commission de {{ tarifs.commission_loueur }} et verse le solde au Loueur par Mobile Money vingt-quatre (24) heures après la fin de la location, sur le numéro communiqué à Kwa-Ba. Le Loueur ne demande aucun paiement complémentaire au voyageur, hors caution annoncée et dommages constatés contradictoirement.',
     "Le voyageur règle en ligne le prix de la location à Kwa-Ba. Kwa-Ba retient une commission de {{ tarifs.commission_loueur }} et verse le solde au Loueur par Mobile Money vingt-quatre (24) heures après la fin de la location, ou à la fin du délai de signalement des dommages lorsque la location comporte une caution, sur le numéro communiqué à Kwa-Ba. Le Loueur ne demande aucun paiement au voyageur, ni caution ni complément : tout passe par Kwa-Ba.\n\n## Caution\nLa caution est payée en ligne par le voyageur à Kwa-Ba, qui la conserve pendant la location. Le Loueur signale à Kwa-Ba tout dommage ou carburant manquant constaté au retour du véhicule, photos à l'appui, dans les {{ tarifs.restitution_caution }} heures suivant la fin de la location. Kwa-Ba fixe le montant retenu, dans la limite de la caution, et le verse au Loueur avec la location, sans commission ; le solde est remboursé au voyageur. Passé ce délai, la caution est remboursée intégralement au voyageur."),
]


def appliquer(apps, schema_editor, sens=1):
    Modele = apps.get_model('contrats', 'ModeleContratModel')
    for modele in Modele.objects.filter(type='loueur'):
        corps = modele.corps.replace('\r\n', '\n')
        paires = [(a, b) if sens == 1 else (b, a) for a, b in REMPLACEMENTS]
        if not all(a in corps for a, _ in paires):
            continue
        for a, b in paires:
            corps = corps.replace(a, b)
        modele.corps, modele.version = corps, modele.version + 1
        modele.save(update_fields=['corps', 'version'])


def annuler(apps, schema_editor):
    appliquer(apps, schema_editor, sens=-1)


class Migration(migrations.Migration):
    dependencies = [('contrats', '0003_titre_sans_tiret_long')]
    operations = [migrations.RunPython(appliquer, annuler)]
