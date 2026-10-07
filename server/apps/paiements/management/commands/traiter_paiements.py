import logging
import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from apps.paiements import services

logger = logging.getLogger('apps.paiements.worker')


class Command(BaseCommand):
    help = ("Worker des paiements : expire les réservations non payées, rattrape les paiements, "
            "envoie les versements aux hôtes et les remboursements.")

    def add_arguments(self, parser):
        parser.add_argument('--once', action='store_true', help="Traite une seule passe puis s'arrête.")
        parser.add_argument('--interval', type=int, default=60, help='Secondes entre deux passes.')

    def handle(self, *args, **options):
        logger.info("Worker des paiements démarré (intervalle %ss)", options['interval'])
        while True:
            close_old_connections()
            if services.paiement_actif():
                try:
                    stats = services.passe()
                    if stats:
                        logger.info("Passe : %s", stats)
                except Exception:
                    logger.exception("Erreur pendant la passe du worker des paiements")
            if options['once']:
                break
            time.sleep(options['interval'])
