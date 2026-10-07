from django.contrib import admin

from .models import PaiementModel, ProfilVersementModel, RemboursementModel, VersementModel


@admin.register(PaiementModel)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['reservation', 'montant', 'statut', 'mode', 'transaction_id', 'cree_le']
    list_filter = ['statut', 'prestataire']
    search_fields = ['transaction_id', 'reservation__guest__email']
    readonly_fields = [f.name for f in PaiementModel._meta.fields]


@admin.register(VersementModel)
class VersementAdmin(admin.ModelAdmin):
    list_display = ['reservation', 'hote', 'montant', 'commission', 'statut', 'date_prevue', 'derniere_erreur']
    list_filter = ['statut']
    search_fields = ['hote__email', 'payout_id']


@admin.register(RemboursementModel)
class RemboursementAdmin(admin.ModelAdmin):
    list_display = ['reservation', 'montant', 'motif', 'statut', 'derniere_erreur', 'cree_le']
    list_filter = ['statut']
    search_fields = ['reservation__guest__email', 'payout_id']


@admin.register(ProfilVersementModel)
class ProfilVersementAdmin(admin.ModelAdmin):
    list_display = ['hote', 'pays', 'operateur', 'numero', 'titulaire', 'mis_a_jour_le']
    list_filter = ['pays', 'operateur']
