# Module paiements

Encaissement des réservations, versements aux hôtes et remboursements.
Code : `server/apps/paiements/` (backend), `client/src/lib/paiement.ts`, `client/src/app/(main)/reservation/paiement/`, `client/src/components/hote/RevenusHote.tsx` (frontend).

## Principe

Kwa-Ba encaisse tout le paiement, le conserve jusqu'au séjour, puis reverse sa part à l'hôte.

```
Voyageur ──paie 64 800 FCFA──▶ Kwa-Ba (FedaPay ou PayPal)
                                   │  conservé jusqu'à l'arrivée + 24 h
                                   ├──▶ Hôte : 57 000 FCFA (Mobile Money, via FedaPay)
                                   └──▶ Kwa-Ba : 7 800 FCFA (avant frais des prestataires)
```

| Élément | Taux | Exemple : 3 nuits à 20 000 FCFA |
|---|---|---|
| Prix des nuits | – | 60 000 |
| Frais de service voyageur | 8 % | + 4 800 → le voyageur paie **64 800** |
| Commission hôte | 5 % | − 3 000 → l'hôte reçoit **57 000** |

Les taux sont dans `server/apps/paiements/tarifs.py`. Les montants sont **figés sur la réservation** au moment où elle est créée (`prix_nuits`, `frais_service`, `commission_hote`) : changer un taux ne modifie pas les réservations existantes. Tous les montants sont des entiers en FCFA.

## Moyens de paiement

| Moyen choisi | Prestataire | Devise | Remboursement |
|---|---|---|---|
| Mobile Money | FedaPay | FCFA | Automatique, par versement sur le compte Mobile Money que le voyageur indique à l'annulation |
| Carte Visa / Mastercard | FedaPay | FCFA | **Manuel**, depuis le tableau de bord FedaPay (statut « À traiter manuellement » dans l'admin) |
| PayPal | PayPal | EUR (1 € = 655,957 FCFA) | Automatique, sur le compte ou la carte PayPal |

Les **versements aux hôtes passent toujours par FedaPay** (Mobile Money), quel que soit le moyen utilisé par le voyageur. L'argent encaissé par PayPal arrive sur le compte PayPal : il faut approvisionner le solde FedaPay pour couvrir les versements correspondants.

Pays ouverts aux versements : Togo, Bénin, Burkina Faso, Niger, Mali (`operateurs.py`). Les codes d'opérateur (`moov_tg`, `togocel`, `mtn_open`…) sont les « modes » FedaPay : **à vérifier dans le tableau de bord FedaPay** avant la production. Un mode non activé fait échouer le versement avec le message de FedaPay (visible dans l'admin Django).

## Cycle d'une réservation

1. **Réservation** : statut `pending`, dates bloquées `PAIEMENT_EXPIRATION_MINUTES` (30 min par défaut, champ `expire_le`).
2. **Paiement** : `POST /api/v1/paiements/reservations/<id>/payer/` avec `{"moyen": "mobile_money" | "carte" | "paypal"}` → `{"url": ...}`. Le navigateur part sur la page du prestataire, puis revient sur `/reservation/paiement/<id>`.
3. **Confirmation** : le statut de la transaction est **toujours relu chez le prestataire**, jamais pris du navigateur ou du contenu du webhook. Trois déclencheurs, tous idempotents :
   - la page de retour interroge `GET .../statut/` toutes les 3 s ;
   - le webhook FedaPay `POST /api/v1/paiements/webhooks/fedapay/` ;
   - le worker, à chaque passe (il rattrape les webhooks perdus, et leur absence en local).
   Paiement réussi → réservation `confirmed` + versement `planifie` à l'arrivée + 24 h (arrivée = 14 h le jour du check-in).
4. **Sans paiement à temps** : le worker annule la réservation (`annule_par = expiration`) et libère les dates. Un paiement qui arrive après coup confirme la réservation si les dates sont encore libres, sinon il est remboursé intégralement.
5. **Versement** : à l'échéance, le worker envoie la part de l'hôte sur son compte Mobile Money (profil saisi dans Espace hôte → Revenus). Sans profil, le versement attend, et l'hôte voit le message.

## Annulation

`DELETE /api/v1/reservations/<id>/` → `services.annuler(reservation, par='voyageur')`, renvoie `{"rembourse": montant}`.

| Annulation par le voyageur | Voyageur remboursé | Hôte reçoit |
|---|---|---|
| Plus de 7 jours avant l'arrivée | tout | rien (versement annulé) |
| Entre 7 jours et 48 h | tout sauf 50 % des nuits | 50 % des nuits − 5 % |
| Moins de 48 h | rien | sa part complète |

**Remboursement Mobile Money** : FedaPay ne communique pas le numéro débité. Le remboursement est créé au statut « En attente du numéro du voyageur » ; l'API d'annulation renvoie `numero_requis: true` et le site ouvre aussitôt la fenêtre « Où recevoir votre remboursement ? » (pays, opérateur, numéro). Le voyageur peut aussi le faire plus tard depuis Mes réservations. Route : `PUT /api/v1/paiements/reservations/<id>/compte-remboursement/` avec `{pays, operateur, numero}`. Le worker envoie ensuite le remboursement.

