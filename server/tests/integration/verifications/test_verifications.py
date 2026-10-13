"""Vérification des annonces par un agent de terrain : publication, pièce d'identité, visite, droits."""
import json
from io import BytesIO

import pytest
from django.core import mail
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.hebergements.models import HebergementModel
from apps.securite.models import JournalAuditModel
from apps.verifications.models import PhotoVisiteModel, PieceIdentiteModel, VisiteModel

HEBERGEMENTS = '/api/v1/hebergements/'
IDENTITE = '/api/v1/verifications/identite/'
VISITES = '/api/v1/verifications/visites/'
TOUT_CONFORME = {'identite': True, 'adresse': True, 'photos': True, 'equipements': True}


@pytest.fixture(autouse=True)
def stockage_temporaire(tmp_path, monkeypatch):
    """Documents privés dans un dossier temporaire (jamais dans le dépôt)."""
    stockage = FileSystemStorage(location=tmp_path)
    monkeypatch.setattr(PieceIdentiteModel._meta.get_field('fichier'), 'storage', stockage)
    monkeypatch.setattr(PhotoVisiteModel._meta.get_field('image'), 'storage', stockage)
    return tmp_path


def _image(nom='piece.jpg', taille=(800, 500)):
    tampon = BytesIO()
    Image.new('RGB', taille, (200, 120, 40)).save(tampon, format='JPEG')
    return SimpleUploadedFile(nom, tampon.getvalue(), content_type='image/jpeg')


def _annonce(**extra):
    return {
        'name': 'Villa des cocotiers', 'type': 'villa', 'city': 'Lomé', 'location': 'Bè Kpota',
        'price_per_night': 35000, 'max_guests': 4, 'amenities': ['wifi'],
        'image_url': 'https://images.unsplash.com/photo-1.jpg', 'images': ['https://images.unsplash.com/photo-1.jpg'],
        **extra,
    }


@pytest.fixture
def hote(make_user):
    return make_user(role='hote', phone='+22890000001')


@pytest.fixture
def agent(make_user):
    return make_user(role='agent')


@pytest.fixture
def en_attente(make_hebergement, hote):
    return make_hebergement(host=hote, statut_verification='en_attente', city='Lomé', location='Bè Kpota')


def _envoyer_piece(client, fichier=None, type_piece='cni'):
    return client.post(IDENTITE, {'type_piece': type_piece, 'fichier': fichier or _image()}, format='multipart')


def _decider(client, hebergement, decision='validee', controles=None, commentaire='', photos=()):
    donnees = {'decision': decision, 'controles': json.dumps(controles if controles is not None else TOUT_CONFORME),
               'commentaire': commentaire}
    if photos:
        donnees['photos'] = list(photos)
    return client.post(f'{VISITES}{hebergement.id}/decision/', donnees, format='multipart')


