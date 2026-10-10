"""Kwa-Ba AI Concierge : conversation avec Gemini (API Interactions), outils Kwa-Ba et recherche Google.

Les tours successifs s'enchaînent avec `previous_interaction_id` : Google conserve l'historique de
l'interaction (et les signatures de réflexion du modèle), notre base garde ce qui s'affiche.
"""
import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.utils import formats, timezone
from google import genai
from google.genai import types
# Erreurs de l'API Interactions : non réexportées publiquement par le SDK (version épinglée dans requirements.txt)
from google.genai._gaos.lib import compat_errors as erreurs_gemini

from . import outils
from .models import ConversationModel, MessageModel

logger = logging.getLogger('apps.concierge')

MAX_TOURS_OUTILS = 6
MAX_MESSAGES_PAR_CONVERSATION = 60
# Si l'interaction précédente a expiré chez Google, on repart avec un résumé de ces derniers échanges
MESSAGES_RESUME = 10

SYSTEME = """Tu es le Concierge Kwa-Ba, l'assistant de voyage de la plateforme Kwa-Ba (réservation de logements en Afrique de l'Ouest, transferts aéroport avec chauffeur, voyages de groupe « Kwa-Ba Together »).

Ton rôle : aider le voyageur à organiser tout son séjour, de la recherche du logement aux activités sur place, puis lui présenter les offres disponibles sur Kwa-Ba.

Ce que tu sais faire :
- Recommander des logements selon le budget et les préférences, avec la fonction rechercher_logements.
- Construire un itinéraire jour par jour.
- Estimer le budget total du séjour.
- Suggérer restaurants, visites et activités (avec la recherche Google quand elle est disponible).
- Proposer un transfert aéroport adapté à l'heure d'arrivée, avec la fonction devis_transfert.
- Préparer un voyage de groupe avec la fonction proposer_voyage_de_groupe quand le voyageur part à plusieurs et veut décider avec les autres.
- Répondre aux questions pratiques sur la destination (quartiers, climat, monnaie, transports, visas, sécurité, coutumes).

Règles sur les offres :
- Ne cite que des logements renvoyés par rechercher_logements, avec leur prix exact. N'invente jamais de logement, de prix, de disponibilité ni d'avis. Si aucun ne correspond, dis-le et propose d'ajuster les critères.
- Les prix de transfert viennent uniquement de devis_transfert. Si l'aéroport n'est pas desservi, dis-le simplement.
- Les transferts Kwa-Ba vont de l'aéroport au logement uniquement : il n'y a pas encore de trajet retour vers l'aéroport. Pour le retour, suggère un taxi sans donner de prix Kwa-Ba.
- Les offres trouvées s'affichent automatiquement sous ta réponse, avec des boutons pour réserver : ne recopie pas toutes leurs caractéristiques, explique plutôt pourquoi tu les recommandes.
- Tu ne réserves et ne payes rien toi-même : le voyageur réserve avec les boutons affichés. Ne demande jamais de coordonnées bancaires, de code Mobile Money ni de pièce d'identité.

Budget :
- Montants en francs CFA (FCFA). Si le voyageur parle en euros, convertis à la parité fixe 1 € = 655,957 FCFA et donne les deux.
- Pour un budget total, sépare ce qui est exact (logement et transfert Kwa-Ba, frais compris) de ce qui est estimé (repas, activités, déplacements sur place), et présente les estimations comme des fourchettes.
- Sans dates, le coût d'un logement est une estimation : prix par nuit × nombre de nuits, plus 8 % de frais de service. Dès que les dates sont connues, relance rechercher_logements avec ces dates pour obtenir le coût exact et la disponibilité.
- Sans heure d'arrivée, n'invente pas de prix de transfert : demande l'heure d'atterrissage, puis utilise devis_transfert.

Restaurants, visites et activités :
- Utilise la recherche Google pour des adresses précises et à jour quand elle est disponible, et invite à vérifier horaires et prix sur place. Sans source, propose des types d'expériences et de quartiers plutôt que des adresses inventées.

Manière de répondre :
- Réponds en français (ou dans la langue du voyageur s'il en change), de façon chaleureuse et concise : le voyageur lit souvent sur téléphone.
- Mise en forme légère : paragraphes courts, listes à puces, **gras** pour l'essentiel ; pas de tableaux.
- S'il manque une information indispensable (ville, dates, nombre de voyageurs), pose une question courte, mais propose déjà une première piste quand c'est possible.
- Si aucune fonction ne permet de répondre, dis-le au lieu de deviner."""


class ConciergeErreur(Exception):
    """Message affichable au voyageur."""


def actif() -> bool:
    return bool(settings.CONCIERGE['API_KEY'])


def _client() -> genai.Client:
    # Nouvel essai sur les erreurs serveur seulement : un quota dépassé (429) doit échouer tout de suite,
    # sinon le SDK réessaie pendant plus d'une minute et le voyageur attend devant un écran figé
    return genai.Client(
        api_key=settings.CONCIERGE['API_KEY'],
        http_options=types.HttpOptions(retry_options=types.HttpRetryOptions(attempts=2, http_status_codes=[500, 502, 503, 504])),
    )


