# infrastructure/persistence/models.py
import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

# user creation
class UserModelManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire.")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)

# database
class UserModel(AbstractUser):

    ROLE_CHOICES = [
        ('voyageur', 'Voyageur'),
        ('hote', 'Hôte'),
        ('admin', 'Administrateur'),
    ]

    username    = None
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email       = models.EmailField(unique=True)
    phone       = models.CharField(max_length=20, unique=True, null=True, blank=True)
    avatar      = models.ImageField(upload_to='avatars/', null=True, blank=True)
    role        = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_verified = models.BooleanField(default=False)
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = UserModelManager()

    class Meta:
        db_table = 'users_user'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"
