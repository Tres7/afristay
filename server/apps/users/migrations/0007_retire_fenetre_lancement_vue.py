from django.db import migrations


class Migration(migrations.Migration):
    """La fenêtre « Logements bientôt disponibles » revient à chaque visite : plus rien à retenir sur le compte.

    Le champ quitte le modèle mais la colonne (vide et facultative) reste en base : pendant le déploiement et en cas
    de retour à un manifest antérieur, l'ancien code la lit encore (deploy/vps/README.md : ajouter avant de
    supprimer). Une migration ultérieure pourra la supprimer une fois cette version installée."""

    dependencies = [('users', '0006_fenetre_lancement_vue')]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[migrations.RemoveField(model_name='usermodel', name='fenetre_lancement_vue_le')],
            database_operations=[],
        ),
    ]