L'annulation par l'hôte ou par Kwa-Ba (`services.annuler(r, par='hote' | 'plateforme')`) rembourse tout. Pas encore exposée dans l'API : à brancher sur le back-office.

## Worker

`python manage.py traiter_paiements` (service `paiements-worker` dans `compose.yaml`, une passe par minute ; `--once` pour une seule passe). Il :
- relit les paiements en attente des 2 dernières heures ;
- expire les réservations non payées ;
- envoie les versements dus et les remboursements, et suit leur statut ;
- envoie les emails (voir plus bas).

Après un échec chez FedaPay, le nouvel essai attend 15 min, puis 30 min, 1 h, 2 h ; au 5e échec la ligne passe en « Échoué » (versement) ou « À traiter manuellement » (remboursement) et les administrateurs sont prévenus par email.

## Emails

Envoyés par le worker (`notifications.py`, gabarits dans `templates/emails/paiements/`), jamais pendant une requête web ; un envoi raté est retenté à la passe suivante, sans doublon (champs `notifie`, et `notifie_hote` pour l'email de l'hôte).

| Événement | Destinataire |
|---|---|
| Paiement reçu, séjour confirmé | voyageur |
| Nouvelle réservation payée (montant et date du versement, rappel si le compte de versement manque) | hôte |
| Versement envoyé (détail de la commission) | hôte |
| Remboursement envoyé | voyageur |
| Versement échoué / remboursement à traiter | tous les utilisateurs `role = admin` |

Une seule instance suffit ; deux instances ne causent pas de double envoi (chaque ligne est réservée par une mise à jour conditionnelle).

## Configuration (`server/.env`)

```
FEDAPAY_SECRET_KEY=sk_sandbox_...      # vide = FedaPay désactivé
FEDAPAY_ENV=sandbox                    # live en production
FEDAPAY_WEBHOOK_SECRET=wh_sandbox_...  # vide = signature non vérifiée (à remplir en production)
PAYPAL_CLIENT_ID=...                   # vides = PayPal non proposé
PAYPAL_CLIENT_SECRET=...
PAYPAL_ENV=sandbox
PAIEMENT_EXPIRATION_MINUTES=30
BACKEND_URL=https://api.afristay…        # liens vers l'admin dans les alertes (défaut http://localhost:8000)
PAIEMENTS_PAUSE_EMAIL=1                  # secondes entre deux emails du worker (0 avec un vrai fournisseur d'emails)
```

Sans aucune clé, le paiement en ligne est désactivé : les réservations sont confirmées immédiatement, comme avant.

Webhook à déclarer dans le tableau de bord FedaPay : `https://<domaine-api>/api/v1/paiements/webhooks/fedapay/`, événements `transaction.*` et `payout.*`. En local, FedaPay ne peut pas joindre `localhost` : la page de retour et le worker suffisent.

## Suivi et opérations

L'admin Django (`/admin/`) liste les paiements, versements, remboursements et profils de versement. À surveiller :
- **Remboursements « En attente du numéro du voyageur »** : le voyageur n'a pas encore indiqué son compte ; il le voit dans Mes réservations.
- **Remboursements « À traiter manuellement »** : paiements par carte, ou 5 échecs d'envoi → rembourser depuis FedaPay, puis passer la ligne à « Envoyé ».
- **Versements « Échoué »** : après 5 tentatives (numéro faux, mode non activé…) ; le message d'erreur est dans `derniere_erreur`. Corriger puis repasser à « Planifié ».
- Une annulation après le versement à l'hôte est journalisée en avertissement : à régulariser avec l'hôte.

## Tests

- `server/tests/unit/paiements/` : montants, arrondis, barème d'annulation, conversion en euros (sans base).
- `server/tests/integration/paiements/` : cycle complet sur PostgreSQL, prestataires simulés (aucun appel réseau) — confirmation, idempotence, expiration, paiement tardif, versements, remboursements Mobile Money (numéro demandé au voyageur) / carte / PayPal, nouveaux essais progressifs, emails, signature des webhooks.

Voir `documentation/ci.md` pour les lancer.

## Prérequis du compte FedaPay (testés en sandbox le 8 octobre 2026)

- **Payouts** : refusés tant que FedaPay ne les a pas activés (`403 Opération non autorisée`). Sans eux, ni versements aux hôtes ni remboursements Mobile Money automatiques.
- **Carte bancaire** : à activer, sinon la page de paiement ne propose que Mobile Money.
- **Frais FedaPay** : par défaut à la charge du payeur (ajoutés au montant affiché sur la page FedaPay) ; les basculer à la charge du marchand.
- **Nom du marchand** affiché sur la page de paiement : à renseigner (« Kwa-Ba »).
- Les pays et opérateurs proposés au voyageur sur la page FedaPay dépendent des opérateurs activés sur le compte (en sandbox : « Momo Test » et la Côte d'Ivoire).
