from rest_framework import serializers
from datetime import timedelta

from django.utils import timezone

from apps.securite import coordonnees
from apps.securite.images import MESSAGE as IMAGE_REFUSEE, url_image_autorisee

from .models import BlocageModel, HebergementModel

AMENITIES = ['piscine', 'wifi', 'clim', 'parking', 'cuisine', 'jardin', 'gym', 'spa']


class HebergementSerializer(serializers.ModelSerializer):
    host_id = serializers.UUIDField(source='host.id', read_only=True)
    host_name = serializers.SerializerMethodField()
    hote_verifie = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    motif_refus = serializers.SerializerMethodField()

    class Meta:
        model = HebergementModel
        fields = [
            'id', 'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'rating', 'review_count', 'image_url', 'images',
            'max_guests', 'amenities', 'is_available', 'host_id', 'host_name', 'hote_verifie',
            'is_favorite', 'created_at', 'statut_verification', 'verifiee_le', 'motif_refus',
            'surface_m2', 'chambres', 'salles_de_bain', 'lits_doubles', 'lits_simples', 'canapes_lits',
            'petit_dejeuner', 'petit_dejeuner_prix', 'arrivee_a_partir', 'depart_avant',
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'host_id', 'created_at', 'statut_verification', 'verifiee_le']

    def to_representation(self, instance):
        donnees = super().to_representation(instance)
        # Annonces publiées avant le filtrage : coordonnées masquées pour les voyageurs (l'hôte voit son texte)
        if not self.context.get('proprietaire'):
            for champ in ('name', 'description', 'location'):
                if donnees.get(champ):
                    donnees[champ] = coordonnees.analyser(donnees[champ])[0]
        return donnees

    def get_host_name(self, obj):
        return f"{obj.host.first_name} {obj.host.last_name}".strip()

    def get_hote_verifie(self, obj):
        # Badge « Hôte vérifié » : pièce d'identité contrôlée par Kwa-Ba
        piece = getattr(obj.host, 'piece_identite', None)
        return bool(piece and piece.statut == 'verifiee')

    def get_motif_refus(self, obj):
        # Message de l'agent destiné à l'hôte : jamais montré aux voyageurs
        return obj.motif_refus if self.context.get('proprietaire') else ''

    def get_is_favorite(self, obj):
        favorite_ids = self.context.get('favorite_ids')
        if favorite_ids is None:
            return False
        return obj.id in favorite_ids


class HebergementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = HebergementModel
        fields = [
            'name', 'description', 'type', 'city', 'location',
            'price_per_night', 'image_url', 'images', 'max_guests',
            'amenities', 'is_available',
            'surface_m2', 'chambres', 'salles_de_bain', 'lits_doubles', 'lits_simples', 'canapes_lits',
            'petit_dejeuner', 'petit_dejeuner_prix', 'arrivee_a_partir', 'depart_avant',
        ]
        extra_kwargs = {
            'surface_m2': {'min_value': 5, 'max_value': 100000},
            'chambres': {'max_value': 200},
            'salles_de_bain': {'max_value': 200},
            'lits_doubles': {'max_value': 200},
            'lits_simples': {'max_value': 200},
            'canapes_lits': {'max_value': 200},
            'petit_dejeuner_prix': {'min_value': 0, 'max_value': 1000000},
        }

    # Exigés à la création ; une annonce publiée avant leur ajout peut être modifiée sans eux
    DETAILS_OBLIGATOIRES = {
        'surface_m2': "Indiquez la surface en m².",
        'chambres': "Indiquez le nombre de chambres.",
        'petit_dejeuner': "Indiquez si le petit-déjeuner est inclus, en option ou non proposé.",
    }

    def validate(self, data):
        if not self.partial:
            manquants = {k: [m] for k, m in self.DETAILS_OBLIGATOIRES.items() if data.get(k) in (None, '')}
            if not any(data.get(k) for k in ('lits_doubles', 'lits_simples', 'canapes_lits')):
                manquants['lits'] = ["Indiquez au moins un lit."]
            if manquants:
                raise serializers.ValidationError(manquants)
        formule = data.get('petit_dejeuner', getattr(self.instance, 'petit_dejeuner', ''))
        if formule == 'option' and not data.get('petit_dejeuner_prix', getattr(self.instance, 'petit_dejeuner_prix', None)):
            raise serializers.ValidationError({'petit_dejeuner_prix': ["Indiquez le prix du petit-déjeuner par personne."]})
        if formule != 'option' and 'petit_dejeuner' in data:
            data['petit_dejeuner_prix'] = None
        return data

    COORDONNEES_REFUSEES = ("Les coordonnées (téléphone, email, site, réseaux sociaux) ne sont pas autorisées dans l'annonce : "
                            "les voyageurs vous écrivent par la messagerie Kwa-Ba.")

    def _sans_coordonnees(self, value):
        """Anti-contournement : aucun moyen de joindre l'hôte en dehors du site. Les éléments trouvés sont gardés
        pour l'alerte du back-office (signalée par la vue)."""
        _, trouvailles = coordonnees.analyser(value or '')
        if coordonnees.masquees(trouvailles):
            self.trouvailles = getattr(self, 'trouvailles', []) + trouvailles
            raise serializers.ValidationError(self.COORDONNEES_REFUSEES)
        return value

    def validate_name(self, value):
        return self._sans_coordonnees(value)

    def validate_description(self, value):
        return self._sans_coordonnees(value)

    def validate_location(self, value):
        return self._sans_coordonnees(value)

    def validate_price_per_night(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le prix doit être supérieur à 0.")
        return value

    def validate_max_guests(self, value):
        # À 0, plus aucune réservation n'est possible (au moins 1 voyageur par réservation)
        if value < 1:
            raise serializers.ValidationError("Le logement doit accueillir au moins 1 voyageur.")
        return value

    def validate_amenities(self, value):
        unknown = [a for a in value if a not in AMENITIES]
        if unknown:
            raise serializers.ValidationError(f"Équipements inconnus : {', '.join(unknown)}")
        return value

    def validate_image_url(self, value):
        if value and not url_image_autorisee(value):
            raise serializers.ValidationError(IMAGE_REFUSEE)
        return value

    def validate_images(self, value):
        if not isinstance(value, list) or not all(isinstance(u, str) for u in value):
            raise serializers.ValidationError("Liste d'URL attendue.")
        if not all(url_image_autorisee(u) for u in value):
            raise serializers.ValidationError(IMAGE_REFUSEE)
        return value[:10]


class BlocageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlocageModel
        fields = ['id', 'debut', 'fin', 'motif', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        today = timezone.localdate()
        if data['fin'] <= data['debut']:
            raise serializers.ValidationError({'fin': 'La fin doit être après le début.'})
        if data['debut'] < today:
            raise serializers.ValidationError({'debut': 'Impossible de bloquer des dates passées.'})
        if data['fin'] > today + timedelta(days=730):
            raise serializers.ValidationError({'fin': 'Le calendrier est limité à deux ans.'})
        return data


class RechercheSerializer(serializers.Serializer):
    """Paramètres de recherche dont une valeur invalide ferait échouer la requête SQL (500 au lieu de 400).

    Un paramètre vide est ignoré, comme un paramètre absent.
    """
    price_min = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    price_max = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)

    @classmethod
    def depuis(cls, query_params):
        return cls(data={nom: valeur for nom, valeur in query_params.items() if nom in cls._declared_fields and valeur})
