from django.db import models


class CompteurModel(models.Model):
    """Compteur à fenêtre fixe (tentatives, limites de débit), incrémenté atomiquement par PostgreSQL.

    Le cache de Django (DatabaseCache) lit puis écrit en deux requêtes : des requêtes simultanées y lisent
    toutes la même valeur et contournent la limite. Voir limites.incrementer.
    """
    cle = models.CharField(max_length=200, primary_key=True)
    valeur = models.PositiveIntegerField(default=0)
    expire_le = models.DateTimeField(db_index=True)

    class Meta:
        db_table = 'securite_compteur'


class JournalAuditModel(models.Model):
    """Événements sensibles : connexions, mots de passe, rôles, comptes de versement, webhooks refusés.

    Jamais de mot de passe, de code ni de jeton dans `details`.
    """
    ACTIONS = [
        ('connexion', 'Connexion'),
        ('connexion_echec', 'Échec de connexion'),
        ('connexion_bloquee', 'Connexion bloquée (trop de tentatives)'),
        ('connexion_google', 'Connexion Google'),
        ('inscription', 'Inscription'),
        ('email_verifie', 'Email vérifié'),
        ('mdp_reinitialise', 'Mot de passe réinitialisé'),
        ('code_bloque', 'Code bloqué (trop de tentatives)'),
        ('role_modifie', 'Rôle modifié'),
        ('compte_desactive', 'Compte désactivé'),
        ('profil_versement_modifie', 'Compte de versement modifié'),
        ('webhook_refuse', 'Webhook refusé'),
        ('admin_connexion_echec', "Échec de connexion à l'administration"),
        ('piece_consultee', "Pièce d'identité consultée"),
        ('annonce_verifiee', 'Annonce validée après visite'),
        ('annonce_refusee', 'Annonce refusée après visite'),
        ('compte_reactive', 'Compte réactivé'),
        ('annonce_modifiee', 'Annonce modifiée par un administrateur'),
        ('annonce_supprimee', 'Annonce supprimée par un administrateur'),
        ('reservation_annulee', 'Réservation annulée par un administrateur'),
        ('avis_supprime', 'Avis supprimé par un administrateur'),
        ('identite_verifiee', "Pièce d'identité validée"),
        ('identite_refusee', "Pièce d'identité refusée"),
        ('backoffice_creation', 'Création depuis le back-office'),
        ('backoffice_modification', 'Modification depuis le back-office'),
    ]

    cree_le = models.DateTimeField(auto_now_add=True, db_index=True)
    action = models.CharField(max_length=40, choices=ACTIONS, db_index=True)
    # Identifiant seul, sans clé étrangère : l'entrée survit à la suppression du compte et n'est jamais modifiée
    # (le rôle de l'application n'a pas le droit de mettre à jour ce journal, voir deploy/postgres/roles.sql)
    utilisateur_id = models.UUIDField(null=True, blank=True, db_index=True)
    email = models.CharField(max_length=254, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'securite_journal_audit'
        ordering = ['-cree_le']
        verbose_name = "Entrée du journal d'audit"
        verbose_name_plural = "Journal d'audit"

    def __str__(self):
        return f"{self.cree_le:%Y-%m-%d %H:%M} {self.action} {self.email}"
