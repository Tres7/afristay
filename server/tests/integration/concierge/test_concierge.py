"""AI Concierge : outils AfriStay et boucle de conversation. L'API Claude est simulée (aucun appel réseau)."""
import json
from datetime import timedelta
from types import SimpleNamespace
from unittest import mock

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.concierge import outils, services
from apps.concierge.models import MessageModel

CONVERSATIONS = '/api/v1/concierge/conversations/'


@pytest.fixture
def concierge(settings):
    settings.CONCIERGE = {**settings.CONCIERGE, 'API_KEY': 'sk-ant-test', 'MAX_PAR_HEURE': 20, 'MAX_PAR_JOUR': 60,
                          'RECHERCHE_WEB': True}
    return settings


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


# --- Faux client Claude ------------------------------------------------------------------

class Bloc(SimpleNamespace):
    def to_dict(self):
        return {k: v for k, v in vars(self).items()}


class Reponse:
    def __init__(self, blocs, stop_reason):
        self.content = blocs
        self.stop_reason = stop_reason
        self.usage = SimpleNamespace(input_tokens=1000, output_tokens=200)

    def to_dict(self):
        return {'content': [b.to_dict() for b in self.content]}


class Flux:
    def __init__(self, reponse):
        self.reponse = reponse

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def __iter__(self):
        for b in self.reponse.content:
            yield SimpleNamespace(type='content_block_start', content_block=b)
            if b.type == 'text':
                yield SimpleNamespace(type='text', text=b.text)

    def get_final_message(self):
        return self.reponse


class FauxClaude:
    """Renvoie les réponses prévues, dans l'ordre, et garde les requêtes reçues."""

    def __init__(self, *reponses):
        self.reponses = list(reponses)
        self.requetes = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(stream=self._stream))

    def _stream(self, **kwargs):
        self.requetes.append(json.loads(json.dumps(kwargs, default=str)))
        return Flux(self.reponses.pop(0))


def _evenements(response):
    brut = b''.join(response.streaming_content).decode()
    return [(bloc.split('\n')[0][7:], json.loads(bloc.split('\n')[1][6:])) for bloc in brut.strip().split('\n\n')]


# --- Outils ------------------------------------------------------------------------------

def test_recherche_de_logements_reels_avec_cout_du_sejour(make_hebergement):
    make_hebergement(name='Appart Bè', city='Lomé', price_per_night=30000, max_guests=2, rating=4.8)
    make_hebergement(name='Villa Baguida', city='Lomé', price_per_night=80000, max_guests=6)
    make_hebergement(name='Hôtel Cotonou', city='Cotonou', price_per_night=20000)
    arrivee = timezone.localdate() + timedelta(days=20)

    resultat, cartes = outils.rechercher_logements({
        'ville': 'lomé', 'arrivee': arrivee.isoformat(), 'depart': (arrivee + timedelta(days=5)).isoformat(),
        'voyageurs': 2, 'budget_max_nuit': 50000, 'type': None,
    })
    assert [r['nom'] for r in resultat['resultats']] == ['Appart Bè']
    assert resultat['resultats'][0]['cout_total_sejour_fcfa'] == 162000  # 5 x 30 000 + 8 %
    assert cartes[0]['type'] == 'logement' and cartes[0]['total'] == 162000

    vide, _ = outils.rechercher_logements({'ville': 'Kigali', 'arrivee': None, 'depart': None, 'voyageurs': None,
                                           'budget_max_nuit': None, 'type': None})
    assert vide['resultats'] == [] and 'ne recommande pas' in vide['message']


def test_entrees_invalides_renvoyees_en_erreur_au_modele():
    contenu, cartes, erreur = outils.executer('rechercher_logements', {'ville': 'Lomé', 'arrivee': '12/11/2026'})
    assert erreur and 'date invalide' in contenu and cartes == []
    assert outils.executer('rechercher_logements', 'pas un objet')[2] is True
    assert outils.executer('outil_inconnu', {})[2] is True


def test_devis_transfert_et_aeroport_non_desservi():
    jour = (timezone.localdate() + timedelta(days=10)).isoformat()
    resultat, cartes = outils.devis_transfert({'aeroport': 'lfw', 'arrivee': f'{jour}T23:30', 'passagers': 2, 'bagages': 2})
    assert resultat['options'][0]['prix'] == 12500 and resultat['options'][0]['nuit'] is True
    assert cartes[0]['type'] == 'transfert' and cartes[0]['arrivee'] == f'{jour}T23:30'
    inconnu, _ = outils.devis_transfert({'aeroport': 'CDG', 'arrivee': f'{jour}T10:00', 'passagers': 1, 'bagages': 1})
    assert 'non desservi' in inconnu['erreur'] and 'Lomé (LFW)' in inconnu['erreur']


