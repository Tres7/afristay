from django.db import connection
from django.http import JsonResponse


def health(request):
    """Sonde de santé (Render, smoke test) : l'application répond et la base est joignable."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
    except Exception:
        return JsonResponse({'status': 'error', 'database': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})
