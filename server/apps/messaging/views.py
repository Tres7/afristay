from django.db import IntegrityError
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ConversationModel
from .serializers import (
    ConversationSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
    MessageCreateSerializer,
)


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ConversationModel.objects.filter(
            Q(guest=request.user) | Q(host=request.user)
        ).select_related('hebergement', 'hebergement__host', 'guest', 'host')
        serializer = ConversationSerializer(qs, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': qs.count()})

    def post(self, request):
        serializer = ConversationCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        hebergement = serializer.validated_data['hebergement']

        existing = ConversationModel.objects.filter(
            guest=request.user, host=hebergement.host, hebergement=hebergement
        ).first()
        if existing:
            return Response(
                ConversationSerializer(existing, context={'request': request}).data,
                status=status.HTTP_200_OK,
            )

        try:
            conversation = ConversationModel.objects.create(
                guest=request.user, host=hebergement.host, hebergement=hebergement
            )
        except IntegrityError:
            conversation = ConversationModel.objects.get(
                guest=request.user, host=hebergement.host, hebergement=hebergement
            )

        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_conversation(self, pk, user):
        try:
            conversation = ConversationModel.objects.get(pk=pk)
        except ConversationModel.DoesNotExist:
            return None
        if user.id not in (conversation.guest_id, conversation.host_id):
            return None
        return conversation

    def get(self, request, pk):
        conversation = self._get_conversation(pk, request.user)
        if not conversation:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        messages = conversation.messages.select_related('sender')
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response({'results': serializer.data, 'count': messages.count()})

    def post(self, request, pk):
        conversation = self._get_conversation(pk, request.user)
        if not conversation:
            return Response({'detail': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = serializer.save(conversation=conversation, sender=request.user)
        conversation.save(update_fields=['updated_at'])

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )
