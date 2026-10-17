"""Back-office : transferts aéroport (aéroports et tarifs, chauffeurs partenaires, suivi des transferts)."""
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.paiements.operateurs import operateurs_du_pays
from apps.securite.audit import journaliser
from apps.securite.permissions import EstAdministrateur
from apps.transferts import services
from apps.transferts.models import AeroportModel, ChauffeurModel, TarifTransfertModel, TransfertModel

from .commun import FicheAdmin, ListeAdmin
from .views import _motif, _nom, _paginer


# --- Aéroports et tarifs -------------------------------------------------------------------------

class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model = TarifTransfertModel
        fields = ['categorie', 'prix', 'actif']


class AeroportSerializer(serializers.ModelSerializer):
    tarifs = TarifSerializer(many=True, read_only=True)

    class Meta:
        model = AeroportModel
        fields = ['code', 'nom', 'ville', 'pays', 'fuseau', 'actif', 'tarifs']

    def validate_code(self, valeur):
        valeur = valeur.strip().upper()
        if len(valeur) != 3 or not valeur.isalpha():
            raise serializers.ValidationError("Code IATA : 3 lettres (par ex. LFW).")
        return valeur


class AeroportsView(ListeAdmin):
    nom_objet = "aeroport"
    serializer_class = AeroportSerializer
    queryset = AeroportModel.objects.prefetch_related('tarifs').order_by('ville')


class AeroportView(FicheAdmin):
    nom_objet = "aeroport"
    serializer_class = AeroportSerializer
    queryset = AeroportModel.objects.prefetch_related('tarifs')

    def get_serializer(self, *args, **kwargs):
        # Le code IATA identifie l'aéroport : il ne se modifie pas
        serializer = super().get_serializer(*args, **kwargs)
        serializer.fields['code'].read_only = True
        return serializer