class TestPublication:
    def test_new_listing_waits_for_a_visit_and_agents_are_told(self, client_for, hote, agent, api_client,
                                                                 django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            response = client_for(hote).post(HEBERGEMENTS, _annonce(), format='json')
        assert response.status_code == 201
        assert response.data['statut_verification'] == 'en_attente'
        identifiant = response.data['id']

        assert api_client.get(HEBERGEMENTS).data['count'] == 0
        assert api_client.get(f'{HEBERGEMENTS}{identifiant}/').status_code == 404
        assert client_for(hote).get(f'{HEBERGEMENTS}{identifiant}/').status_code == 200
        assert client_for(agent).get(f'{HEBERGEMENTS}{identifiant}/').status_code == 200
        assert [m.to for m in mail.outbox] == [[agent.email]]
        assert 'Visite à planifier' in mail.outbox[0].subject

    def test_unpublished_listing_cannot_be_booked_liked_or_contacted(self, client_for, make_user, en_attente):
        voyageur = client_for(make_user())
        reservation = voyageur.post('/api/v1/reservations/', {
            'hebergement': str(en_attente.id), 'check_in': '2030-01-10', 'check_out': '2030-01-12', 'guests_count': 2,
        }, format='json')
        assert reservation.status_code == 400
        assert voyageur.post('/api/v1/favoris/', {'hebergement': str(en_attente.id)}, format='json').status_code == 400
        conversation = voyageur.post('/api/v1/messaging/conversations/', {'hebergement_id': str(en_attente.id)},
                                     format='json')
        assert conversation.status_code == 404

    def test_concierge_never_suggests_unverified_listings(self, en_attente, make_hebergement):
        from apps.concierge.outils import rechercher_logements
        make_hebergement(name='Verifiee', city='Lomé')
        resultats, _ = rechercher_logements({'ville': 'Lomé'})
        assert [r['nom'] for r in resultats['resultats']] == ['Verifiee']

    def test_editing_address_or_photos_sends_a_verified_listing_back(self, client_for, hote, make_hebergement,
                                                                      django_capture_on_commit_callbacks):
        h = make_hebergement(host=hote, city='Lomé')
        client = client_for(hote)
        assert client.patch(f'{HEBERGEMENTS}{h.id}/', {'price_per_night': 40000}, format='json').data[
            'statut_verification'] == 'verifiee'
        with django_capture_on_commit_callbacks(execute=True):
            response = client.patch(f'{HEBERGEMENTS}{h.id}/', {'city': 'Kpalimé'}, format='json')
        assert response.data['statut_verification'] == 'en_attente'
        assert not HebergementModel.objects.publiees().filter(pk=h.pk).exists()

    def test_editing_a_refused_listing_asks_for_a_new_visit(self, client_for, hote, en_attente):
        en_attente.statut_verification, en_attente.motif_refus = 'refusee', 'Photos non conformes au logement.'
        en_attente.save()
        mine = client_for(hote).get(f'{HEBERGEMENTS}mine/').data['results'][0]
        assert mine['motif_refus'] == 'Photos non conformes au logement.'
        response = client_for(hote).patch(f'{HEBERGEMENTS}{en_attente.id}/', {'description': 'Nouvelles photos'},
                                          format='json')
        assert response.data['statut_verification'] == 'en_attente'
        assert response.data['motif_refus'] == ''


class TestPieceIdentite:
    def test_host_sends_an_image_reencoded_without_metadata(self, client_for, hote):
        response = _envoyer_piece(client_for(hote))
        assert response.status_code == 201
        assert response.data['statut'] == 'soumise'
        piece = PieceIdentiteModel.objects.get(hote=hote)
        assert piece.type_contenu == 'image/jpeg' and piece.fichier.name.endswith('.jpg')

    def test_pdf_accepted(self, client_for, hote):
        pdf = SimpleUploadedFile('piece.pdf', b'%PDF-1.7\n%test\n', content_type='application/pdf')
        assert _envoyer_piece(client_for(hote), pdf).status_code == 201
        assert PieceIdentiteModel.objects.get(hote=hote).type_contenu == 'application/pdf'

    @pytest.mark.parametrize('contenu', [b'<script>alert(1)</script>', b'MZ\x90\x00 executable'])
    def test_other_files_rejected(self, client_for, hote, contenu):
        faux = SimpleUploadedFile('piece.jpg', contenu, content_type='image/jpeg')
        assert _envoyer_piece(client_for(hote), faux).status_code == 400

    def test_only_hosts_send_one(self, client_for, make_user):
        assert _envoyer_piece(client_for(make_user())).status_code == 403

    def test_replacing_deletes_the_previous_file(self, client_for, hote, stockage_temporaire):
        client = client_for(hote)
        _envoyer_piece(client)
        ancien = PieceIdentiteModel.objects.get(hote=hote).fichier.name
        _envoyer_piece(client, type_piece='passeport')
        piece = PieceIdentiteModel.objects.get(hote=hote)
        assert piece.type_piece == 'passeport'
        assert not (stockage_temporaire / ancien).exists()

    def test_only_verifiers_read_the_document_and_every_read_is_audited(self, client_for, hote, agent, make_user):
        _envoyer_piece(client_for(hote))
        url = f'{IDENTITE}{hote.id}/fichier/'
        assert client_for(make_user()).get(url).status_code == 403
        assert client_for(hote).get(url).status_code == 403
        response = client_for(agent).get(url)
        assert response.status_code == 200
        assert response['Cache-Control'] == 'no-store'
        assert 'sandbox' in response['Content-Security-Policy']
        assert JournalAuditModel.objects.filter(action='piece_consultee', utilisateur_id=agent.id).exists()


class TestVisite:
    def test_only_verifiers_see_the_visits(self, client_for, agent, make_user, hote, en_attente):
        assert client_for(hote).get(VISITES).status_code == 403
        assert client_for(make_user()).get(VISITES).status_code == 403
        data = client_for(agent).get(VISITES).data
        assert [v['id'] for v in data['results']] == [str(en_attente.id)]
        assert data['results'][0]['hote']['telephone'] == '+22890000001'
        assert data['results'][0]['hote']['piece']['statut'] == 'absente'

    def test_validation_publishes_and_deletes_the_identity_document(self, client_for, agent, hote, en_attente,
                                                                     api_client, stockage_temporaire,
                                                                     django_capture_on_commit_callbacks):
        _envoyer_piece(client_for(hote))
        fichier = PieceIdentiteModel.objects.get(hote=hote).fichier.name
        with django_capture_on_commit_callbacks(execute=True):
            response = _decider(client_for(agent), en_attente, photos=[_image('a.jpg'), _image('b.jpg')])
        assert response.status_code == 201

        en_attente.refresh_from_db()
        assert en_attente.statut_verification == 'verifiee' and en_attente.verifiee_le
        assert api_client.get(HEBERGEMENTS).data['count'] == 1
        piece = PieceIdentiteModel.objects.get(hote=hote)
        assert piece.statut == 'verifiee' and piece.verifiee_par == agent and not piece.fichier
        assert not (stockage_temporaire / fichier).exists()
        visite = VisiteModel.objects.get()
        assert visite.controles == TOUT_CONFORME and visite.photos.count() == 2
        assert mail.outbox[-1].to == [hote.email] and 'vérifié' in mail.outbox[-1].subject

    def test_cannot_validate_without_every_check_or_identity(self, client_for, agent, hote, en_attente):
        client = client_for(agent)
        assert _decider(client, en_attente).status_code == 400  # pas de pièce d'identité
        _envoyer_piece(client_for(hote))
        assert _decider(client, en_attente, controles={**TOUT_CONFORME, 'photos': False}).status_code == 400
        en_attente.refresh_from_db()
        assert en_attente.statut_verification == 'en_attente'

    def test_refusal_needs_a_reason_given_to_the_host_only(self, client_for, agent, hote, en_attente, api_client,
                                                            django_capture_on_commit_callbacks):
        client = client_for(agent)
        assert _decider(client, en_attente, decision='refusee', commentaire='non').status_code == 400
        motif = 'La piscine annoncée n’existe pas.'
        with django_capture_on_commit_callbacks(execute=True):
            response = _decider(client, en_attente, decision='refusee', commentaire=motif,
                                controles={**TOUT_CONFORME, 'equipements': False})
        assert response.status_code == 201
        assert client_for(hote).get(f'{HEBERGEMENTS}mine/').data['results'][0]['motif_refus'] == motif
        assert api_client.get(HEBERGEMENTS).data['count'] == 0
        assert motif in mail.outbox[-1].body

    def test_an_already_decided_listing_cannot_be_decided_again(self, client_for, agent, hote, en_attente):
        _envoyer_piece(client_for(hote))
        assert _decider(client_for(agent), en_attente).status_code == 201
        assert _decider(client_for(agent), en_attente).status_code == 400

    def test_hosts_cannot_validate_their_own_listing(self, client_for, hote, en_attente):
        _envoyer_piece(client_for(hote))
        assert _decider(client_for(hote), en_attente).status_code == 403


def test_agent_role_cannot_be_chosen_at_registration(api_client):
    response = api_client.post('/api/v1/auth/register/', {
        'email': 'faux.agent@example.tg', 'first_name': 'A', 'last_name': 'B', 'role': 'agent',
        'password': 'Afristay-Test-2026!', 'password_confirm': 'Afristay-Test-2026!',
    }, format='json')
    assert response.status_code == 400
