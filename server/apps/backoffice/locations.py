"""Back-office : location de voiture (règles, catégories et prix, lieux de remise, loueurs, suivi des locations)."""
from django.db import transaction
from django.db.models import Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.locations import services
from apps.locations.models import (
    CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel, PartenaireLocationModel,
    PhotoVehiculeModel,
)
from apps.paiements.operateurs import operateurs_du_pays
from apps.securite.audit import journaliser
from apps.securite.permissions import EstAdministrateur

from .commun import ChampPhoto, FicheAdmin, ListeAdmin
from .views import _motif, _nom, _paginer


# --- Règles (une seule ligne) ------------------------------------------------------------------

class ParametresSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametresLocationModel
        fields = ['commission_pourcent', 'delai_min_jours', 'duree_max_jours', 'annulation_gratuite_heures', 'conditions']


class ParametresView(APIView):
    """GET : règles en vigueur (null tant qu'elles n'existent pas : la location n'est alors pas proposée). PUT : les fixer."""
    permission_classes = [EstAdministrateur]

    def get(self, request):
        params = ParametresLocationModel.objects.first()
        return Response(ParametresSerializer(params).data if params else None)

    def put(self, request):
        params = ParametresLocationModel.objects.first()
        serializer = ParametresSerializer(params, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="regles_location",
                    champs=sorted(request.data.keys()))
        return Response(serializer.data)


# --- Référentiels --------------------------------------------------------------------------------

class PhotoVehiculeSerializer(serializers.ModelSerializer):
    url = ChampPhoto(source='image', read_only=True)

    class Meta:
        model = PhotoVehiculeModel
        fields = ['id', 'url']


class CategorieSerializer(serializers.ModelSerializer):
    # Photos gérées une par une (PhotosCategorieView) : plusieurs photos dans une seule requête dépasseraient
    # la taille maximale acceptée par nginx
    photos = PhotoVehiculeSerializer(many=True, read_only=True)

    class Meta:
        model = CategorieVehiculeModel
        fields = ['id', 'nom', 'gamme', 'exemple_modele', 'description', 'places', 'bagages', 'boite', 'carburant',
                  'climatisation', 'photos', 'prix_jour_sans_chauffeur', 'prix_jour_avec_chauffeur', 'caution', 'actif', 'ordre']

    def validate(self, data):
        sans = data.get('prix_jour_sans_chauffeur', getattr(self.instance, 'prix_jour_sans_chauffeur', None))
        avec = data.get('prix_jour_avec_chauffeur', getattr(self.instance, 'prix_jour_avec_chauffeur', None))
        actif = data.get('actif', getattr(self.instance, 'actif', False))
        if actif and not sans and not avec:
            raise serializers.ValidationError({'actif': ["Indiquez au moins un prix par jour avant d'activer la catégorie."]})
        return data


class CategoriesView(ListeAdmin):
    nom_objet = "categorie_vehicule"
    serializer_class = CategorieSerializer
    queryset = CategorieVehiculeModel.objects.prefetch_related('photos').order_by('ordre', 'nom')


class CategorieView(FicheAdmin):
    nom_objet = "categorie_vehicule"
    serializer_class = CategorieSerializer
    queryset = CategorieVehiculeModel.objects.prefetch_related('photos')


class AjoutPhotoSerializer(serializers.Serializer):
    image = ChampPhoto()


def _photos(request, categorie):
    return PhotoVehiculeSerializer(categorie.photos.all(), many=True, context={'request': request}).data


def _journal_photos(request, categorie, **details):
    journaliser("backoffice_modification", request, utilisateur=request.user, objet="categorie_vehicule",
                id=str(categorie.pk), libelle=str(categorie), champs=['photos'], **details)


class PhotosCategorieView(APIView):
    """POST {image} (multipart) : ajoute une photo à la fin (MAX_PAR_CATEGORIE au plus). Renvoie toutes les photos."""
    permission_classes = [EstAdministrateur]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        categorie = get_object_or_404(CategorieVehiculeModel, pk=pk)
        if categorie.photos.count() >= PhotoVehiculeModel.MAX_PAR_CATEGORIE:
            return Response({'detail': f"{PhotoVehiculeModel.MAX_PAR_CATEGORIE} photos au maximum par catégorie."},
                            status=status.HTTP_400_BAD_REQUEST)
        donnees = AjoutPhotoSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        dernier = categorie.photos.aggregate(m=Max('ordre'))['m']
        photo = PhotoVehiculeModel.objects.create(categorie=categorie, image=donnees.validated_data['image'],
                                                  ordre=0 if dernier is None else dernier + 1)
        _journal_photos(request, categorie, photo_ajoutee=photo.pk)
        return Response(_photos(request, categorie), status=status.HTTP_201_CREATED)