def verifier_quota(utilisateur):
    """Limite le nombre de messages par utilisateur (coût de l'API)."""
    for periode, secondes, maximum in (('heure', 3600, settings.CONCIERGE['MAX_PAR_HEURE']),
                                       ('jour', 86400, settings.CONCIERGE['MAX_PAR_JOUR'])):
        cle = f"concierge:{utilisateur.pk}:{periode}"
        cache.add(cle, 0, secondes)
        if cache.incr(cle) > maximum:
            raise ConciergeErreur(
                f"Vous avez atteint la limite de {maximum} messages par {periode}. Réessayez un peu plus tard."
            )


CLE_RECHERCHE_INDISPONIBLE = 'concierge:recherche_web_indisponible'


def _recherche_web() -> bool:
    return settings.CONCIERGE['RECHERCHE_WEB'] and not cache.get(CLE_RECHERCHE_INDISPONIBLE)


def _outils(recherche_web: bool) -> list:
    liste = list(outils.DEFINITIONS)
    if recherche_web:
        liste.append({'type': 'google_search'})
    return liste


def _systeme() -> str:
    return f"{SYSTEME}\n\nDate du jour : {formats.date_format(timezone.localdate(), 'l j F Y')}."


def _sse(evenement: str, donnees: dict) -> str:
    return f"event: {evenement}\ndata: {json.dumps(donnees, ensure_ascii=False)}\n\n"


def _resume(conversation) -> str:
    """Derniers échanges visibles, pour reprendre une conversation dont l'interaction a expiré."""
    lignes = [f"{'Voyageur' if m.role == 'user' else 'Concierge'} : {m.texte}"
              for m in conversation.messages.filter(visible=True).exclude(texte='').order_by('-cree_le')[:MESSAGES_RESUME]]
    return '\n'.join(reversed(lignes))


class _Tour:
    """Ce qu'un tour du modèle a produit, reconstitué à partir du flux."""

    def __init__(self):
        self.interaction_id = ''
        self.statut = ''
        self.texte = ''
        self.appels = []          # [{'id', 'name', 'arguments'}]
        self.erreur = None
        self.tokens_entree = self.tokens_sortie = 0


def _lire_flux(flux, tour: _Tour):
    """Parcourt les événements SSE de Gemini ; produit nos propres événements pour le navigateur."""
    appels_partiels = {}  # index de l'étape → appel en cours (arguments reçus par morceaux)
    for ev in flux:
        t = getattr(ev, 'event_type', '')
        if t in ('interaction.created', 'interaction.completed'):
            tour.interaction_id = ev.interaction.id or tour.interaction_id
            if t == 'interaction.completed':
                tour.statut = ev.interaction.status
                usage = ev.interaction.usage
                if usage:
                    tour.tokens_entree = usage.total_input_tokens or 0
                    tour.tokens_sortie = (usage.total_output_tokens or 0) + (usage.total_thought_tokens or 0)
                appels = [s for s in (ev.interaction.steps or []) if getattr(s, 'type', '') == 'function_call']
                if appels:
                    tour.appels = [{'id': s.id, 'name': s.name, 'arguments': s.arguments} for s in appels]
        elif t == 'interaction.status_update':
            tour.statut = ev.status
        elif t == 'step.start':
            etape = ev.step
            if etape.type == 'function_call':
                appels_partiels[ev.index] = {'id': etape.id, 'name': etape.name, 'arguments': '',
                                             'initiaux': getattr(etape, 'arguments', None)}
                yield _sse('outil', {'nom': etape.name, 'libelle': outils.LIBELLES.get(etape.name, 'Je cherche')})
            elif etape.type == 'google_search_call':
                yield _sse('outil', {'nom': 'google_search', 'libelle': 'Je cherche sur le web'})
        elif t == 'step.delta':
            delta = ev.delta
            if delta.type == 'text':
                tour.texte += delta.text
                yield _sse('texte', {'delta': delta.text})
            elif delta.type == 'arguments_delta' and ev.index in appels_partiels:
                appels_partiels[ev.index]['arguments'] += delta.arguments or ''
        elif t == 'error':
            tour.erreur = getattr(ev.error, 'message', None) or 'erreur'

    # Appels reconstitués depuis le flux si l'événement final ne les détaillait pas
    if not tour.appels and appels_partiels:
        for a in appels_partiels.values():
            try:
                arguments = json.loads(a['arguments']) if a['arguments'] else (a['initiaux'] or {})
            except ValueError:
                arguments = None  # JSON illisible : renvoyé au modèle comme erreur
            tour.appels.append({'id': a['id'], 'name': a['name'], 'arguments': arguments})


