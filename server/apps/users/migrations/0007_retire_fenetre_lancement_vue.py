from django.db import migrations


class Migration(migrations.Migration):
    """La fenêtre « Logements bientôt disponibles » revient à chaque visite : plus rien à retenir sur le compte."""

    dependencies = [('users', '0006_fenetre_lancement_vue')]

    operations = [
        migrations.RemoveField(model_name='usermodel', name='fenetre_lancement_vue_le'),
    ]
