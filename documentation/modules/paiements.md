# Module paiements

Encaissement des réservations, versements aux hôtes et remboursements.
Code : `server/apps/paiements/` (backend), `client/src/lib/paiement.ts`, `client/src/app/(main)/reservation/paiement/`, `client/src/components/hote/RevenusHote.tsx` (frontend).

## Principe

AfriStay encaisse tout le paiement, le conserve jusqu'au séjour, puis reverse sa part à l'hôte.

```
Voyageur ──paie 64 800 FCFA──▶ AfriStay (FedaPay ou PayPal)
                                   │  conservé jusqu'à l'arrivée + 24 h
                                   ├──▶ Hôte : 57 000 FCFA (Mobile Money, via FedaPay)
                                   └──▶ AfriStay : 7 800 FCFA (avant frais des prestataires)
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
| Mobile Money | FedaPay | FCFA | Automatique, par versement sur le numéro débité |
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

L'annulation par l'hôte ou par AfriStay (`services.annuler(r, par='hote' | 'plateforme')`) rembourse tout. Pas encore exposée dans l'API : à brancher sur le back-office.

## Worker

`python manage.py traiter_paiements` (service `paiements-worker` dans `compose.yaml`, une passe par minute ; `--once` pour une seule passe). Il :
- relit les paiements en attente des 2 dernières heures ;
- expire les réservations non payées ;
- envoie les versements dus et les remboursements, et suit leur statut.

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
```

Sans aucune clé, le paiement en ligne est désactivé : les réservations sont confirmées immédiatement, comme avant.

Webhook à déclarer dans le tableau de bord FedaPay : `https://<domaine-api>/api/v1/paiements/webhooks/fedapay/`, événements `transaction.*` et `payout.*`. En local, FedaPay ne peut pas joindre `localhost` : la page de retour et le worker suffisent.

## Suivi et opérations

L'admin Django (`/admin/`) liste les paiements, versements, remboursements et profils de versement. À surveiller :
- **Remboursements « À traiter manuellement »** : cartes bancaires, ou numéro débité inconnu → rembourser depuis FedaPay, puis passer la ligne à « Envoyé ».
- **Versements « Échoué »** : après 5 tentatives (numéro faux, mode non activé…) ; le message d'erreur est dans `derniere_erreur`. Corriger puis repasser à « Planifié ».
- Une annulation après le versement à l'hôte est journalisée en avertissement : à régulariser avec l'hôte.

## Tests

`python manage.py test apps.paiements` : 17 tests, prestataires simulés (aucun appel réseau). Ils couvrent les montants, le barème, la confirmation, l'idempotence, l'expiration, le paiement tardif, les versements, les remboursements Mobile Money / carte / PayPal et la signature des webhooks.
