from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import FavoriModel
from .serializers import FavoriSerializer, FavoriCreateSerializer


class FavoriListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = FavoriModel.objects.filter(user=request.user).select_related('hebergement', 'hebergement__host')
        serializer = FavoriSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})

    def post(self, request):
        serializer = FavoriCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        hebergement = serializer.validated_data['hebergement']

        existing = FavoriModel.objects.filter(user=request.user, hebergement=hebergement).first()
        if existing:
            return Response(FavoriSerializer(existing).data, status=status.HTTP_200_OK)

        try:
            favori = FavoriModel.objects.create(user=request.user, hebergement=hebergement)
        except IntegrityError:
            favori = FavoriModel.objects.get(user=request.user, hebergement=hebergement)

        return Response(FavoriSerializer(favori).data, status=status.HTTP_201_CREATED)


class FavoriDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, hebergement_id):
        deleted, _ = FavoriModel.objects.filter(
            user=request.user, hebergement_id=hebergement_id
        ).delete()
        if not deleted:
            return Response({'detail': 'Favori introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
