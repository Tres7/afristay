from rest_framework.permissions import BasePermission


class IsVerified(BasePermission):
    """Anti-abus : seule une adresse email vérifiée peut démarrer un fil ou envoyer un message."""

    message = "Vérifiez votre adresse email pour utiliser la messagerie."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_verified', False)
        )
