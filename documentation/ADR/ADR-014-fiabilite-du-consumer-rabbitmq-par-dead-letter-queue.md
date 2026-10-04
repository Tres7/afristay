# Titre:
Fiabilité du consumer RabbitMQ par dead-letter queue

# Status:
Accepté

# Contexte :
Le consumer du module notifications rejetait les messages en échec avec `basic_nack(requeue=False)` sans dead-letter exchange configuré : RabbitMQ les supprimait, et la notification était perdue sans trace.
Le décodage JSON était en dehors du bloc de gestion d'erreur : un message mal formé levait une exception non rattrapée, arrêtait le consumer, et le redémarrage automatique du conteneur (`restart: on-failure`) relivrait le même message, provoquant une boucle de plantages.
Les échecs de publication côté `UserService` étaient avalés par `except Exception: pass`, sans aucun log.
Le module de messagerie à venir fera de certains emails l'unique déclencheur d'une notification : une perte deviendrait définitive.

# Options
Option 1 : Conserver le rejet simple et remettre les messages en file (`requeue=True`).
Option 2 : Rejeter les messages en échec vers une dead-letter queue dédiée, et protéger tout le traitement d'un message (décodage compris).
Option 3 : Mettre en place des réessais différés (file de retry avec TTL) avant la dead-letter queue.

# Décision
Nous retenons l'option 2.
- La file `notifications.events` est déclarée avec `x-dead-letter-exchange = domain_events.dlx` et `x-dead-letter-routing-key = notifications.events`.
- `domain_events.dlx` est un exchange `direct` partagé : chaque future file de consumer pourra y publier avec sa propre routing key et disposer de sa propre DLQ.
- Les messages en échec sont stockés dans `notifications.events.dlq`. RabbitMQ y conserve l'en-tête `x-death` (raison, routing key et file d'origine), ce qui permet de les rejouer.
- Le décodage JSON, la recherche du handler et son exécution sont dans un même bloc : tout échec est loggé avec sa cause, puis le message part en dead-letter. Le consumer continue de tourner.
- Les échecs de publication côté producteur sont loggés (`logger.exception`) au lieu d'être ignorés.
- Une configuration `LOGGING` minimale affiche les logs `INFO` des modules `apps.*` dans la sortie des conteneurs.

L'option 1 a été écartée car un message durablement invalide serait relivré à l'infini. L'option 3 a été écartée pour la V1 : elle ajoute une file et une logique de délai pour un volume d'erreurs encore faible.

# Conséquences :
positives (bénéfices)
- Aucun message en échec n'est perdu : il reste consultable et rejouable dans la DLQ.
- Un message mal formé ne fait plus tomber le consumer.
- Les erreurs de publication et de traitement deviennent visibles dans les logs.

négatifs (inconvénients)
- Une erreur passagère (serveur SMTP indisponible par exemple) envoie aussi le message en DLQ : il faut le rejouer manuellement.
- Le rejeu depuis la DLQ est aujourd'hui une opération manuelle (interface RabbitMQ ou script).
- Migration unique sur les environnements existants : la file `notifications.events`, déjà déclarée sans arguments, doit être supprimée pour être recréée. RabbitMQ refuse de modifier les arguments d'une file existante. Le consumer détecte ce cas au démarrage et affiche la commande à lancer (`docker compose exec rabbitmq rabbitmqctl delete_queue notifications.events`, après avoir vérifié que la file est vide).

Impacts futurs
- Si les erreurs passagères deviennent fréquentes, ajouter des réessais différés (option 3) avant la DLQ.
- Une surveillance de la taille de la DLQ (alerte au-delà de zéro) sera utile avant l'ouverture au public.
- Le consumer ne réessaie pas la connexion au démarrage : tant que RabbitMQ n'est pas prêt, il plante et redémarre via `restart: on-failure`. Un healthcheck RabbitMQ dans `compose.yaml` réglerait ce point.
