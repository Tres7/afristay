from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, Min, ProtectedError, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from .disponibilites import a_des_reservations, filtre_actives, periodes_indisponibles, verrouiller
from .models import BlocageModel, HebergementModel, HebergementPhotoModel
from .photos import InvalidPhoto, normalize_photo
from .serializers import BlocageSerializer, HebergementSerializer, HebergementCreateSerializer

HOST_ROLES = ('hote', 'admin')
MAX_FENETRE_JOURS = 548  # 18 mois de calendrier par requête


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
                filtre_actives('reservations__'),
                reservations__check_in__lt=check_out,
                reservations__check_out__gt=check_in,
            ).values('id')
            fermes = BlocageModel.objects.filter(debut__lt=check_out, fin__gt=check_in).values('hebergement_id')
            qs = qs.exclude(id__in=busy).exclude(id__in=fermes)

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
        try:
            obj.delete()
        except ProtectedError:
            return Response(
                {'detail': "Cette annonce a des réservations payées : elle ne peut pas être supprimée. Masquez-la plutôt."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhotoUploadView(APIView):
    """POST multipart (champ « file ») : enregistre une photo normalisée et renvoie son URL publique."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'hebergement_photo_upload'

    def post(self, request):
        if request.user.role not in HOST_ROLES:
            return Response({'detail': 'Seuls les hôtes peuvent envoyer des photos.'}, status=status.HTTP_403_FORBIDDEN)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'file': ['Aucun fichier reçu.']}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content, width, height = normalize_photo(uploaded)
        except InvalidPhoto as e:
            return Response({'file': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        photo = HebergementPhotoModel(owner=request.user, width=width, height=height)
        photo.image.save('photo.jpg', content, save=False)
        photo.save()
        return Response(_photo_json(request, photo), status=status.HTTP_201_CREATED)


class PhotoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        photo = HebergementPhotoModel.objects.filter(pk=pk, owner=request.user).first()
        if not photo:
            return Response({'detail': 'Photo introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        photo.image.delete(save=False)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _photo_json(request, photo):
    return {
        'id': str(photo.id),
        'url': request.build_absolute_uri(photo.image.url),
        'width': photo.width,
        'height': photo.height,
    }


def _parse_date(value, defaut):
    if not value:
        return defaut
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


class DisponibiliteView(APIView):
    """GET ?debut=&fin= : périodes indisponibles. L'hôte du logement reçoit le détail (réservations, blocages)."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        hebergement = HebergementModel.objects.filter(pk=pk).only('id', 'host_id').first()
        if not hebergement:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.localdate()
        debut = _parse_date(request.query_params.get('debut'), today)
        fin = _parse_date(request.query_params.get('fin'), today + timedelta(days=365))
        if not debut or not fin or fin <= debut:
            return Response({'detail': 'Période invalide (format AAAA-MM-JJ).'}, status=status.HTTP_400_BAD_REQUEST)
        if (fin - debut).days > MAX_FENETRE_JOURS:
            return Response({'detail': f'Période limitée à {MAX_FENETRE_JOURS} jours.'}, status=status.HTTP_400_BAD_REQUEST)

        est_hote = request.user.is_authenticated and request.user.id == hebergement.host_id
        return Response({
            'debut': debut,
            'fin': fin,
            'periodes': periodes_indisponibles(hebergement.id, debut, fin, detail=est_hote),
        })


class BlocageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        hebergement = HebergementModel.objects.filter(pk=pk).first()
        if not hebergement:
            return Response({'detail': 'Hébergement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if hebergement.host_id != request.user.id:
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = BlocageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        debut, fin = serializer.validated_data['debut'], serializer.validated_data['fin']

        with transaction.atomic():
            # Verrou du logement : une réservation simultanée ne peut pas prendre ces nuits pendant la fermeture
            verrouiller(hebergement.id)
            # On ne ferme pas des nuits déjà réservées : l'hôte doit d'abord gérer la réservation
            if a_des_reservations(hebergement.id, debut, fin):
                return Response(
                    {'detail': 'Cette période contient une réservation. Contactez le voyageur avant de fermer ces dates.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if BlocageModel.objects.filter(hebergement=hebergement, debut__lt=fin, fin__gt=debut).exists():
                return Response({'detail': 'Une partie de ces dates est déjà fermée.'}, status=status.HTTP_409_CONFLICT)
            blocage = serializer.save(hebergement=hebergement)
        return Response(BlocageSerializer(blocage).data, status=status.HTTP_201_CREATED)


class BlocageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        blocage = BlocageModel.objects.filter(pk=pk, hebergement__host=request.user).first()
        if not blocage:
            return Response({'detail': 'Blocage introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        blocage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