class PhotoCategorieView(APIView):
    """PATCH {principale: true} : la photo passe en premier. DELETE : la retire. Renvoie toutes les photos."""
    permission_classes = [EstAdministrateur]

    def _photo(self, pk, photo_id):
        return get_object_or_404(PhotoVehiculeModel.objects.select_related('categorie'), pk=photo_id, categorie_id=pk)

    def patch(self, request, pk, photo_id):
        photo = self._photo(pk, photo_id)
        if request.data.get('principale') is True:
            with transaction.atomic():
                autres = [p for p in photo.categorie.photos.select_for_update() if p.pk != photo.pk]
                for i, p in enumerate([photo, *autres]):
                    if p.ordre != i:
                        p.ordre = i
                        p.save(update_fields=['ordre'])
            _journal_photos(request, photo.categorie, photo_principale=photo.pk)
        return Response(_photos(request, photo.categorie))

    def delete(self, request, pk, photo_id):
        photo = self._photo(pk, photo_id)
        categorie, fichier = photo.categorie, photo.image
        photo.delete()
        fichier.delete(save=False)
        _journal_photos(request, categorie, photo_retiree=photo_id)
        return Response(_photos(request, categorie))


class LieuSerializer(serializers.ModelSerializer):
    class Meta:
        model = LieuRemiseModel
        fields = ['id', 'nom', 'ville', 'fuseau', 'adresse_requise', 'frais', 'actif', 'ordre']


class LieuxView(ListeAdmin):
    nom_objet = "lieu_remise"
    serializer_class = LieuSerializer
    queryset = LieuRemiseModel.objects.order_by('ordre', 'nom')


class LieuView(FicheAdmin):
    nom_objet = "lieu_remise"
    serializer_class = LieuSerializer
    queryset = LieuRemiseModel.objects.all()


class PartenaireSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many=True, queryset=CategorieVehiculeModel.objects.all())
    lieux = serializers.PrimaryKeyRelatedField(many=True, queryset=LieuRemiseModel.objects.all())
    nb_locations = serializers.IntegerField(source='locations.count', read_only=True)

    class Meta:
        model = PartenaireLocationModel
        fields = ['id', 'nom', 'contact', 'telephone', 'email', 'categories', 'lieux', 'actif', 'pays_versement',
                  'operateur_versement', 'numero_versement', 'nb_locations']

    def validate(self, data):
        pays = data.get('pays_versement', getattr(self.instance, 'pays_versement', ''))
        operateur = data.get('operateur_versement', getattr(self.instance, 'operateur_versement', ''))
        if operateur not in operateurs_du_pays(pays):
            raise serializers.ValidationError({'operateur_versement': ["Cet opérateur n'existe pas dans ce pays."]})
        return data


class PartenairesView(ListeAdmin):
    nom_objet = "loueur"
    serializer_class = PartenaireSerializer
    queryset = PartenaireLocationModel.objects.prefetch_related('categories', 'lieux').order_by('nom')


class PartenaireView(FicheAdmin):
    nom_objet = "loueur"
    serializer_class = PartenaireSerializer
    queryset = PartenaireLocationModel.objects.all()


# --- Suivi des locations -------------------------------------------------------------------------