class TarifsView(APIView):
    """PUT [{categorie, prix, actif}] : tarifs de l'aéroport par catégorie de véhicule (une ligne par catégorie)."""
    permission_classes = [EstAdministrateur]

    def put(self, request, code):
        aeroport = AeroportModel.objects.filter(pk=code).first()
        if not aeroport:
            return Response({'detail': 'Aéroport introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        tarifs = TarifSerializer(data=request.data, many=True)
        tarifs.is_valid(raise_exception=True)
        with transaction.atomic():
            for t in tarifs.validated_data:
                TarifTransfertModel.objects.update_or_create(aeroport=aeroport, categorie=t['categorie'],
                                                             defaults={'prix': t['prix'], 'actif': t['actif']})
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="tarifs_transfert", id=code,
                    tarifs={t['categorie']: t['prix'] for t in tarifs.validated_data})
        return Response(AeroportSerializer(AeroportModel.objects.prefetch_related('tarifs').get(pk=code)).data)


# --- Chauffeurs ----------------------------------------------------------------------------------

class ChauffeurSerializer(serializers.ModelSerializer):
    aeroports = serializers.PrimaryKeyRelatedField(many=True, queryset=AeroportModel.objects.all())
    nb_transferts = serializers.IntegerField(source='transferts.count', read_only=True)

    class Meta:
        model = ChauffeurModel
        fields = ['id', 'prenom', 'nom', 'telephone', 'email', 'aeroports', 'categorie', 'vehicule', 'immatriculation',
                  'actif', 'pays_versement', 'operateur_versement', 'numero_versement', 'nb_transferts']

    def validate(self, data):
        pays = data.get('pays_versement', getattr(self.instance, 'pays_versement', ''))
        operateur = data.get('operateur_versement', getattr(self.instance, 'operateur_versement', ''))
        if operateur not in operateurs_du_pays(pays):
            raise serializers.ValidationError({'operateur_versement': ["Cet opérateur n'existe pas dans ce pays."]})
        return data


class ChauffeursView(ListeAdmin):
    nom_objet = "chauffeur"
    serializer_class = ChauffeurSerializer
    queryset = ChauffeurModel.objects.prefetch_related('aeroports').order_by('prenom', 'nom')


class ChauffeurView(FicheAdmin):
    nom_objet = "chauffeur"
    serializer_class = ChauffeurSerializer
    queryset = ChauffeurModel.objects.all()


# --- Suivi des transferts ------------------------------------------------------------------------

def _transfert(t: TransfertModel) -> dict:
    c = t.chauffeur
    return {
        'id': str(t.id), 'reference': t.reference, 'statut': t.statut, 'statut_libelle': t.get_statut_display(),
        'voyageur': {'nom': _nom(t.voyageur), 'email': t.voyageur.email}, 'telephone': t.telephone,
        'aeroport': {'code': t.aeroport_id, 'ville': t.aeroport.ville}, 'arrivee': t.arrivee, 'numero_vol': t.numero_vol,
        'passagers': t.passagers, 'bagages': t.bagages, 'categorie': t.categorie, 'categorie_libelle': t.get_categorie_display(),
        'destination': t.destination, 'message': t.message, 'prix': t.prix, 'majoration_nuit': t.majoration_nuit,
        'chauffeur': {'id': c.id, 'nom': f"{c.prenom} {c.nom}", 'telephone': c.telephone, 'vehicule': c.vehicule} if c else None,
        'cree_le': t.cree_le,
    }


def _transferts():
    return TransfertModel.objects.select_related('voyageur', 'aeroport', 'chauffeur')


class TransfertsView(APIView):
    """Transferts, les prochaines arrivées d'abord. Filtres : statut, q (référence, email, téléphone, vol)."""
    permission_classes = [EstAdministrateur]

    def get(self, request):
        qs = _transferts().order_by('arrivee')
        if (statut := request.query_params.get('statut')) in dict(TransfertModel.STATUTS):
            qs = qs.filter(statut=statut)
        if q := request.query_params.get('q', '').strip():
            filtre = Q(voyageur__email__icontains=q) | Q(telephone__icontains=q) | Q(numero_vol__icontains=q)
            if len(q.split('-')[-1]) >= 4:
                filtre |= Q(id__istartswith=q.split('-')[-1])
            qs = qs.filter(filtre)
        return _paginer(request, qs, _transfert)


class TransfertChauffeursView(APIView):
    """Chauffeurs actifs de cet aéroport dont le véhicule convient."""
    permission_classes = [EstAdministrateur]

    def get(self, request, pk):
        t = _transferts().filter(pk=pk).first()
        if not t:
            return Response({'detail': 'Transfert introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response([{'id': c.id, 'nom': f"{c.prenom} {c.nom}", 'telephone': c.telephone, 'vehicule': c.vehicule}
                         for c in services.chauffeurs_disponibles(t)])


class TransfertAttribuerView(APIView):
    permission_classes = [EstAdministrateur]

    def post(self, request, pk):
        t = _transferts().filter(pk=pk).first()
        if not t:
            return Response({'detail': 'Transfert introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        chauffeur = services.chauffeurs_disponibles(t).filter(pk=request.data.get('chauffeur')).first()
        if not chauffeur:
            return Response({'chauffeur': ["Choisissez un chauffeur de cet aéroport dont le véhicule convient."]},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            services.assigner_chauffeur(t, chauffeur)
        except services.TransfertErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="transfert", id=str(t.pk),
                    libelle=t.reference, chauffeur=f"{chauffeur.prenom} {chauffeur.nom}")
        return Response(_transfert(_transferts().get(pk=pk)))


class TransfertAnnulerView(APIView):
    """Annulation par Kwa-Ba : remboursement intégral (aucun chauffeur disponible, vol annulé…)."""
    permission_classes = [EstAdministrateur]

    def post(self, request, pk):
        motif, erreur = _motif(request.data.get('motif'))
        if erreur:
            return erreur
        t = _transferts().filter(pk=pk).first()
        if not t:
            return Response({'detail': 'Transfert introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            rembourse = services.annuler(t, par='plateforme')
        except services.TransfertErreur as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        journaliser("backoffice_modification", request, utilisateur=request.user, objet="transfert", id=str(t.pk),
                    libelle=t.reference, operation="annulation", rembourse=rembourse, motif=motif)
        return Response(_transfert(_transferts().get(pk=pk)))

