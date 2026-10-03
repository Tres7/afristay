# validation of json, deserialization et serialization
from rest_framework import serializers
from apps.users.domain.entities.User import UserRole


class RegisterSerializer(serializers.Serializer):
    email      = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name  = serializers.CharField(max_length=150)
    password   = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)
    role       = serializers.ChoiceField(choices=[r.value for r in UserRole])
    phone      = serializers.CharField(max_length=20, required=False, allow_null=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        return data


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)
