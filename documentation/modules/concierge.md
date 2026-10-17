# Kwa-Ba AI Concierge

Assistant de voyage conversationnel : logement selon le budget, itinéraire, budget total, restaurants et activités, transfert aéroport, questions pratiques — et présentation des offres Kwa-Ba avec boutons de réservation.
Code : `server/apps/concierge/` (backend), `client/src/app/(main)/concierge/` et `client/src/components/concierge/` (frontend).

## Modèle et réglages

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Fournisseur | Google Gemini, **API Interactions** (SDK Python `google-genai` 2.x) | API recommandée par Google pour les nouveaux projets depuis juin 2026 |
| Modèle | `gemini-3.8-flash` (`CONCIERGE_MODELE`) | Modèle Flash conseillé par Google ; `gemini-3.5-flash-lite` pour réduire le coût |
| Réflexion | `thinking_level: low` (`CONCIERGE_REFLEXION` : minimal, low, medium, high) | Réponses rapides ; `medium` si les itinéraires manquent de profondeur |
| Recherche web | outil intégré `google_search`, combiné aux fonctions Kwa-Ba (`CONCIERGE_RECHERCHE_WEB`) | Restaurants, visites, informations à jour (combinaison réservée aux modèles Gemini 3) |
| Historique | `previous_interaction_id` : Google conserve la conversation (55 jours en offre payante) | Les signatures de réflexion du modèle sont gérées par l'API ; notre base garde ce qui s'affiche |
| Nouveaux essais du SDK | erreurs serveur (500-504) seulement | Sans ce réglage, un quota dépassé (429) bloquait le voyageur plus d'une minute |

## Fonctions (`outils.py`)

Le modèle n'invente ni logement ni prix : il appelle des fonctions qui interrogent la base Kwa-Ba.

| Fonction | Rôle | Carte affichée |
|---|---|---|
| `rechercher_logements` | Logements publiés d'une ville (budget/nuit, voyageurs, type) ; avec des dates : disponibilité réelle et coût total frais compris | Logement : Voir / Réserver (dates préremplies) |
| `devis_transfert` | Prix exacts par véhicule pour un aéroport desservi (aller aéroport → logement), heure du billet, majoration de nuit | Transfert : lien vers le formulaire prérempli |
| `proposer_voyage_de_groupe` | Prépare un voyage Together sans rien créer | Bouton « Créer ce voyage et inviter mes proches » (crée le voyage et les propositions au clic) |
| `google_search` (outil intégré de Gemini) | Restaurants, visites, informations à jour | — |

Les champs facultatifs ne sont pas listés dans `required` (le schéma de Gemini gère mal les types « chaîne ou null »). Les arguments sont validés dans `outils.py` avant toute requête ; un argument invalide est renvoyé au modèle comme erreur de fonction.

## Boucle de conversation (`services.repondre`)

1. Le message du voyageur est enregistré et envoyé avec `previous_interaction_id` (la dernière interaction de la conversation).
2. La réponse est diffusée au navigateur en SSE : `texte` (morceaux de texte), `outil` (« Je cherche des logements… »), `cartes`, puis `fin` ; ou `refus` / `erreur`.
3. Si le modèle appelle des fonctions (statut `requires_action`), elles sont exécutées et leurs résultats renvoyés (`function_result`) dans une nouvelle interaction rattachée à la précédente (au plus 6 tours).
4. Interaction en échec (contenu bloqué par les filtres de Google) : la réponse partielle est écartée et un message neutre s'affiche.
5. Interaction précédente expirée chez Google : la conversation repart avec un résumé des derniers échanges.
6. Quota de la recherche Google dépassé : le tour est relancé sans recherche web, désactivée 10 minutes.

## Limites et coût

- Connexion obligatoire ; `CONCIERGE_MAX_PAR_HEURE` (20) et `CONCIERGE_MAX_PAR_JOUR` (60) messages par utilisateur ; 2 000 caractères par message ; 60 tours par conversation.
- Les tokens consommés (entrée, sortie + réflexion) sont enregistrés par message (admin Django → Conversations avec le Concierge).
- Mesuré en test réel : un premier message avec recherche de logements ≈ 1 400 tokens en entrée et 800 en sortie, 25 à 40 secondes de réponse.

## Configuration (`server/.env`)

```
GEMINI_API_KEY=...                 # aistudio.google.com → Get API key ; vide = Concierge désactivé
CONCIERGE_MODELE=gemini-3.8-flash
CONCIERGE_REFLEXION=low
CONCIERGE_RECHERCHE_WEB=True
CONCIERGE_MAX_PAR_HEURE=20
CONCIERGE_MAX_PAR_JOUR=60
```

**En production, activer la facturation sur le projet Google** :
- en offre gratuite, Google peut utiliser les conversations pour améliorer ses produits (incompatible avec la politique de confidentialité de Kwa-Ba) ;
- les limites par minute de l'offre gratuite sont très basses (refus 429 constatés pendant les tests, notamment sur la recherche Google).

## Production

La réponse est un flux long (jusqu'à une minute) : en production, servir l'API avec des workers adaptés (gunicorn `--worker-class gthread` avec plusieurs threads, ou ASGI) et désactiver la mise en tampon du proxy (l'en-tête `X-Accel-Buffering: no` est déjà envoyé pour nginx).

## Confidentialité

Les messages sont transmis à Google (sous-traitant, États-Unis) ; c'est indiqué sous la zone de saisie, dans la politique de confidentialité et dans les CGU (information sur l'usage d'une IA). Le voyageur peut supprimer ses conversations.

## Tests

`server/tests/integration/concierge/` : fonctions sur la vraie base (prix, disponibilité, frais, aéroports), format des déclarations, validation des arguments, boucle complète avec un faux client Gemini (événements SSE, paramètres de la requête, résultat de fonction rattaché à l'interaction, conversation suivie), interaction expirée, quota de la recherche Google, réponse bloquée, quotas, confidentialité.
