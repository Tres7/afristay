"""Disponibilité d'un logement : une nuit est prise si une réservation active ou un blocage de l'hôte la couvre.

Convention commune : une période [debut, fin) couvre les nuits de debut à fin - 1 ;
le jour `fin` (départ) reste libre pour une nouvelle arrivée.
"""
from datetime import date

from django.db.models import Q
from django.utils import timezone

from .models import BlocageModel, HebergementModel


def verrouiller(hebergement_id) -> None:
    """Verrouille le logement jusqu'à la fin de la transaction en cours.

    À appeler avant conflit() ou a_des_reservations() dès que la décision mène à une écriture
    (réservation, confirmation de paiement, blocage) : sans verrou, deux requêtes simultanées voient
    toutes deux les dates libres et réservent les mêmes nuits. Lève une erreur hors transaction.
    """
    list(HebergementModel.objects.select_for_update().filter(pk=hebergement_id).values_list('pk', flat=True))


def filtre_actives(prefixe: str = ''):
    """Réservations qui occupent leurs dates : confirmées, ou en attente de paiement non expirées."""
    p = prefixe
    return (
        Q(**{f'{p}status': 'confirmed'})
        | Q(**{f'{p}status': 'pending', f'{p}expire_le__isnull': True})
        | Q(**{f'{p}status': 'pending', f'{p}expire_le__gt': timezone.now()})
    )


def _reservations(hebergement_id, debut: date, fin: date, exclure=None):
    from apps.reservations.models import ReservationModel  # import local : évite un import circulaire
    qs = ReservationModel.objects.filter(
        filtre_actives(),
        hebergement_id=hebergement_id,
        check_in__lt=fin,
        check_out__gt=debut,
    )
    return qs.exclude(pk=exclure) if exclure else qs


def _blocages(hebergement_id, debut: date, fin: date):
    return BlocageModel.objects.filter(hebergement_id=hebergement_id, debut__lt=fin, fin__gt=debut)


def a_des_reservations(hebergement_id, debut: date, fin: date) -> bool:
    return _reservations(hebergement_id, debut, fin).exists()


def est_disponible(hebergement_id, debut: date, fin: date) -> bool:
    return not _reservations(hebergement_id, debut, fin).exists() and not _blocages(hebergement_id, debut, fin).exists()


def conflit(hebergement_id, debut: date, fin: date, exclure=None) -> str | None:
    """Explique pourquoi la période n'est pas libre (message destiné au voyageur), ou None.

    `exclure` : identifiant d'une réservation à ignorer (celle que l'on est en train de confirmer).
    """
    if _reservations(hebergement_id, debut, fin, exclure).exists():
        return "Ces dates sont déjà réservées pour cet hébergement."
    if _blocages(hebergement_id, debut, fin).exists():
        return "L'hôte a fermé ces dates à la réservation."
    return None


def periodes_indisponibles(hebergement_id, debut: date, fin: date, detail: bool = False) -> list[dict]:
    """Périodes occupées sur [debut, fin). En mode public, fusionnées et sans aucune information sur leur origine."""
    periodes = []
    for r in _reservations(hebergement_id, debut, fin).select_related('guest'):
        p = {'debut': r.check_in, 'fin': r.check_out}
        if detail:
            p.update(type='reservation', id=str(r.id), reference=r.reference,
                     voyageur=f"{r.guest.first_name} {r.guest.last_name}".strip(), statut=r.status)
        periodes.append(p)
    for b in _blocages(hebergement_id, debut, fin):
        p = {'debut': b.debut, 'fin': b.fin}
        if detail:
            p.update(type='blocage', id=str(b.id), motif=b.motif)
        periodes.append(p)

    periodes.sort(key=lambda p: p['debut'])
    if detail:
        return periodes

    # Fusion des périodes qui se touchent : le voyageur voit seulement « libre / pris »
    fusion = []
    for p in periodes:
        if fusion and p['debut'] <= fusion[-1]['fin']:
            fusion[-1]['fin'] = max(fusion[-1]['fin'], p['fin'])
        else:
            fusion.append(dict(p))
    return fusion
