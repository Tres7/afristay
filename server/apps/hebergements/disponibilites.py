"""Disponibilité d'un logement : une nuit est prise si une réservation active ou un blocage de l'hôte la couvre.

Convention commune : une période [debut, fin) couvre les nuits de debut à fin - 1 ;
le jour `fin` (départ) reste libre pour une nouvelle arrivée.
"""
from datetime import date


from .models import BlocageModel

STATUTS_ACTIFS = ('pending', 'confirmed')


def _reservations(hebergement_id, debut: date, fin: date):
    from apps.reservations.models import ReservationModel  # import local : évite un import circulaire
    return ReservationModel.objects.filter(
        hebergement_id=hebergement_id,
        status__in=STATUTS_ACTIFS,
        check_in__lt=fin,
        check_out__gt=debut,
    )


def _blocages(hebergement_id, debut: date, fin: date):
    return BlocageModel.objects.filter(hebergement_id=hebergement_id, debut__lt=fin, fin__gt=debut)


def a_des_reservations(hebergement_id, debut: date, fin: date) -> bool:
    return _reservations(hebergement_id, debut, fin).exists()


def est_disponible(hebergement_id, debut: date, fin: date) -> bool:
    return not _reservations(hebergement_id, debut, fin).exists() and not _blocages(hebergement_id, debut, fin).exists()


def conflit(hebergement_id, debut: date, fin: date) -> str | None:
    """Explique pourquoi la période n'est pas libre (message destiné au voyageur), ou None."""
    if _reservations(hebergement_id, debut, fin).exists():
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
