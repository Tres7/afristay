from datetime import datetime

from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.paiements import services as paiements
from apps.paiements.views import CompteRemboursementSerializer
from apps.reservations.models import ReservationModel

from . import services
from .models import CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel


def _photos(request, categorie) -> list[str]:
    # La photo principale d'abord (ordre du modèle) ; prefetch_related('photos') évite une requête par catégorie
    return [request.build_absolute_uri(p.image.url) for p in categorie.photos.all()]


def _categorie_json(request, c: CategorieVehiculeModel) -> dict:
    photos = _photos(request, c)
    return {
        'id': c.id, 'nom': c.nom, 'gamme': c.gamme, 'gamme_libelle': c.get_gamme_display(),
        'exemple_modele': c.exemple_modele, 'description': c.description, 'places': c.places, 'bagages': c.bagages,
        'boite': c.boite, 'carburant': c.carburant, 'climatisation': c.climatisation, 'image': photos[0] if photos else None,
        'photos': photos,
        'prix_jour': {'sans_chauffeur': c.prix_jour_sans_chauffeur, 'avec_chauffeur': c.prix_jour_avec_chauffeur},
        'caution': c.caution,
    }


def _lieu_json(lieu: LieuRemiseModel) -> dict:
    return {'id': lieu.id, 'nom': lieu.nom, 'ville': lieu.ville, 'adresse_requise': lieu.adresse_requise,
            'frais': lieu.frais, 'fuseau': lieu.fuseau}


class CatalogueView(APIView):
    """Ce que la page de location affiche : catégories proposées, lieux, règles et valeurs des filtres."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        params = ParametresLocationModel.courants()
        if not services.active():
            return Response({'active': False})
        return Response({
            'active': True,
            'regles': {
                'delai_min_jours': params.delai_min_jours, 'duree_max_jours': params.duree_max_jours,
                'annulation_gratuite_heures': params.annulation_gratuite_heures, 'conditions': params.conditions,
            },
            'categories': [_categorie_json(request, c) for c in services.categories_proposees()],
            'lieux': [_lieu_json(lieu) for lieu in LieuRemiseModel.objects.filter(actif=True)],
            'filtres': {
                'gammes': [{'code': c, 'nom': n} for c, n in CategorieVehiculeModel.GAMMES],
                'boites': [{'code': c, 'nom': n} for c, n in CategorieVehiculeModel.BOITES],
                'carburants': [{'code': c, 'nom': n} for c, n in CategorieVehiculeModel.CARBURANTS],
            },
        })


def _heure(lieu, brut):
    try:
        return services.heure_locale(lieu, datetime.fromisoformat(str(brut)).replace(tzinfo=None))
    except (TypeError, ValueError):
        return None


class DevisView(APIView):
    """GET ?categorie=&formule=&lieu_prise=&lieu_retour=&debut=2026-12-02T10:00&fin=… → prix détaillé."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        params = ParametresLocationModel.courants()
        if not params or not services.active():
            return Response({'detail': "La location de voitures n'est pas encore disponible."}, status=status.HTTP_400_BAD_REQUEST)
        q = request.query_params
        categorie = services.categories_proposees().filter(pk=_entier(q.get('categorie'))).first()
        lieu_prise = LieuRemiseModel.objects.filter(pk=_entier(q.get('lieu_prise')), actif=True).first()
        lieu_retour = LieuRemiseModel.objects.filter(pk=_entier(q.get('lieu_retour')), actif=True).first() or lieu_prise
        if not categorie or not lieu_prise:
            return Response({'detail': 'Véhicule ou lieu inconnu.'}, status=status.HTTP_400_BAD_REQUEST)
        debut, fin = _heure(lieu_prise, q.get('debut')), _heure(lieu_prise, q.get('fin'))
        if not debut or not fin:
            return Response({'detail': 'Dates invalides.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            services.verifier_dates(params, debut, fin)
            devis = services.chiffrer(params, categorie, q.get('formule', ''), lieu_prise, lieu_retour, debut, fin)
        except services.LocationErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'jours': devis.jours, 'prix_jour': devis.prix_jour, 'frais_lieux': devis.frais_lieux,
                         'prix': devis.prix, 'caution': devis.caution})


