# Titre:
Outbox et relais pour les notifications de la messagerie

# Status:
Accepté

# Contexte :
Un email prévient le destinataire quand une conversation passe de 0 à 1 message non lu pour lui (voir ADR-017). Cet événement est l'unique déclencheur : s'il est perdu, les messages suivants ne déclenchent plus rien tant que le fil reste non lu, et le destinataire n'est jamais prévenu.
Publier sur RabbitMQ dans la requête HTTP pose deux problèmes. Si le broker est indisponible, l'événement est perdu. Et la publication ouvre une connexion à chaque appel : quand le broker ne répond pas, la requête de l'utilisateur reste bloquée plusieurs secondes.

# Options
Option 1 : Publier dans la requête après le commit, en ignorant les erreurs (comme à l'inscription).
Option 2 : Publier après le commit avec un timeout court, et garder une outbox pour rattraper les échecs.
Option 3 : Écrire uniquement dans une outbox, dans la même transaction que le message, et laisser un relais séparé publier.

# Décision
Nous retenons l'option 3 : la requête HTTP n'appelle jamais RabbitMQ.
- L'envoi d'un message écrit, dans la même transaction, une ligne dans `messaging_notification_outbox` avec `available_at = date du message + 60 s`. Le payload complet de l'événement y est figé.
- Le relais (`python manage.py relay_messaging_outbox`, service compose `messaging-relay`) traite les lignes échues toutes les 10 s.
- Une ligne par transaction, réclamée avec `SELECT ... FOR UPDATE SKIP LOCKED` : deux relais ne traitent jamais la même ligne.
- Juste avant de publier, le relais revérifie que le destinataire n'a pas lu le message entre-temps (`last_read_id ≥ message_id`). Si c'est le cas, la ligne passe en `skipped`.
- Plafond de 5 emails par destinataire sur une heure glissante, calculé au moment de publier. Une ligne qui dépasse le plafond est reportée au moment où une place se libère, jamais perdue.
- Publication avec publisher confirms et `mandatory` : la publication n'est réussie que si le broker a accepté le message et l'a routé vers une file. Sinon la ligne reste à publier.
- Sur échec de publication : `attempts + 1`, l'erreur est conservée dans `last_error`, la ligne est reportée avec un délai qui double à chaque essai (10 s, 20 s, 40 s… plafonné à 10 min). Il n'y a pas de statut d'abandon : une panne longue du broker ne doit pas faire perdre de notifications. Un warning est loggé à partir de 5 tentatives.
- Coupe-circuit : au premier échec d'une passe, le relais s'arrête jusqu'à la passe suivante, sans consommer une tentative pour chaque ligne restante.
- Statuts : `pending`, `sent`, `skipped`. Les lignes `sent` et `skipped` de plus de 7 jours sont supprimées une fois par heure.
- Livraison au moins une fois : si le relais s'arrête entre la publication et le marquage, la ligne sera republiée. L'`outbox_id` est transmis dans l'événement et dans la propriété `message_id` de RabbitMQ pour permettre la déduplication côté consommateur.

# Conséquences :
positives (bénéfices)
- Aucune notification perdue, même si RabbitMQ est indisponible : c'est l'outbox qui fait foi.
- La requête d'envoi ne dépend plus du broker (environ 50 ms mesurés pendant une panne de RabbitMQ).
- Le délai avec revérification évite d'envoyer un email à quelqu'un qui lit déjà la conversation.
- Une seule logique de publication à maintenir.

négatifs (inconvénients)
- L'email part environ une minute après le message, parfois plus quand le plafond est atteint.
- Un processus supplémentaire à faire tourner et à surveiller.
- Doublon possible dans de rares cas (arrêt du relais entre publication et marquage). Le consommateur ne déduplique pas encore.
- Avec plusieurs relais en parallèle, le plafond devient approximatif (deux instances peuvent compter 4 envois et publier toutes les deux). Il est exact avec une seule instance, ce que prévoit le service compose.

Impacts futurs
- Ajouter la déduplication par `outbox_id` dans le consumer notifications si les doublons deviennent gênants.
- Surveiller les lignes `pending` dont `attempts` est élevé.
- Le même mécanisme pourra servir aux autres modules qui ont besoin d'une notification garantie.
