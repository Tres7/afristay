# Titre:
Réception des messages de la messagerie par polling REST

# Status:
Accepté

# Contexte :
La messagerie entre voyageurs et hôtes doit afficher les nouveaux messages sans recharger la page.
La stack actuelle est servie en WSGI (`runserver`, puis gunicorn), sans Redis ni Django Channels : elle ne sait pas maintenir de connexions WebSocket.
Une latence de quelques secondes est acceptable pour une messagerie de réservation (questions avant séjour, informations pratiques), qui n'est pas un chat en temps réel.

# Options
Option 1 : Polling REST : le front interroge l'API à intervalle régulier.
Option 2 : WebSocket avec Django Channels : serveur ASGI (daphne ou uvicorn), Redis comme channel layer, authentification JWT sur la socket.
Option 3 : Server-Sent Events : sur un serveur WSGI, chaque connexion ouverte immobilise un worker.

# Décision
Nous retenons le polling REST (option 1).
- Conversation ouverte : toutes les 4 s, `GET /messaging/conversations/<id>/messages/?after=<dernier id reçu>` ne renvoie que les nouveaux messages.
- Liste des conversations et badge des non-lus de la navbar : toutes les 10 s.
- Le polling est suspendu quand l'onglet est masqué. Il est relancé immédiatement au retour sur l'onglet ou quand la fenêtre reprend le focus.
- Les requêtes GET ne sont pas soumises aux throttles (voir ADR-018).

Le curseur `?after=` est fiable parce que les messages ont des ids séquentiels et que les envois d'un même fil sont sérialisés par un verrou sur la conversation (voir ADR-017).

# Conséquences :
positives (bénéfices)
- Aucune nouvelle infrastructure : fonctionne avec la stack actuelle.
- Implémentation simple côté front et côté back.
- Le mécanisme de livraison est un détail d'infrastructure : le domaine et le service applicatif n'en dépendent pas.

négatifs (inconvénients)
- Latence de quelques secondes pour voir un nouveau message : jusqu'à 4 s dans une conversation ouverte, jusqu'à 10 s pour le badge et la liste.
- Requêtes répétées même sans nouveau message (atténué par la pause quand l'onglet est masqué).
- Pas d'indicateur de présence (« en ligne ») ni de « en train d'écrire ».

Impacts futurs
- Un adapter WebSocket pourra être ajouté sans toucher au domaine ni à `MessagingService` : il suffira de diffuser les messages après commit. Le curseur par id reste valable pour rattraper les messages manqués à la reconnexion.
- Si le volume de polling devient un problème, augmenter l'intervalle ou passer à l'option 2.
