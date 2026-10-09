"""AfriStay AI Concierge : conversation avec Claude (outils AfriStay + recherche web), en streaming.

L'historique est rejoué tel quel à chaque requête (thinking blocks compris) et n'est jamais
modifié après coup : on ne fait qu'ajouter des tours, comme l'exige le modèle.
"""
import json
import logging

import anthropic
from django.conf import settings
from django.core.cache import cache
from django.utils import formats, timezone

from . import outils
from .models import ConversationModel, MessageModel

logger = logging.getLogger('apps.concierge')

BETA_REPLI = 'server-side-fallback-2026-07-01'
MAX_TOURS_OUTILS = 6
MAX_REPRISES_JSON = 2
MAX_MESSAGES_PAR_CONVERSATION = 60

SYSTEME = """Tu es le Concierge AfriStay, l'assistant de voyage de la plateforme AfriStay (réservation de logements en Afrique de l'Ouest, transferts aéroport avec chauffeur, voyages de groupe « AfriStay Together »).

Ton rôle : aider le voyageur à organiser tout son séjour, de la recherche du logement aux activités sur place, puis lui présenter les offres disponibles sur AfriStay.

Ce que tu sais faire :
- Recommander des logements selon le budget et les préférences, avec l'outil rechercher_logements.
- Construire un itinéraire jour par jour.
- Estimer le budget total du séjour.
- Suggérer restaurants, visites et activités (avec la recherche web quand elle est disponible).
- Proposer un transfert aéroport adapté à l'heure d'arrivée, avec l'outil devis_transfert.
- Préparer un voyage de groupe avec l'outil proposer_voyage_de_groupe quand le voyageur part à plusieurs et veut décider avec les autres.
- Répondre aux questions pratiques sur la destination (quartiers, climat, monnaie, transports, visas, sécurité, coutumes).

Règles sur les offres :
- Ne cite que des logements renvoyés par rechercher_logements, avec leur prix exact. N'invente jamais de logement, de prix, de disponibilité ni d'avis. Si aucun ne correspond, dis-le et propose d'ajuster les critères.
- Les prix de transfert viennent uniquement de devis_transfert. Si l'aéroport n'est pas desservi, dis-le simplement.
- Les offres trouvées s'affichent automatiquement sous ta réponse, avec des boutons pour réserver : ne recopie pas toutes leurs caractéristiques, explique plutôt pourquoi tu les recommandes.
- Tu ne réserves et ne payes rien toi-même : le voyageur réserve avec les boutons affichés. Ne demande jamais de coordonnées bancaires, de code Mobile Money ni de pièce d'identité.

Budget :
- Montants en francs CFA (FCFA). Si le voyageur parle en euros, convertis à la parité fixe 1 € = 655,957 FCFA et donne les deux.
- Pour un budget total, sépare ce qui est exact (logement et transfert AfriStay, frais compris) de ce qui est estimé (repas, activités, déplacements sur place), et présente les estimations comme des fourchettes.

Restaurants, visites et activités :
- Utilise la recherche web pour des adresses précises et à jour quand elle est disponible, et invite à vérifier horaires et prix sur place. Sans source, propose des types d'expériences et de quartiers plutôt que des adresses inventées.

Manière de répondre :
- Réponds en français (ou dans la langue du voyageur s'il en change), de façon chaleureuse et concise : le voyageur lit souvent sur téléphone.
- Mise en forme légère : paragraphes courts, listes à puces, **gras** pour l'essentiel ; pas de tableaux.
- S'il manque une information indispensable (ville, dates, nombre de voyageurs), pose une question courte, mais propose déjà une première piste quand c'est possible.
- Avant d'appeler un outil, tu peux annoncer en une phrase ce que tu fais. Si aucun outil ne permet de répondre, dis-le au lieu de deviner.
- N'inclus pas de balises XML internes ou système dans ta réponse."""


class ConciergeErreur(Exception):
    """Message affichable au voyageur."""


def actif() -> bool:
    return bool(settings.CONCIERGE['API_KEY'])


def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.CONCIERGE['API_KEY'], timeout=120.0)


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


def _outils() -> list:
    liste = list(outils.DEFINITIONS)
    if settings.CONCIERGE['RECHERCHE_WEB']:
        liste.append({'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': 3})
    return liste


def _systeme() -> list:
    # Bloc stable mis en cache ; la date du jour vient après le point de cache
    aujourd_hui = formats.date_format(timezone.localdate(), 'l j F Y')
    return [
        {'type': 'text', 'text': SYSTEME, 'cache_control': {'type': 'ephemeral'}},
        {'type': 'text', 'text': f"Date du jour : {aujourd_hui}."},
    ]


def _historique(conversation) -> list:
    return [{'role': m.role, 'content': m.contenu} for m in conversation.messages.all()]


def _sse(evenement: str, donnees: dict) -> str:
    return f"event: {evenement}\ndata: {json.dumps(donnees, ensure_ascii=False)}\n\n"


def _texte(blocs: list) -> str:
    return '\n\n'.join(b['text'] for b in blocs if b.get('type') == 'text' and b.get('text')).strip()


