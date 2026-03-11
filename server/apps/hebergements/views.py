from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated

from .models import HebergementModel
from .serializers import HebergementSerializer, HebergementCreateSerializer


class HebergementListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = HebergementModel.objects.filter(is_available=True)

        city = request.query_params.get('city')
        if city:
            qs = qs.filter(city__icontains=city)

        type_ = request.query_params.get('type')
        if type_:
            qs = qs.filter(type=type_)

        price_min = request.query_params.get('price_min')
        if price_min:
            qs = qs.filter(price_per_night__gte=price_min)

        price_max = request.query_params.get('price_max')
        if price_max:
            qs = qs.filter(price_per_night__lte=price_max)

        sort = request.query_params.get('sort')
        if sort == 'prix_asc':
            qs = qs.order_by('price_per_night')
        elif sort == 'prix_desc':
            qs = qs.order_by('-price_per_night')
        elif sort == 'note':
            qs = qs.order_by('-rating')

        search = request.query_params.get('q')
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(city__icontains=search)

        serializer = HebergementSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = HebergementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        hebergement = serializer.save(host=request.user)
        return Response(HebergementSerializer(hebergement).data, status=status.HTTP_201_CREATED)


class HebergementDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_object(self, pk):
        try:
            return HebergementModel.objects.get(pk=pk)
        except HebergementModel.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(HebergementSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if obj.host_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = HebergementCreateSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(HebergementSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if obj.host_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
