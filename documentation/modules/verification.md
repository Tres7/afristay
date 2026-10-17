# Vérification des hôtes et des logements

N'importe qui peut créer un compte hôte. Pour protéger les voyageurs, une annonce n'est publiée qu'après la visite d'un **agent de terrain** Kwa-Ba, et une visite n'est demandée qu'une fois l'identité de l'hôte contrôlée à distance.
Code : `server/apps/verifications/` (backend), `client/src/app/agent/` et `client/src/components/agent/PiecesAControler.tsx` (espace agent), `client/src/components/hote/CandidatureHote.tsx` et `VerificationIdentite.tsx` (espace hôte).

## Candidature de l'hôte

L'espace hôte affiche 3 étapes tant que l'identité n'est pas vérifiée :

1. **Téléphone** : obligatoire pour créer une annonce (l'agent appelle l'hôte), sinon `400`.
2. **Pièce d'identité** : envoyée, puis contrôlée à distance par un agent ou un admin (voir plus bas).
3. **Logement** : l'annonce reste en `en_attente`. Tant que l'identité n'est pas vérifiée, un hôte a au plus **3 annonces non vérifiées** (`MAX_ANNONCES_HOTE_NON_VERIFIE`), contre les comptes qui inondent les agents.

Badges : « Email confirmé » sur le profil (code reçu par email, rien de plus) ; « Hôte vérifié » sur la fiche d'un logement quand la pièce de l'hôte est vérifiée (`hote_verifie` dans l'API) ; « Vérifié par Kwa-Ba » sur une annonce visitée.

Refuser une candidature : dans le back-office, repasser le compte en voyageur (ou le désactiver).

## Cycle d'une annonce

| Statut (`statut_verification`) | Visible des voyageurs | Quand |
|---|---|---|
| `en_attente` | non | À la création ; après une modification de la ville, de l'adresse ou des photos ; après une modification d'une annonce refusée |
| `verifiee` | oui (si l'hôte ne l'a pas masquée) | L'agent a validé la visite |
| `refusee` | non | L'agent a refusé, avec un motif envoyé à l'hôte |

« Visible » veut dire : recherche, villes, Concierge, Together, réservation, favoris, nouvelle conversation, fiche publique et sitemap (`HebergementModel.objects.publiees()`). L'hôte et les agents voient toujours la fiche.

Les annonces existantes au moment de la mise en place ont été marquées `verifiee` (migration `hebergements.0005`).

## Pièce d'identité de l'hôte

- Envoyée dans l'espace hôte : carte d'identité, passeport, permis ou titre de séjour, en image (ré-encodée en JPEG sans métadonnées) ou en PDF, 10 Mo maximum.
- Stockée dans un espace **privé** (`STORAGES['prive']`) : bucket R2 sans domaine public (`R2_PRIVE_BUCKET`), sinon le dossier `PRIVE_ROOT` (par défaut `server/prive/`), jamais servi par le serveur web.
- Lue uniquement par l'API (`GET /api/v1/verifications/identite/<hote>/fichier/`), pour un agent ou un administrateur. Chaque lecture est inscrite au journal d'audit (`piece_consultee`).
- Son envoi prévient les agents (« Pièce d'identité à contrôler »). Sur `/agent`, la section **Pièces d'identité à contrôler** (`GET /api/v1/verifications/identites/`) permet de voir le document, puis `POST /api/v1/verifications/identites/<hote>/decision/` avec `verifiee`, ou `refusee` et un motif (10 caractères au moins) envoyé à l'hôte.
- **Supprimée dès la décision** : seuls le type de pièce et le résultat du contrôle sont conservés. Une pièce refusée peut être renvoyée.
- Identité vérifiée : les annonces en attente de l'hôte sont aussitôt envoyées aux agents pour une visite (journal : `identite_verifiee` / `identite_refusee`).

## Visite de l'agent

1. Un email « Visite à planifier » part aux agents et aux administrateurs à chaque nouvelle annonce, ou à chaque annonce remise en vérification, **si l'identité de l'hôte est déjà vérifiée** (sinon, au moment où elle l'est).
2. Sur `/agent` (téléphone), l'agent voit les annonces en attente des hôtes vérifiés, les plus anciennes d'abord. Il peut filtrer par ville, appeler l'hôte ou lui écrire sur WhatsApp et ouvrir l'itinéraire.
3. Sur place, il coche la grille de contrôle :
   - la pièce correspond à la personne rencontrée ;
   - le logement est à l'adresse indiquée ;
   - les photos correspondent au logement ;
   - les équipements annoncés sont présents.

   Il peut ajouter jusqu'à 10 photos (stockage privé) et un commentaire.
4. **Valider** n'est possible que si tous les points sont cochés et que l'identité de l'hôte est vérifiée. Si la personne rencontrée ne correspond pas à la pièce (case décochée, refus), la pièce repasse en `refusee`. L'annonce est alors publiée et l'hôte reçoit un email ; la fiche affiche « Vérifié par Kwa-Ba ».
5. **Refuser** exige un motif d'au moins 10 caractères, envoyé à l'hôte et affiché dans son espace. L'hôte corrige l'annonce et l'enregistre : elle repart en vérification.

Chaque décision est conservée (`VisiteModel` : agent, contrôles, commentaire, photos) et inscrite au journal d'audit.

## Comptes agents

Un agent est un utilisateur avec le rôle `agent`. Ce rôle ne peut pas être choisi à l'inscription : dans l'administration Django (Utilisateurs), créer le compte, ou modifier un compte existant, avec **Rôle = Agent de terrain**. Les administrateurs ont les mêmes droits que les agents.

## Production

- `R2_PRIVE_BUCKET` : bucket R2 **privé**, distinct de celui des photos. Créé sans domaine public ; le jeton R2 existant doit y avoir accès en lecture et écriture.
- Sans ce bucket, les documents sont écrits dans `server/prive/` du conteneur et **perdus à chaque redéploiement**. À défaut de bucket, monter un volume sur `PRIVE_ROOT`.
