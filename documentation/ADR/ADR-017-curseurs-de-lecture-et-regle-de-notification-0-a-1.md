# Titre:
Curseurs de lecture et règle de notification 0→1 décidée dans la messagerie

# Status:
Accepté

# Contexte :
Le destinataire d'un message doit être prévenu par email, sans recevoir un email par message lors d'un échange rapide. Il faut donc savoir, au moment de l'envoi, si le destinataire avait déjà des messages non lus.
Si cette décision était prise par le module notifications en relisant la base de la messagerie, les deux modules seraient couplés (ADR-011, ADR-013). Il y aurait aussi une course : entre la publication et le traitement, le destinataire a pu lire, ou un autre message est arrivé.
Le polling de la messagerie a besoin d'un curseur monotone (ADR-015). Les UUID utilisés comme clés primaires dans les autres modules n'ont pas d'ordre.

# Options
Option 1 : Un champ `read_at` par message, et un comptage des messages non lus.
Option 2 : Un curseur de lecture par participant (`last_read_id`), des ids de messages séquentiels, et la décision 0→1 prise dans la messagerie puis transmise dans l'événement.

# Décision
Nous retenons l'option 2.
- `Message` utilise un identifiant auto-incrémenté (BigAutoField). C'est une exception assumée à la convention UUID : ces ids servent de curseur. `Conversation` garde un UUID.
- `Conversation` porte deux curseurs : `guest_last_read_id` et `host_last_read_id`. Les messages non lus d'un participant sont ceux de l'autre participant dont l'id est supérieur à son curseur.
- Un curseur ne recule jamais. Envoyer un message fait avancer le curseur de l'expéditeur : répondre vaut lecture.
- Le marquage comme lu prend un `up_to_id` : le front marque jusqu'au dernier message réellement affiché, et non jusqu'au dernier message en base.
- À l'envoi, sous verrou de la conversation (`SELECT ... FOR UPDATE`), le service vérifie si le destinataire avait déjà un message non lu. Si non (passage de 0 à 1), il écrit la notification dans l'outbox (ADR-016).
- L'événement `messaging.new_message_email_requested` est autosuffisant : email et prénom du destinataire, prénom de l'expéditeur, nom du logement, id de conversation, et un extrait de 120 caractères au plus, jamais le corps complet. Le module notifications ne lit jamais les données de la messagerie.

Le verrou sur la conversation a un second rôle : il sérialise les envois d'un même fil, donc les ids des messages y sont validés dans l'ordre. Un client qui demande `?after=N` ne peut pas manquer un message validé plus tard avec un id inférieur.

# Conséquences :
positives (bénéfices)
- Un seul email par période « non lue », quel que soit le nombre de messages.
- Aucune course entre la décision et la publication, aucun couplage entre modules.
- Curseurs simples, comptage des non-lus en une requête.
- Le corps des messages ne se retrouve ni dans les boîtes mail ni dans les logs du broker.

négatifs (inconvénients)
- Deux conventions de clé primaire coexistent (UUID pour les fils, entier pour les messages).
- Les envois d'un même fil sont sérialisés (sans impact au volume d'une conversation entre deux personnes).
- Pas d'accusé de lecture message par message, seulement « lu jusqu'à ».

Impacts futurs
- Un indicateur « vu » côté expéditeur pourra être déduit du curseur de l'autre participant, sans changement de modèle.
