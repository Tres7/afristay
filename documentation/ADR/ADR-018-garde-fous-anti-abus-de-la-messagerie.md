# Titre:
Garde-fous anti-abus de la messagerie

# Status:
Accepté

# Contexte :
Tout utilisateur connecté peut contacter l'hôte de n'importe quel hébergement, pour poser des questions avant de réserver. Chaque premier message déclenche un email vers un tiers : la messagerie peut donc servir de vecteur de spam.
Le login n'exige pas d'adresse vérifiée : un script pourrait créer des comptes jetables pour inonder des hôtes.
Aucun throttle ni cache n'était configuré dans le projet. Le cache par défaut de Django vit en mémoire dans chaque processus : sous gunicorn, chaque worker aurait son propre compteur.

# Options
Option 1 : Aucun garde-fou en V1.
Option 2 : Vérification d'email obligatoire, throttles sur les écritures, plafond d'emails par destinataire.
Option 3 : Option 2, plus une modération ou un blocage des fils par l'hôte.

# Décision
Nous retenons l'option 2 pour la V1.
- Démarrer une conversation et envoyer un message exigent `is_verified`. Sinon : 403 avec un message explicite.
- Throttles DRF par scope, sur les POST uniquement : `messaging_conversation_create` à 10 par heure, `messaging_message_send` à 30 par minute. Au-delà : 429 avec `Retry-After`. Les GET (polling) ne sont pas limités.
- Les compteurs des throttles sont stockés dans un `DatabaseCache` (table `django_cache` dans PostgreSQL), partagé entre processus sans nouvelle infrastructure. La table est créée par une migration du module (`messaging 0002`), donc `migrate` suffit.
- Plafond de 5 emails de notification par destinataire et par heure glissante. Une notification qui dépasse le plafond est reportée, jamais perdue (ADR-016).
- Un hôte ne peut pas ouvrir de fil sur son propre logement : 403 explicite plutôt qu'un 404 trompeur.
- Un non-participant reçoit 404 sur un fil, comme si le fil n'existait pas : on ne révèle pas son existence.
- Messages limités à 2000 caractères, contenu vide refusé.

# Conséquences :
positives (bénéfices)
- Un compte jetable non vérifié ne peut pas écrire.
- Le volume d'emails reçus par un hôte est borné.
- Compteurs cohérents quel que soit le nombre de workers.

négatifs (inconvénients)
- Une requête de plus sur la base pour chaque écriture throttlée (lecture et écriture du compteur).
- La table `django_cache` doit être nettoyée par Django (expiration des entrées), ce qui est automatique mais ajoute des écritures.
- L'hôte ne peut ni bloquer ni masquer un fil indésirable.
- Aucun moyen de se désinscrire des emails de notification : la page « Notifications » du front est encore une maquette.

Impacts futurs
- Avant l'ouverture au public : préférence ou lien de désinscription des emails, et blocage d'un fil par l'hôte (V1.5).
- Le login accepte encore les comptes non vérifiés : à traiter dans le module users, indépendamment de la messagerie.
- Si un Redis est ajouté plus tard (WebSocket par exemple), les compteurs pourront y migrer en changeant seulement `CACHES`.
