from typing import ContextManager

from django.db import transaction

from apps.messaging.application.ports.TransactionManager import TransactionManager


class DjangoTransactionManager(TransactionManager):

    def atomic(self) -> ContextManager:
        return transaction.atomic()
