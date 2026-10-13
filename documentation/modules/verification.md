# Vérification des hôtes et des logements

N'importe qui peut créer un compte hôte. Pour protéger les voyageurs, une annonce n'est publiée qu'après la visite d'un **agent de terrain** Kwa-Ba, qui contrôle le logement et l'identité de l'hôte.
Code : `server/apps/verifications/` (backend), `client/src/app/agent/` (espace agent), `client/src/components/hote/VerificationIdentite.tsx` (espace hôte).

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
- **Supprimée dès que l'agent a vérifié l'identité** : seuls le type de pièce et le résultat du contrôle sont conservés.

## Visite de l'agent

1. Un email « Visite à planifier » part aux agents et aux administrateurs à chaque nouvelle annonce, ou à chaque annonce remise en vérification.
2. Sur `/agent` (téléphone), l'agent voit les annonces en attente, les plus anciennes d'abord. Il peut filtrer par ville, appeler l'hôte ou lui écrire sur WhatsApp, ouvrir l'itinéraire et consulter la pièce d'identité.
3. Sur place, il coche la grille de contrôle :
   - la pièce correspond à la personne rencontrée ;
   - le logement est à l'adresse indiquée ;
   - les photos correspondent au logement ;
   - les équipements annoncés sont présents.

   Il peut ajouter jusqu'à 10 photos (stockage privé) et un commentaire.
4. **Valider** n'est possible que si tous les points sont cochés et que l'hôte a envoyé sa pièce. L'annonce est alors publiée et l'hôte reçoit un email ; la fiche affiche « Vérifié par Kwa-Ba ».
5. **Refuser** exige un motif d'au moins 10 caractères, envoyé à l'hôte et affiché dans son espace. L'hôte corrige l'annonce et l'enregistre : elle repart en vérification.

Chaque décision est conservée (`VisiteModel` : agent, contrôles, commentaire, photos) et inscrite au journal d'audit.

## Comptes agents

Un agent est un utilisateur avec le rôle `agent`. Ce rôle ne peut pas être choisi à l'inscription : dans l'administration Django (Utilisateurs), créer le compte, ou modifier un compte existant, avec **Rôle = Agent de terrain**. Les administrateurs ont les mêmes droits que les agents.

## Production

- `R2_PRIVE_BUCKET` : bucket R2 **privé**, distinct de celui des photos. Créé sans domaine public ; le jeton R2 existant doit y avoir accès en lecture et écriture.
- Sans ce bucket, les documents sont écrits dans `server/prive/` du conteneur et **perdus à chaque redéploiement**. À défaut de bucket, monter un volume sur `PRIVE_ROOT`.