def repondre(conversation: ConversationModel, texte_voyageur: str):
    """Générateur d'événements SSE : texte (deltas), outil (progression), cartes, fin, erreur."""
    if conversation.messages.count() >= MAX_MESSAGES_PAR_CONVERSATION:
        yield _sse('erreur', {'message': "Cette conversation est longue : ouvrez-en une nouvelle pour continuer."})
        return

    MessageModel.objects.create(conversation=conversation, role='user',
                                contenu=[{'type': 'text', 'text': texte_voyageur}], texte=texte_voyageur)
    if not conversation.titre:
        conversation.titre = texte_voyageur[:117] + ('…' if len(texte_voyageur) > 117 else '')
        conversation.save(update_fields=['titre', 'mis_a_jour_le'])

    client = _client()
    messages = _historique(conversation)
    cartes_du_tour = []
    reprises_json = 0
    tours = 0

    while True:
        tours += 1
        if tours > MAX_TOURS_OUTILS + 3:
            yield _sse('erreur', {'message': "Je n'ai pas pu terminer cette recherche. Reformulez votre demande."})
            return
        try:
            with client.beta.messages.stream(
                model=settings.CONCIERGE['MODELE'],
                max_tokens=16000,
                system=_systeme(),
                tools=_outils(),
                messages=messages,
                output_config={'effort': settings.CONCIERGE['EFFORT']},
                betas=[BETA_REPLI],
                fallbacks='default',
            ) as stream:
                for evenement in stream:
                    if evenement.type == 'text':
                        yield _sse('texte', {'delta': evenement.text})
                    elif evenement.type == 'content_block_start':
                        bloc = evenement.content_block
                        if bloc.type == 'tool_use':
                            yield _sse('outil', {'nom': bloc.name, 'libelle': outils.LIBELLES.get(bloc.name, 'Je cherche')})
                        elif bloc.type == 'server_tool_use':
                            yield _sse('outil', {'nom': 'web_search', 'libelle': 'Je cherche sur le web'})
                reponse = stream.get_final_message()
            reprises_json = 0
        except ValueError:
            # Entrée d'outil JSON illisible : on relance le tour (borné)
            reprises_json += 1
            if reprises_json > MAX_REPRISES_JSON:
                yield _sse('erreur', {'message': 'Une erreur est survenue. Réessayez.'})
                return
            yield _sse('reprise', {})
            continue
        except anthropic.RateLimitError:
            yield _sse('erreur', {'message': 'Le Concierge est très sollicité. Réessayez dans une minute.'})
            return
        except anthropic.APIConnectionError:
            yield _sse('erreur', {'message': 'Le Concierge est momentanément injoignable. Réessayez.'})
            return
        except anthropic.APIStatusError as exc:
            logger.error("Erreur API Claude %s (requête %s)", exc.status_code, getattr(exc, 'request_id', ''))
            yield _sse('erreur', {'message': 'Le Concierge a rencontré une erreur. Réessayez.'})
            return

        # Refus de sécurité (après repli éventuel) : la réponse partielle est écartée
        if reponse.stop_reason == 'refusal':
            yield _sse('refus', {'message': "Je ne peux pas répondre à cette demande. Posez-moi une question sur votre voyage."})
            return

        blocs = reponse.to_dict()['content']
        usage = reponse.usage
        outils_demandes = [b for b in reponse.content if b.type == 'tool_use']

        if reponse.stop_reason == 'max_tokens' and outils_demandes:
            yield _sse('erreur', {'message': 'Réponse interrompue. Reformulez votre demande plus simplement.'})
            return

        MessageModel.objects.create(
            conversation=conversation, role='assistant', contenu=blocs, texte=_texte(blocs),
            cartes=cartes_du_tour if not outils_demandes else [], visible=bool(_texte(blocs)) or not outils_demandes,
            tokens_entree=usage.input_tokens or 0, tokens_sortie=usage.output_tokens or 0,
        )
        messages.append({'role': 'assistant', 'content': blocs})

        if reponse.stop_reason == 'pause_turn':
            continue  # recherche web longue : on relance pour que le modèle termine son tour
        if not outils_demandes:
            break

        resultats = []
        for bloc in outils_demandes:
            contenu, cartes, erreur = outils.executer(bloc.name, bloc.input)
            cartes_du_tour.extend(cartes)
            resultats.append({'type': 'tool_result', 'tool_use_id': bloc.id, 'content': contenu,
                              **({'is_error': True} if erreur else {})})
        if cartes_du_tour:
            yield _sse('cartes', {'cartes': cartes_du_tour})
        MessageModel.objects.create(conversation=conversation, role='user', contenu=resultats, visible=False)
        messages.append({'role': 'user', 'content': resultats})

    # Les offres trouvées pendant le tour s'affichent sous la réponse finale
    dernier = conversation.messages.filter(role='assistant').last()
    if dernier and cartes_du_tour and not dernier.cartes:
        dernier.cartes = cartes_du_tour
        dernier.visible = True
        dernier.save(update_fields=['cartes', 'visible'])
    conversation.save(update_fields=['mis_a_jour_le'])
    yield _sse('fin', {'message_id': dernier.pk if dernier else None})