def repondre(conversation: ConversationModel, texte_voyageur: str):
    """Générateur d'événements SSE : texte (deltas), outil (progression), cartes, fin, erreur."""
    if conversation.messages.count() >= MAX_MESSAGES_PAR_CONVERSATION:
        yield _sse('erreur', {'message': "Cette conversation est longue : ouvrez-en une nouvelle pour continuer."})
        return

    resume = _resume(conversation) if conversation.interaction_id else ''
    MessageModel.objects.create(conversation=conversation, role='user', contenu={}, texte=texte_voyageur)
    if not conversation.titre:
        conversation.titre = texte_voyageur[:117] + ('…' if len(texte_voyageur) > 117 else '')
        conversation.save(update_fields=['titre', 'mis_a_jour_le'])

    client = _client()
    precedent = conversation.interaction_id or None
    entree = texte_voyageur
    cartes_du_tour = []
    dernier = None
    recherche_web = _recherche_web()

    for _ in range(MAX_TOURS_OUTILS + 2):
        parametres = {
            'model': settings.CONCIERGE['MODELE'],
            'system_instruction': _systeme(),
            'tools': _outils(recherche_web),
            'input': entree,
            'generation_config': {'thinking_level': settings.CONCIERGE['REFLEXION']},
            'stream': True,
        }
        if precedent:
            parametres['previous_interaction_id'] = precedent
        tour = _Tour()
        try:
            yield from _lire_flux(client.interactions.create(**parametres), tour)
        except (erreurs_gemini.NotFoundError, erreurs_gemini.BadRequestError) as exc:
            if precedent and isinstance(entree, str):
                # Interaction précédente expirée chez Google : on repart avec un résumé de la conversation
                logger.info("Interaction %s refusée (%s), reprise avec un résumé", precedent, exc.status_code)
                precedent = None
                entree = f"Résumé de notre conversation précédente :\n{resume}\n\nNouveau message : {texte_voyageur}"
                continue
            logger.warning("Gemini a refusé la requête (%s) : %s", exc.status_code, exc.message)
            yield _sse('erreur', {'message': 'Le Concierge a rencontré une erreur. Réessayez.'})
            return
        except erreurs_gemini.RateLimitError:
            if recherche_web and not tour.texte:
                # Quota de la recherche Google dépassé : on continue sans elle (10 min) plutôt que d'échouer
                logger.warning("Recherche Google refusée (quota) : Concierge sans recherche web pendant 10 min")
                cache.set(CLE_RECHERCHE_INDISPONIBLE, True, 600)
                recherche_web = False
                continue
            yield _sse('erreur', {'message': 'Le Concierge est très sollicité. Réessayez dans une minute.'})
            return
        except (erreurs_gemini.APIConnectionError, erreurs_gemini.APITimeoutError):
            yield _sse('erreur', {'message': 'Le Concierge est momentanément injoignable. Réessayez.'})
            return
        except erreurs_gemini.APIError as exc:
            logger.error("Erreur Gemini %s : %s", getattr(exc, 'status_code', ''), getattr(exc, 'message', exc))
            yield _sse('erreur', {'message': 'Le Concierge a rencontré une erreur. Réessayez.'})
            return

        if tour.erreur or tour.statut == 'failed':
            # Réponse bloquée (filtres de sécurité) ou échec : la réponse partielle est écartée
            logger.info("Tour Gemini en échec (%s) : %s", tour.statut, tour.erreur)
            yield _sse('refus', {'message': "Je ne peux pas répondre à cette demande. Posez-moi une question sur votre voyage."})
            return

        precedent = tour.interaction_id or precedent
        dernier = MessageModel.objects.create(
            conversation=conversation, role='assistant', texte=tour.texte.strip(),
            contenu={'interaction': tour.interaction_id, 'appels': tour.appels},
            visible=bool(tour.texte.strip()), tokens_entree=tour.tokens_entree, tokens_sortie=tour.tokens_sortie,
        )
        conversation.interaction_id = precedent or ''
        conversation.save(update_fields=['interaction_id', 'mis_a_jour_le'])

        if not tour.appels:
            break

        resultats = []
        for appel in tour.appels:
            contenu, cartes, erreur = outils.executer(appel['name'], appel['arguments'])
            cartes_du_tour.extend(cartes)
            resultats.append({
                'type': 'function_result', 'name': appel['name'], 'call_id': appel['id'],
                'result': [{'type': 'text', 'text': contenu}], **({'is_error': True} if erreur else {}),
            })
        if cartes_du_tour:
            yield _sse('cartes', {'cartes': cartes_du_tour})
        entree = resultats
    else:
        yield _sse('erreur', {'message': "Je n'ai pas pu terminer cette recherche. Reformulez votre demande."})
        return

    # Les offres trouvées pendant le tour s'affichent sous la réponse finale
    if dernier and cartes_du_tour:
        dernier.cartes = cartes_du_tour
        dernier.visible = True
        dernier.save(update_fields=['cartes', 'visible'])
    yield _sse('fin', {'message_id': dernier.pk if dernier else None})