def _entier(valeur):
    try:
        return int(valeur)
    except (TypeError, ValueError):
        return None


class LocationSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    categorie_detail = serializers.SerializerMethodField()
    lieu_prise_detail = serializers.SerializerMethodField()
    lieu_retour_detail = serializers.SerializerMethodField()
    debut_locale = serializers.SerializerMethodField()
    fin_locale = serializers.SerializerMethodField()
    partenaire = serializers.SerializerMethodField()
    paiement = serializers.SerializerMethodField()
    remboursement = serializers.SerializerMethodField()
    annulation_gratuite = serializers.SerializerMethodField()

    class Meta:
        model = LocationModel
        fields = [
            'id', 'reference', 'categorie', 'categorie_detail', 'formule', 'lieu_prise', 'lieu_prise_detail',
            'adresse_prise', 'lieu_retour', 'lieu_retour_detail', 'adresse_retour', 'debut', 'fin', 'debut_locale',
            'fin_locale', 'passagers', 'telephone', 'precisions', 'conducteur', 'permis_numero', 'permis_pays',
            'reservation', 'jours', 'prix_jour', 'frais_lieux', 'prix', 'caution', 'moyen', 'statut', 'expire_le',
            'annulee_par', 'partenaire', 'paiement', 'remboursement', 'annulation_gratuite', 'cree_le',
        ]

    def get_categorie_detail(self, obj):
        return _categorie_json(self.context['request'], obj.categorie)

    def get_lieu_prise_detail(self, obj):
        return _lieu_json(obj.lieu_prise)

    def get_lieu_retour_detail(self, obj):
        return _lieu_json(obj.lieu_retour)

    def get_debut_locale(self, obj):
        return obj.debut.astimezone(services.ZoneInfo(obj.lieu_prise.fuseau)).strftime('%Y-%m-%dT%H:%M')

    def get_fin_locale(self, obj):
        return obj.fin.astimezone(services.ZoneInfo(obj.lieu_retour.fuseau)).strftime('%Y-%m-%dT%H:%M')

    def get_partenaire(self, obj):
        # Coordonnées visibles par le voyageur une fois le loueur attribué
        p = obj.partenaire
        if not p or obj.statut not in ('partenaire_assigne', 'terminee'):
            return None
        return {'nom': p.nom, 'contact': p.contact, 'telephone': p.telephone, 'vehicule': obj.vehicule,
                'immatriculation': obj.immatriculation, 'chauffeur': obj.chauffeur_nom,
                'telephone_chauffeur': obj.chauffeur_telephone}

    def get_paiement(self, obj):
        dernier = max(obj.paiements.all(), key=lambda p: p.cree_le, default=None)
        return dernier.statut if dernier else None

    def get_remboursement(self, obj):
        lignes = list(obj.remboursements.all())
        if not lignes:
            return None
        if any(r.statut == 'attente_numero' for r in lignes):
            statut = 'attente_numero'
        else:
            statut = 'envoye' if all(r.statut == 'envoye' for r in lignes) else 'en_cours'
        return {'montant': sum(r.montant for r in lignes), 'statut': statut}

    def get_annulation_gratuite(self, obj):
        return services.annulation_gratuite(obj)


