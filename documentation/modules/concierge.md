# AfriStay AI Concierge

Assistant de voyage conversationnel : logement selon le budget, itinéraire, budget total, restaurants et activités, transfert aéroport, questions pratiques — et présentation des offres AfriStay avec boutons de réservation.
Code : `server/apps/concierge/` (backend), `client/src/app/(main)/concierge/` et `client/src/components/concierge/` (frontend).

## Modèle et réglages

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Modèle | `claude-sonnet-5-5` (API Anthropic, SDK Python `anthropic` 1.x) | Choix de l'équipe : bon rapport qualité / coût, appels d'outils |
| Réflexion | adaptative (par défaut, paramètre `thinking` omis) | Le modèle décide quand réfléchir |
| Effort | `medium` (`CONCIERGE_EFFORT`) | Recommandé pour une conversation avec appels d'outils ; `low` pour réduire le coût |
| Repli en cas de refus | `fallbacks: "default"` (bêta `server-side-fallback-2026-07-01`) | Une demande refusée par les filtres de sécurité est relancée côté serveur quand c'est possible |
| Cache | bloc système stable avec `cache_control` ; date du jour dans un bloc séparé après | Réduit le coût des tours suivants |
| `max_tokens` | 16 000 | Réponse et réflexion |

## Outils (`outils.py`)

Le modèle n'invente ni logement ni prix : il appelle des outils qui interrogent la base AfriStay.

| Outil | Rôle | Carte affichée |
|---|---|---|
| `rechercher_logements` | Logements publiés d'une ville (budget/nuit, voyageurs, type) ; avec des dates : disponibilité réelle et coût total frais compris | Logement : Voir / Réserver (dates préremplies) |
| `devis_transfert` | Prix exacts par véhicule pour un aéroport desservi, heure du billet, majoration de nuit | Transfert : lien vers le formulaire prérempli |
| `proposer_voyage_de_groupe` | Prépare un voyage Together sans rien créer | Bouton « Créer ce voyage et inviter mes proches » (crée le voyage et les propositions au clic) |
| `web_search` (outil serveur Anthropic, 3 recherches max par tour) | Restaurants, visites, informations à jour | — |

Les entrées d'outils arrivent en streaming (`eager_input_streaming`) et sont validées dans `outils.py` avant toute requête ; une entrée invalide est renvoyée au modèle comme erreur d'outil.

## Boucle de conversation (`services.repondre`)

1. Le message du voyageur est enregistré, puis tout l'historique est envoyé (rejoué à l'identique, blocs de réflexion compris : **l'historique n'est jamais modifié, seulement complété**).
2. La réponse est diffusée au navigateur en SSE : `texte` (morceaux de texte), `outil` (« Je cherche des logements… »), `cartes`, puis `fin` ; ou `refus` / `erreur`.
3. Si le modèle appelle des outils, ils sont exécutés et leurs résultats renvoyés (au plus 6 tours) ; `pause_turn` (recherche web longue) relance le tour.
4. `stop_reason == "refusal"` : la réponse partielle est écartée et un message neutre s'affiche.

Chaque tour est stocké dans `MessageModel.contenu` tel qu'échangé avec l'API ; `texte` et `cartes` servent à l'affichage, les résultats d'outils restent invisibles.

## Limites et coût

- Connexion obligatoire ; `CONCIERGE_MAX_PAR_HEURE` (20) et `CONCIERGE_MAX_PAR_JOUR` (60) messages par utilisateur ; 2 000 caractères par message ; 60 tours par conversation.
- Les tokens consommés sont enregistrés par message (admin Django → Conversations avec le Concierge).
- Ordre de grandeur : une conversation de quelques échanges avec recherche coûte quelques centimes d'euro (Sonnet 5.5 : 2 $ / 10 $ par million de tokens en entrée / sortie, plus la recherche web). À mesurer sur l'usage réel avant d'ouvrir largement.

## Configuration (`server/.env`)

```
ANTHROPIC_API_KEY=sk-ant-...      # console.anthropic.com → API Keys ; vide = Concierge désactivé
CONCIERGE_MODELE=claude-sonnet-5-5
CONCIERGE_EFFORT=medium
CONCIERGE_RECHERCHE_WEB=True
CONCIERGE_MAX_PAR_HEURE=20
CONCIERGE_MAX_PAR_JOUR=60
```

## Production

La réponse est un flux long (jusqu'à une minute) : en production, servir l'API avec des workers adaptés (gunicorn `--worker-class gthread` avec plusieurs threads, ou ASGI) et désactiver la mise en tampon du proxy (l'en-tête `X-Accel-Buffering: no` est déjà envoyé pour nginx).

## Confidentialité

Les messages sont transmis à Anthropic (sous-traitant, États-Unis) ; c'est indiqué sous la zone de saisie, dans la politique de confidentialité et dans les CGU (information sur l'usage d'une IA). Le voyageur peut supprimer ses conversations.

## Tests

`server/tests/integration/concierge/` : outils sur la vraie base (prix, disponibilité, frais, aéroports), validation des entrées, boucle complète avec un faux client Claude (événements SSE, paramètres de la requête, historique rejoué), refus, quotas, confidentialité.
