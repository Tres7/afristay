"""Back-office : gestion de la location de voiture."""
from datetime import timedelta
from io import BytesIO

import pytest
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from apps.locations.models import CategorieVehiculeModel, LieuRemiseModel, LocationModel, PartenaireLocationModel
from apps.securite.models import JournalAuditModel

B = '/api/v1/admin/location/'


@pytest.fixture
def admin(make_user, client_for):
    return client_for(make_user(role='admin'))


@pytest.fixture(autouse=True)
def stockage(tmp_path, monkeypatch):
    monkeypatch.setattr(CategorieVehiculeModel._meta.get_field('image'), 'storage', FileSystemStorage(location=tmp_path))


@pytest.fixture
def lieu():
    return LieuRemiseModel.objects.create(nom='Aéroport de Lomé', ville='Lomé', fuseau='Africa/Lome')


@pytest.fixture
def berline():
    c = CategorieVehiculeModel.objects.get(nom='Berline')
    c.prix_jour_avec_chauffeur, c.actif = 45000, True
    c.save()
    return c


@pytest.fixture
def location(make_user, berline, lieu):
    debut = timezone.now() + timedelta(days=5)
    return LocationModel.objects.create(
        voyageur=make_user(), categorie=berline, formule='avec_chauffeur', lieu_prise=lieu, lieu_retour=lieu,
        debut=debut, fin=debut + timedelta(days=3), passagers=2, telephone='+22890000000', precisions='Lomé - Kpalimé',
        jours=3, prix_jour=45000, frais_lieux=0, prix=135000, commission=20250, statut='confirmee',
    )


def _loueur(berline, lieu, **extra):
    p = PartenaireLocationModel.objects.create(nom='Lomé Auto', contact='Yao', telephone='+22890112233',
                                               pays_versement='TG', operateur_versement='togocel', numero_versement='90112233', **extra)
    p.categories.add(berline)
    p.lieux.add(lieu)
    return p


def test_reserve_aux_admins(make_user, client_for):
    assert client_for(make_user(role='agent')).get(B + 'categories/').status_code == 403


def test_regles_creees_puis_modifiees(admin):
    assert admin.get(B + 'regles/').data is None
    regles = {'commission_pourcent': '15', 'delai_min_jours': 2, 'duree_max_jours': 30, 'annulation_gratuite_heures': 48,
              'conditions': '23 ans minimum.'}
    assert admin.put(B + 'regles/', regles, format='json').status_code == 200
    assert admin.put(B + 'regles/', {**regles, 'delai_min_jours': 3}, format='json').data['delai_min_jours'] == 3
    assert JournalAuditModel.objects.filter(action='backoffice_modification', details__objet='regles_location').count() == 2


def test_categorie_prix_photo_et_activation(admin):
    citadine = CategorieVehiculeModel.objects.get(nom='Citadine')
    url = f'{B}categories/{citadine.id}/'
    # Pas d'activation sans prix
    assert admin.patch(url, {'actif': True}, format='json').status_code == 400
    assert admin.patch(url, {'prix_jour_sans_chauffeur': 25000, 'actif': True}, format='json').data['actif'] is True
    tampon = BytesIO()
    Image.new('RGB', (900, 600), (20, 120, 200)).save(tampon, format='PNG')
    reponse = admin.patch(url, {'image': SimpleUploadedFile('voiture.png', tampon.getvalue(), content_type='image/png')},
                          format='multipart')
    assert reponse.status_code == 200 and reponse.data['image'].endswith('.jpg')
    assert JournalAuditModel.objects.filter(action='backoffice_modification', details__objet='categorie_vehicule').exists()


def test_lieu_et_loueur(admin, berline):
    lieu = admin.post(B + 'lieux/', {'nom': 'Aéroport de Cotonou', 'ville': 'Cotonou', 'fuseau': 'Africa/Porto-Novo'},
                      format='json')
    assert lieu.status_code == 201
    loueur = admin.post(B + 'loueurs/', {
        'nom': 'Cotonou Cars', 'contact': 'Ayaba', 'telephone': '+22997000000', 'categories': [berline.id],
        'lieux': [lieu.data['id']], 'pays_versement': 'BJ', 'operateur_versement': 'mtn_open', 'numero_versement': '0197000000',
    }, format='json')
    assert loueur.status_code == 201, loueur.data
    mauvais = admin.patch(f"{B}loueurs/{loueur.data['id']}/", {'operateur_versement': 'togocel'}, format='json')
    assert mauvais.status_code == 400
    assert admin.get(B + 'loueurs/').data[0]['nom'] == 'Cotonou Cars'
    assert JournalAuditModel.objects.filter(action='backoffice_creation', details__objet='loueur').exists()


def test_attribuer_un_loueur(admin, location, berline, lieu):
    autre_lieu = LieuRemiseModel.objects.create(nom='Kara', ville='Kara', fuseau='Africa/Lome')
    bon = _loueur(berline, lieu)
    ailleurs = _loueur(berline, autre_lieu, email='')
    ailleurs.lieux.set([autre_lieu])
    assert [p['id'] for p in admin.get(f'{B}locations/{location.id}/loueurs/').data] == [bon.id]

    url = f'{B}locations/{location.id}/attribuer/'
    assert admin.post(url, {'partenaire': ailleurs.id, 'vehicule': 'Toyota Corolla grise'}, format='json').status_code == 400
    # Formule avec chauffeur : nom et téléphone exigés
    assert admin.post(url, {'partenaire': bon.id, 'vehicule': 'Toyota Corolla grise'}, format='json').status_code == 400
    reponse = admin.post(url, {'partenaire': bon.id, 'vehicule': 'Toyota Corolla grise', 'immatriculation': 'TG 1234 AB',
                               'chauffeur_nom': 'Komlan', 'chauffeur_telephone': '+22890998877'}, format='json')
    assert reponse.status_code == 200, reponse.data
    assert reponse.data['statut'] == 'partenaire_assigne' and reponse.data['partenaire']['nom'] == 'Lomé Auto'


def test_liste_et_annulation(admin, location):
    assert admin.get(B + 'locations/', {'statut': 'confirmee'}).data['count'] == 1
    assert admin.post(f'{B}locations/{location.id}/annuler/', {}, format='json').status_code == 400
    reponse = admin.post(f'{B}locations/{location.id}/annuler/', {'motif': 'Aucun loueur disponible'}, format='json')
    assert reponse.status_code == 200 and reponse.data['statut'] == 'annulee'
