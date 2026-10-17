from rest_framework.permissions import IsAuthenticated


class EstAdministrateur(IsAuthenticated):
    """Back-office : rôle lu en base à chaque requête (request.user), jamais dans la session du frontend."""

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'admin'
