from django.contrib import admin, messages

from . import services
from .models import (
    CategorieVehiculeModel, LieuRemiseModel, LocationModel, ParametresLocationModel, PartenaireLocationModel,
    VersementPartenaireModel,
)


@admin.register(ParametresLocationModel)
class ParametresAdmin(admin.ModelAdmin):
    """Une seule ligne : tant qu'elle n'existe pas, la location n'est pas proposée."""
    list_display = ['__str__', 'commission_pourcent', 'delai_min_jours', 'duree_max_jours', 'annulation_gratuite_heures']

    def has_add_permission(self, request):
        return not ParametresLocationModel.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CategorieVehiculeModel)
class CategorieAdmin(admin.ModelAdmin):
    """Prix et activation modifiables directement dans la liste. Sans aucun prix, la catégorie n'est pas proposée."""
    list_display = ['nom', 'gamme', 'places', 'boite', 'prix_jour_sans_chauffeur', 'prix_jour_avec_chauffeur', 'caution',
                    'actif', 'ordre']
    list_editable = ['prix_jour_sans_chauffeur', 'prix_jour_avec_chauffeur', 'caution', 'actif', 'ordre']
    list_filter = ['actif', 'gamme', 'boite']


@admin.register(LieuRemiseModel)
class LieuAdmin(admin.ModelAdmin):
    list_display = ['nom', 'ville', 'adresse_requise', 'frais', 'actif', 'ordre']
    list_editable = ['frais', 'actif', 'ordre']
    list_filter = ['actif', 'ville']


@admin.register(PartenaireLocationModel)
class PartenaireAdmin(admin.ModelAdmin):
    list_display = ['nom', 'contact', 'telephone', 'actif']
    list_filter = ['actif', 'lieux__ville']
    search_fields = ['nom', 'contact', 'telephone']
    filter_horizontal = ['categories', 'lieux']


@admin.register(LocationModel)
class LocationAdmin(admin.ModelAdmin):
    """Pour attribuer un loueur : ouvrir la location, choisir le loueur et le véhicule remis, enregistrer."""
    list_display = ['reference', 'categorie', 'formule', 'lieu_prise', 'debut', 'jours', 'prix', 'statut', 'partenaire']
    list_filter = ['statut', 'formule', 'lieu_prise__ville', 'categorie__gamme']
    search_fields = ['voyageur__email', 'telephone', 'conducteur']
    ordering = ['debut']
    readonly_fields = [
        'voyageur', 'reservation', 'categorie', 'formule', 'lieu_prise', 'adresse_prise', 'lieu_retour', 'adresse_retour',
        'debut', 'fin', 'passagers', 'telephone', 'precisions', 'conducteur', 'permis_numero', 'permis_pays', 'jours',
        'prix_jour', 'frais_lieux', 'prix', 'commission', 'caution', 'moyen', 'statut', 'expire_le', 'annulee_par',
        'annulee_le', 'cree_le',
    ]
    exclude = ['confirmation_notifiee', 'admins_notifies', 'alerte_sans_partenaire', 'partenaire_notifie',
               'location_envoyee_partenaire']
    actions = ['annuler_et_rembourser']
    CHAMPS_VEHICULE = ('vehicule', 'immatriculation', 'chauffeur_nom', 'chauffeur_telephone')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # Seuls les loueurs qui proposent cette catégorie à ce lieu de remise sont proposés
        if db_field.name == 'partenaire':
            pk = request.resolver_match.kwargs.get('object_id')
            location = LocationModel.objects.filter(pk=pk).first() if pk else None
            if location:
                kwargs['queryset'] = services.partenaires_disponibles(location)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if obj.partenaire_id and ({'partenaire', *self.CHAMPS_VEHICULE} & set(form.changed_data)):
            partenaire = obj.partenaire
            vehicule = {champ: getattr(obj, champ) for champ in self.CHAMPS_VEHICULE}
            obj.partenaire_id = form.initial.get('partenaire')  # l'attribution passe par le service
            try:
                services.assigner_partenaire(obj, partenaire, **vehicule)
                self.message_user(request, f"{partenaire} attribué : le voyageur va recevoir ses coordonnées.")
            except services.LocationErreur as exc:
                self.message_user(request, str(exc), level=messages.ERROR)
            return
        super().save_model(request, obj, form, change)

    @admin.action(description="Annuler et rembourser intégralement (aucun loueur disponible…)")
    def annuler_et_rembourser(self, request, queryset):
        for location in queryset:
            try:
                services.annuler(location, par='plateforme')
            except services.LocationErreur as exc:
                self.message_user(request, f"{location.reference} : {exc}", level=messages.WARNING)


@admin.register(VersementPartenaireModel)
class VersementPartenaireAdmin(admin.ModelAdmin):
    list_display = ['location', 'partenaire', 'montant', 'commission', 'statut', 'date_prevue', 'derniere_erreur']
    list_filter = ['statut']
