from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('users', '0005_role_agent')]

    operations = [
        migrations.AddField(
            model_name='usermodel',
            name='fenetre_lancement_vue_le',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