class LocationCreationSerializer(serializers.Serializer):
    categorie = serializers.PrimaryKeyRelatedField(queryset=CategorieVehiculeModel.objects.filter(actif=True))
    formule = serializers.ChoiceField(choices=LocationModel.FORMULES)
    lieu_prise = serializers.PrimaryKeyRelatedField(queryset=LieuRemiseModel.objects.filter(actif=True))
    adresse_prise = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    lieu_retour = serializers.PrimaryKeyRelatedField(queryset=LieuRemiseModel.objects.filter(actif=True))
    adresse_retour = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    debut = serializers.DateTimeField(help_text="Heure locale du lieu de remise, sans fuseau (ex. 2026-12-02T10:00)")
    fin = serializers.DateTimeField()
    passagers = serializers.IntegerField(min_value=1, max_value=50)
    telephone = serializers.RegexField(r'^\+?[\d\s]{8,20}$', error_messages={
        'invalid': "Indiquez un numéro joignable, avec l'indicatif (par ex. +228 90 00 00 00).",
    })
    precisions = serializers.CharField(min_length=15, max_length=2000, error_messages={
        'min_length': "Précisez votre besoin (trajets prévus, horaires, siège enfant…) : 15 caractères au moins.",
    })
    conducteur = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    permis_numero = serializers.CharField(max_length=40, required=False, allow_blank=True, default='')
    permis_pays = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    reservation = serializers.PrimaryKeyRelatedField(queryset=ReservationModel.objects.all(), required=False, allow_null=True)

    def validate_reservation(self, valeur):
        if valeur and valeur.guest_id != self.context['request'].user.id:
            raise serializers.ValidationError("Réservation introuvable.")
        return valeur

    def validate(self, data):
        # Heures saisies dans le fuseau des lieux de remise et de retour
        for champ, lieu in (('debut', data['lieu_prise']), ('fin', data['lieu_retour'])):
            valeur = data[champ]
            naive = timezone.make_naive(valeur) if timezone.is_aware(valeur) else valeur
            data[champ] = services.heure_locale(lieu, naive)
        return data


def _de_l_utilisateur(pk, user):
    return (LocationModel.objects.select_related('categorie', 'lieu_prise', 'lieu_retour', 'partenaire')
            .prefetch_related('paiements', 'remboursements', 'categorie__photos').filter(pk=pk, voyageur=user).first())


class LocationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (LocationModel.objects.filter(voyageur=request.user)
              .select_related('categorie', 'lieu_prise', 'lieu_retour', 'partenaire')
              .prefetch_related('paiements', 'remboursements', 'categorie__photos'))
        data = LocationSerializer(qs, many=True, context={'request': request}).data
        return Response({'results': data, 'count': len(data)})

    def post(self, request):
        serializer = LocationCreationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            location = services.creer(voyageur=request.user, **serializer.validated_data)
        except services.LocationErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(LocationSerializer(location, context={'request': request}).data, status=status.HTTP_201_CREATED)


class LocationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        location = _de_l_utilisateur(pk, request.user)
        if not location:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        # Page de retour après paiement : on relit la transaction chez le prestataire
        dernier = location.paiements.order_by('-cree_le').first()
        if dernier and dernier.statut == 'en_attente':
            paiements.synchroniser_paiement(dernier)
            location = _de_l_utilisateur(pk, request.user)
        return Response(LocationSerializer(location, context={'request': request}).data)

    def delete(self, request, pk):
        location = _de_l_utilisateur(pk, request.user)
        if not location:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            rembourse = services.annuler(location, par='voyageur')
        except services.LocationErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        numero_requis = location.remboursements.filter(statut='attente_numero').exists()
        return Response({'detail': 'Location annulée.', 'rembourse': rembourse, 'numero_requis': numero_requis})


class PayerLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        location = _de_l_utilisateur(pk, request.user)
        if not location:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            url = services.demarrer_paiement(location, request.data.get('moyen') or location.moyen)
        except paiements.PaiementErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'url': url})


class CompteRemboursementLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        location = _de_l_utilisateur(pk, request.user)
        if not location:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompteRemboursementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not paiements.indiquer_numero_remboursement(location, **serializer.validated_data):
            return Response({'detail': "Aucun remboursement n'attend de numéro pour cette location."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Numéro enregistré : le remboursement va être envoyé.'})