# --- Boucle de conversation ------------------------------------------------------------------

def test_conversation_avec_outil_puis_reponse(concierge, make_user, make_hebergement):
    h = make_hebergement(name='Appart Bè', city='Lomé', price_per_night=30000)
    faux = FauxClaude(
        Reponse([Bloc(type='text', text='Je regarde les logements à Lomé.'),
                 Bloc(type='tool_use', id='toolu_1', name='rechercher_logements',
                      input={'ville': 'Lomé', 'arrivee': None, 'depart': None, 'voyageurs': 2,
                             'budget_max_nuit': None, 'type': None})], 'tool_use'),
        Reponse([Bloc(type='text', text="L'**Appart Bè** est idéal pour vous deux.")], 'end_turn'),
    )
    client = _client(make_user())
    cid = client.post(CONVERSATIONS).data['id']
    with mock.patch.object(services, '_client', return_value=faux):
        evts = _evenements(client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': 'Un appart à Lomé pour 2'}, format='json'))

    types = [e for e, _ in evts]
    assert types[0] == 'texte' and 'outil' in types and 'cartes' in types and types[-1] == 'fin'
    assert next(d for e, d in evts if e == 'cartes')['cartes'][0]['id'] == str(h.id)

    # Requête : modèle, effort, repli par défaut, outils (dont la recherche web), système mis en cache
    req = faux.requetes[0]
    assert (req['model'], req['output_config'], req['fallbacks']) == ('claude-sonnet-5-5', {'effort': 'medium'}, 'default')
    assert req['betas'] == ['server-side-fallback-2026-07-01']
    assert {t['name'] for t in req['tools']} == {'rechercher_logements', 'devis_transfert', 'proposer_voyage_de_groupe', 'web_search'}
    assert req['system'][0]['cache_control'] == {'type': 'ephemeral'}
    # Second appel : l'historique rejoué contient le tour de l'assistant puis le résultat de l'outil
    hist = faux.requetes[1]['messages']
    assert [m['role'] for m in hist] == ['user', 'assistant', 'user']
    assert hist[1]['content'][1]['id'] == 'toolu_1' and hist[2]['content'][0]['tool_use_id'] == 'toolu_1'

    affichage = client.get(f'{CONVERSATIONS}{cid}/').data
    assert affichage['titre'] == 'Un appart à Lomé pour 2'
    roles = [(m['role'], bool(m['cartes'])) for m in affichage['messages']]
    assert roles == [('user', False), ('assistant', False), ('assistant', True)]


def test_refus_ecarte_la_reponse(concierge, make_user):
    faux = FauxClaude(Reponse([Bloc(type='text', text='partiel')], 'refusal'))
    client = _client(make_user())
    cid = client.post(CONVERSATIONS).data['id']
    with mock.patch.object(services, '_client', return_value=faux):
        evts = _evenements(client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': 'Question hors sujet'}, format='json'))
    assert evts[-1][0] == 'refus'
    assert not MessageModel.objects.filter(conversation_id=cid, role='assistant').exists()


def test_quota_inactif_et_confidentialite(concierge, make_user, settings):
    user = make_user()
    client = _client(user)
    cid = client.post(CONVERSATIONS).data['id']
    assert _client(make_user()).get(f'{CONVERSATIONS}{cid}/').status_code == 404
    assert client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': ''}, format='json').status_code == 400

    settings.CONCIERGE = {**settings.CONCIERGE, 'MAX_PAR_HEURE': 1}
    faux = FauxClaude(Reponse([Bloc(type='text', text='Bonjour !')], 'end_turn'))
    with mock.patch.object(services, '_client', return_value=faux):
        assert client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': 'Salut'}, format='json').status_code == 200
        trop = client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': 'Encore'}, format='json')
    assert trop.status_code == 429 and 'limite' in trop.data['detail']

    settings.CONCIERGE = {**settings.CONCIERGE, 'API_KEY': ''}
    assert client.get('/api/v1/concierge/statut/').data == {'actif': False}
    assert client.post(f'{CONVERSATIONS}{cid}/messages/', {'texte': 'x'}, format='json').status_code == 503
