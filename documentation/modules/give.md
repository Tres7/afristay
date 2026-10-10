# Module Kwa-Ba Give (dons)

Les voyageurs donnent à des ONG locales vérifiées (éducation, santé, accès à l'eau, environnement).
Code : `server/apps/give/` (backend), `client/src/app/(main)/give/`, `client/src/app/(main)/profil/dons/` et `client/src/components/give/` (frontend).

## Principe

Kwa-Ba **encaisse** le don (FedaPay ou PayPal, via `apps.paiements`) puis le **reverse chaque mois** à l'ONG, avec une preuve publiée.
Kwa-Ba ne prend **aucune commission** (gratuit pour les ONG partenaires au lancement). Seuls les frais du prestataire de paiement s'appliquent ; le donateur choisit qui les paie (case cochée par défaut : il les ajoute et l'ONG reçoit 100 %).

```
Don de 2 000 FCFA, frais ajoutés  ──paie 2 062──▶ Kwa-Ba ──2 000 le 10 du mois suivant──▶ ONG
Don de 2 000 FCFA, frais déduits  ──paie 2 000──▶ Kwa-Ba ──1 940──────────────────────────▶ ONG
```

## Cycle d'un don

| Étape | Statut | Qui |
|---|---|---|
| Choix de l'ONG (ou d'un projet), du montant, des frais, du moyen de paiement | `en_attente` — redirection vers FedaPay / PayPal | Donateur |
| Paiement confirmé (page de retour, webhook ou worker) | `paye` — email de confirmation (« ce n'est pas un reçu fiscal ») | Worker |
| Paiement refusé, annulé, ou toujours pas confirmé après 24 h | `echoue` — masqué dans l'historique | Worker |

Une tentative de paiement = un don : pas de double encaissement possible pour un même don.
Un paiement confirmé après le classement « non abouti » est accepté (l'argent a bien été donné).

## Reversements aux ONG

1. Chaque passe du worker (`traiter_paiements`) regroupe les dons payés des **mois terminés** en un `ReversementModel` par ONG et par mois. Les administrateurs reçoivent un email « Reversement à effectuer » (date limite : le 10 du mois suivant).
2. L'équipe fait le virement (coordonnées affichées sur le reversement, saisies sur la fiche de l'ONG, jamais publiées).
3. Dans `/admin/give/reversementmodel/<id>/` : joindre la **preuve** (PDF ou image, numéros de compte masqués), le moyen et la référence du virement, passer à « Effectué ». Sans preuve ni référence, le statut est refusé.
4. Chaque donateur concerné reçoit « Votre don a été reversé à … » ; la preuve apparaît sur la page de l'ONG, sur `/give/impact` et dans « Mes dons ».

L'action « Préparer maintenant les reversements des mois terminés » (liste des dons) lance l'étape 1 sans attendre le worker.

## Publier une ONG

`/admin/give/organisationmodel/add/` : une ONG n'apparaît sur le site qu'avec une **date de vérification** (et « actif » coché).
Avant de la renseigner, vérifier au minimum : récépissé ou numéro d'enregistrement officiel, statuts, compte bancaire ou Mobile Money **au nom de l'ONG**, un contact joignable. Le champ « Ce qui a été vérifié » est affiché publiquement.
Les projets (objectif facultatif, barre de progression) s'ajoutent sur la fiche de l'ONG. Les adresses `don` et `impact` sont réservées.

## Données personnelles

- L'ONG ne voit le nom et l'email du donateur que s'il a coché la case prévue ; sinon il apparaît « Anonyme » (y compris dans l'admin du reversement).
- Pages publiques : montants agrégés et preuves de virement, jamais le nom des donateurs.

## Réglages (`montants.py`)

| Constante | Valeur | Rôle |
|---|---|---|
| `FRAIS_PAIEMENT` | 3 % | Frais moyens du prestataire, à ajuster selon le contrat FedaPay |
| `COMMISSION_KWABA` | 0 | Affichée sur la page de don |
| `MONTANTS_SUGGERES` | 500, 2 000, 3 000, 5 000 FCFA | Avec l'équivalent en euros |
| `MONTANT_MIN` / `MONTANT_MAX` | 500 / 1 000 000 FCFA | |
| `JOUR_REVERSEMENT` | 10 | Les dons d'un mois sont reversés au plus tard ce jour du mois suivant |

Le site refait le même calcul (`client/src/lib/give.ts`) pour l'afficher avant le paiement : les deux doivent rester identiques (arrondi au franc supérieur à partir de 0,5).

## API (`/api/v1/give/`)

| Méthode | Chemin | Accès | Rôle |
|---|---|---|---|
| GET | `config/` | public | Montants suggérés, frais, moyens de paiement, causes |
| GET | `organisations/?cause=eau` | public | ONG publiées, avec le montant collecté |
| GET | `organisations/<slug>/` | public | Fiche, vérification, projets, impact, reversements et preuves |
| GET | `impact/` | public | Collecté / reversé / à reverser, par cause, derniers reversements |
| GET / POST | `dons/` | connecté | Historique du donateur / nouveau don → `{id, url}` de paiement |
| GET | `dons/<id>/` | connecté | Page de retour : relit le paiement chez le prestataire |

## Essayer en local

```bash
docker compose exec backend python manage.py seed_give_demo   # 4 ONG fictives « (démo) », jamais en production
```
Puis `/give` sur le site. Un don crée une vraie transaction FedaPay **sandbox**.

## À prévoir

- Reçus fiscaux : impossibles tant que Kwa-Ba n'est pas habilité ; l'email le précise.
- Frais réels par moyen de paiement (Mobile Money, carte, PayPal) au lieu d'un taux moyen.
- Reversement automatique par payout FedaPay (aujourd'hui : virement manuel avec preuve).
