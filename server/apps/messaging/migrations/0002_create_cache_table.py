from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    # Table du DatabaseCache (compteurs des throttles). Idempotent : sans effet si elle existe déjà.
    call_command('createcachetable', verbosity=0)


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_cache_table, migrations.RunPython.noop),
    ]
