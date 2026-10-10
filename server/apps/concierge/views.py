from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import ConversationModel

LONGUEUR_MAX = 2000


class StatutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'actif': services.actif()})


class ConversationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = ConversationModel.objects.filter(utilisateur=request.user)[:50]
        return Response({'results': [
            {'id': c.id, 'titre': c.titre or 'Nouvelle conversation', 'mis_a_jour_le': c.mis_a_jour_le}
            for c in conversations
        ]})

    def post(self, request):
        conversation = ConversationModel.objects.create(utilisateur=request.user)
        return Response({'id': conversation.id, 'titre': '', 'messages': []}, status=status.HTTP_201_CREATED)


class ConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        conversation = ConversationModel.objects.filter(pk=pk, utilisateur=request.user).first()
        if not conversation:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'id': conversation.id, 'titre': conversation.titre,
            'messages': [{'id': m.id, 'role': m.role, 'texte': m.texte, 'cartes': m.cartes, 'cree_le': m.cree_le}
                         for m in conversation.messages.filter(visible=True).exclude(texte='', cartes=[])],
        })

    def delete(self, request, pk):
        deleted, _ = ConversationModel.objects.filter(pk=pk, utilisateur=request.user).delete()
        if not deleted:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessagesView(APIView):
    """POST {texte} → réponse du Concierge en flux SSE (text/event-stream)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not services.actif():
            return Response({'detail': "Le Concierge n'est pas encore activé."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        conversation = ConversationModel.objects.filter(pk=pk, utilisateur=request.user).first()
        if not conversation:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        texte = str(request.data.get('texte', '')).strip()
        if not texte:
            return Response({'texte': ['Écrivez votre message.']}, status=status.HTTP_400_BAD_REQUEST)
        if len(texte) > LONGUEUR_MAX:
            return Response({'texte': [f'{LONGUEUR_MAX} caractères maximum.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            services.verifier_quota(request.user)
        except services.ConciergeErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        reponse = StreamingHttpResponse(services.repondre(conversation, texte), content_type='text/event-stream')
        reponse['Cache-Control'] = 'no-cache'
        reponse['X-Accel-Buffering'] = 'no'  # pas de mise en tampon derrière nginx
        return reponse
