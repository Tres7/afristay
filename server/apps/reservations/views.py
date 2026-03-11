from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ReservationModel
from .serializers import ReservationSerializer, ReservationCreateSerializer


class ReservationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ReservationModel.objects.filter(guest=request.user).select_related('hebergement')
        serializer = ReservationSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})

    def post(self, request):
        serializer = ReservationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        reservation = serializer.save(guest=request.user)
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)


class ReservationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, pk, user):
        try:
            return ReservationModel.objects.select_related('hebergement').get(pk=pk, guest=user)
        except ReservationModel.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk, request.user)
        if not obj:
            return Response({'detail': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReservationSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get_object(pk, request.user)
        if not obj:
            return Response({'detail': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if obj.status == 'confirmed':
            obj.status = 'cancelled'
            obj.save(update_fields=['status'])
            return Response({'detail': 'Réservation annulée.'})
        return Response({'detail': 'Cette réservation ne peut pas être annulée.'}, status=status.HTTP_400_BAD_REQUEST)
