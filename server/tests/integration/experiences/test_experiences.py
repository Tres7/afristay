"""Expériences de la page Découvrir : guide repris de l'ancienne page, gestion depuis le back-office."""
from io import BytesIO

import pytest
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.experiences.models import ExperienceModel
from apps.securite.models import JournalAuditModel

PUBLIC = '/api/v1/experiences/'
ADMIN = '/api/v1/admin/experiences/'


@pytest.fixture(autouse=True)
def stockage(tmp_path, monkeypatch):
    monkeypatch.setattr(ExperienceModel._meta.get_field('image'), 'storage', FileSystemStorage(location=tmp_path))


@pytest.fixture
def admin(make_user, client_for):
    return client_for(make_user(role='admin'))


def _photo():
    tampon = BytesIO()
    Image.new('RGB', (900, 600), (200, 120, 20)).save(tampon, format='PNG')
    return SimpleUploadedFile('sortie.png', tampon.getvalue(), content_type='image/png')


def test_guide_repris_de_l_ancienne_page():
    # Les 12 fiches du guide restent en base ; seules celles du Togo sont publiées (audit n° 3)
    assert ExperienceModel.objects.filter(actif=True).count() == 12
    reponse = APIClient().get(PUBLIC)
    assert reponse.status_code == 200 and [e['ville'] for e in reponse.data] == ['Lomé']
    fetiches = reponse.data[0]
    assert fetiches['nom'] == 'Marché des fétiches' and fetiches['pays'] == 'Togo' and fetiches['prix'] == 3000
    assert fetiches['image'].startswith('https://images.unsplash.com/')


def test_reserve_aux_admins(make_user, client_for):
    assert APIClient().get(ADMIN).status_code == 401
    assert client_for(make_user(role='hote')).post(ADMIN, {}, format='json').status_code == 403


def test_ajout_modification_publication_suppression(admin):
    reponse = admin.post(ADMIN, {
        'categorie': 'sites', 'nom': 'Monument de l\'Indépendance', 'nom_en': 'Independence Monument', 'etiquette': 'Histoire',
        'ville': 'Lomé', 'pays': 'Togo', 'description': 'Symbole du 27 avril 1960.', 'prix': '', 'gratuit': 'true',
        'image': _photo(), 'ordre': '0', 'actif': 'true',  # en multipart, un booléen absent vaut faux (règle des formulaires HTML)
    }, format='multipart')
    assert reponse.status_code == 201, reponse.data
    experience = reponse.data
    assert experience['photo'].endswith('.jpg') and experience['prix'] is None and experience['actif'] is True
    assert 'image' not in experience  # écriture seule : l'adresse affichée est « photo »
    assert any(e['id'] == experience['id'] for e in APIClient().get(PUBLIC).data)

    url = f"{ADMIN}{experience['id']}/"
    # Plus gratuite : un prix ; puis retirée du site
    assert admin.patch(url, {'gratuit': False, 'prix': 2000}, format='json').data['prix'] == 2000
    assert admin.patch(url, {'actif': False}, format='json').status_code == 200
    assert all(e['id'] != experience['id'] for e in APIClient().get(PUBLIC).data)
    # Gratuite : le prix est effacé
    assert admin.patch(url, {'gratuit': True, 'prix': 5000}, format='json').data['prix'] is None

    assert admin.delete(url).status_code == 204
    assert not ExperienceModel.objects.filter(pk=experience['id']).exists()
    actions = set(JournalAuditModel.objects.filter(details__objet='experience').values_list('action', flat=True))
    assert actions == {'backoffice_creation', 'backoffice_modification', 'backoffice_suppression'}


def test_champs_obligatoires(admin):
    reponse = admin.post(ADMIN, {'categorie': 'inconnue'}, format='json')
    assert reponse.status_code == 400
    assert {'categorie', 'nom', 'etiquette', 'ville', 'pays', 'description'} <= set(reponse.data)