def _location(loc: LocationModel) -> dict:
    return {
        'id': str(loc.id), 'reference': loc.reference, 'statut': loc.statut, 'statut_libelle': loc.get_statut_display(),
        'voyageur': {'nom': _nom(loc.voyageur), 'email': loc.voyageur.email}, 'telephone': loc.telephone,
        'categorie': loc.categorie.nom, 'formule': loc.formule, 'formule_libelle': loc.get_formule_display(),
        'lieu_prise': loc.lieu_prise.nom, 'adresse_prise': loc.adresse_prise,
        'lieu_retour': loc.lieu_retour.nom, 'adresse_retour': loc.adresse_retour,
        'debut': loc.debut, 'fin': loc.fin, 'jours': loc.jours, 'passagers': loc.passagers,
        'prix': loc.prix, 'caution': loc.caution, 'precisions': loc.precisions,
        'conducteur': loc.conducteur, 'permis_numero': loc.permis_numero, 'permis_pays': loc.permis_pays,
        'partenaire': {'id': loc.partenaire_id, 'nom': loc.partenaire.nom} if loc.partenaire_id else None,
        'vehicule': loc.vehicule, 'immatriculation': loc.immatriculation,
        'chauffeur_nom': loc.chauffeur_nom, 'chauffeur_telephone': loc.chauffeur_telephone,
        'cree_le': loc.cree_le,
    }


def _locations():
    return LocationModel.objects.select_related('voyageur', 'categorie', 'lieu_prise', 'lieu_retour', 'partenaire')


class LocationsView(APIView):
    """Locations, les prochaines prises d'abord. Filtres : statut, q (référence, email, téléphone, conducteur)."""
    permission_classes = [EstAdministrateur]

    def get(self, request):
        qs = _locations().order_by('debut')
        if (statut := request.query_params.get('statut')) in dict(LocationModel.STATUTS):
            qs = qs.filter(statut=statut)
        if q := request.query_params.get('q', '').strip():
            filtre = Q(voyageur__email__icontains=q) | Q(telephone__icontains=q) | Q(conducteur__icontains=q)
            if len(q.split('-')[-1]) >= 4:
                filtre |= Q(id__istartswith=q.split('-')[-1])
            qs = qs.filter(filtre)
        return _paginer(request, qs, _location)


class LocationPartenairesView(APIView):
    """Loueurs qui proposent cette catégorie à ce lieu de remise."""
    permission_classes = [EstAdministrateur]

    def get(self, request, pk):
        loc = _locations().filter(pk=pk).first()
        if not loc:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response([{'id': p.id, 'nom': p.nom, 'telephone': p.telephone} for p in services.partenaires_disponibles(loc)])


class AttributionSerializer(serializers.Serializer):
    partenaire = serializers.PrimaryKeyRelatedField(queryset=PartenaireLocationModel.objects.filter(actif=True))
    vehicule = serializers.CharField(max_length=120)
    immatriculation = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    chauffeur_nom = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    chauffeur_telephone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')


class LocationAttribuerView(APIView):
    """Attribue le loueur et le véhicule (et le chauffeur) : le voyageur reçoit leurs coordonnées."""
    permission_classes = [EstAdministrateur]

    def post(self, request, pk):
        loc = _locations().filter(pk=pk).first()
        if not loc:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        donnees = AttributionSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        d = dict(donnees.validated_data)
        partenaire = d.pop('partenaire')
        if not services.partenaires_disponibles(loc).filter(pk=partenaire.pk).exists():
            return Response({'partenaire': ["Ce loueur ne propose pas cette catégorie à ce lieu de remise."]},
                            status=status.HTTP_400_BAD_REQUEST)
        if loc.formule == 'avec_chauffeur' and not (d['chauffeur_nom'] and d['chauffeur_telephone']):
            return Response({'chauffeur_nom': ["Formule avec chauffeur : indiquez le nom et le téléphone du chauffeur."]},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            services.assigner_partenaire(loc, partenaire, **d)
        except services.LocationErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="location",
                    id=str(loc.pk), libelle=loc.reference, partenaire=partenaire.nom)
        return Response(_location(_locations().get(pk=pk)))


class LocationAnnulerView(APIView):
    """Annulation par Kwa-Ba : remboursement intégral du voyageur (aucun loueur disponible, par exemple)."""
    permission_classes = [EstAdministrateur]

    def post(self, request, pk):
        motif, erreur = _motif(request.data.get('motif'))
        if erreur:
            return erreur
        loc = _locations().filter(pk=pk).first()
        if not loc:
            return Response({'detail': 'Location introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            rembourse = services.annuler(loc, par='plateforme')
        except services.LocationErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="location", id=str(loc.pk),
                    libelle=loc.reference, operation="annulation", rembourse=rembourse, motif=motif)
        return Response(_location(_locations().get(pk=pk)))
