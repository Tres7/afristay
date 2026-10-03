from django.db.models import Count, Min, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly, IsAuthenticated

from .models import HebergementModel
from .serializers import HebergementSerializer, HebergementCreateSerializer

HOST_ROLES = ('hote', 'admin')


def _context(request):
    """Ajoute les ids favoris de l'utilisateur connecté pour calculer is_favorite."""
    if request.user and request.user.is_authenticated:
        from apps.favoris.models import FavoriModel
        ids = set(FavoriModel.objects.filter(user=request.user).values_list('hebergement_id', flat=True))
        return {'request': request, 'favorite_ids': ids}
    return {'request': request}


class HebergementListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = HebergementModel.objects.filter(is_available=True).select_related('host')

        city = request.query_params.get('city')
        if city:
            qs = qs.filter(Q(city__icontains=city) | Q(location__icontains=city))

        type_ = request.query_params.get('type')
        if type_:
            qs = qs.filter(type=type_)

        price_min = request.query_params.get('price_min')
        if price_min:
            qs = qs.filter(price_per_night__gte=price_min)

        price_max = request.query_params.get('price_max')
        if price_max:
            qs = qs.filter(price_per_night__lte=price_max)

        guests = request.query_params.get('guests')
        if guests and guests.isdigit():
            qs = qs.filter(max_guests__gte=int(guests))

        search = request.query_params.get('q')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(city__icontains=search) | Q(location__icontains=search))

        # Exclut les logements déjà réservés sur la période demandée
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')
        if check_in and check_out:
            busy = HebergementModel.objects.filter(
                reservations__status__in=['pending', 'confirmed'],
                reservations__check_in__lt=check_out,
                reservations__check_out__gt=check_in,
            ).values('id')
            qs = qs.exclude(id__in=busy)

        sort = request.query_params.get('sort')
        if sort == 'prix_asc':
            qs = qs.order_by('price_per_night')
        elif sort == 'prix_desc':
            qs = qs.order_by('-price_per_night')
        elif sort == 'note':
            qs = qs.order_by('-rating')

        limit = request.query_params.get('limit')
        if limit and limit.isdigit():
            qs = qs[:int(limit)]

        serializer = HebergementSerializer(qs, many=True, context=_context(request))
        return Response({'results': serializer.data, 'count': len(serializer.data)})

    def post(self, request):
        if request.user.role not in HOST_ROLES:
            return Response(
                {'detail': 'Seuls les hôtes peuvent publier un hébergement.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = HebergementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        hebergement = serializer.save(host=request.user)
        return Response(
            HebergementSerializer(hebergement, context=_context(request)).data,
            status=status.HTTP_201_CREATED,
        )


class MyHebergementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = HebergementModel.objects.filter(host=request.user).select_related('host')
        serializer = HebergementSerializer(qs, many=True, context=_context(request))
        return Response({'results': serializer.data, 'count': len(serializer.data)})


class CityListView(APIView):
    """Destinations populaires : villes avec leur nombre d'hébergements disponibles."""
    permission_classes = [AllowAny]

    def get(self, request):
        rows = (
            HebergementModel.objects.filter(is_available=True)
            .values('city')
            .annotate(count=Count('id'), min_price=Min('price_per_night'))
            .order_by('-count', 'city')[:8]
        )
        results = []
        for row in rows:
            cover = (
                HebergementModel.objects.filter(city=row['city'], is_available=True)
                .exclude(image_url='')
                .order_by('-rating')
                .values_list('image_url', flat=True)
                .first()
            )
            results.append({**row, 'image_url': cover or ''})
        return Response({'results': results})


class HebergementDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_object(self, pk):
        try:
            return HebergementModel.objects.select_related('host').get(pk=pk)
        except HebergementModel.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(HebergementSerializer(obj, context=_context(request)).data)

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
        return Response(HebergementSerializer(obj, context=_context(request)).data)

    def delete(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if obj.host_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
