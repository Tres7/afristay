from rest_framework import serializers
from .models import ConversationModel, MessageModel
from apps.hebergements.serializers import HebergementSerializer


class ParticipantSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, user):
        return user.avatar.url if user.avatar else None


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = MessageModel
        fields = ['id', 'conversation', 'sender_id', 'content', 'is_read', 'is_own', 'created_at']
        read_only_fields = ['id', 'conversation', 'sender_id', 'is_read', 'is_own', 'created_at']

    def get_is_own(self, message):
        request = self.context.get('request')
        return bool(request and request.user.id == message.sender_id)


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageModel
        fields = ['content']

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value


class ConversationSerializer(serializers.ModelSerializer):
    hebergement_detail = HebergementSerializer(source='hebergement', read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ConversationModel
        fields = [
            'id', 'hebergement_detail', 'other_participant',
            'last_message', 'last_message_at', 'unread_count', 'created_at',
        ]

    def _last_message(self, conversation):
        return conversation.messages.order_by('-created_at').first()

    def get_other_participant(self, conversation):
        request = self.context.get('request')
        other = conversation.other_participant(request.user)
        return ParticipantSerializer(other).data

    def get_last_message(self, conversation):
        last = self._last_message(conversation)
        return last.content if last else None

    def get_last_message_at(self, conversation):
        last = self._last_message(conversation)
        return last.created_at if last else conversation.created_at

    def get_unread_count(self, conversation):
        request = self.context.get('request')
        return conversation.messages.filter(is_read=False).exclude(sender=request.user).count()


class ConversationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationModel
        fields = ['hebergement']

    def validate_hebergement(self, hebergement):
        request = self.context.get('request')
        if hebergement.host_id == request.user.id:
            raise serializers.ValidationError("Vous ne pouvez pas démarrer une conversation sur votre propre hébergement.")
        return hebergement
