from django.db import migrations


def masquer(apps, schema_editor):
    """Messages envoyés avant le filtrage : coordonnées masquées, comme pour les nouveaux."""
    from apps.securite.coordonnees import analyser, masquees

    Message = apps.get_model('messaging', 'MessageModel')
    for message in Message.objects.filter(masque=False).only('id', 'content').iterator(chunk_size=500):
        texte, trouvailles = analyser(message.content)
        if masquees(trouvailles):
            Message.objects.filter(pk=message.pk).update(content=texte, masque=True)


class Migration(migrations.Migration):
    dependencies = [('messaging', '0003_message_masque')]
    operations = [migrations.RunPython(masquer, migrations.RunPython.noop)]
