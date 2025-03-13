from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.timezone import now

class UserManager(BaseUserManager):
    def create_user(self, email, full_name, contact_number, password=None, role=1):  # Default to Customer
        if not email:
            raise ValueError("Users must have an email address")
        if not contact_number:
            raise ValueError("Users must have a contact number")

        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, contact_number=contact_number, role=role)
        user.set_password(password)  # Hash the password
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, contact_number, password):
        user = self.create_user(email, full_name, contact_number, password, role=2)  # Admin Role (2)
        user.is_superuser = True
        user.is_staff = True
        user.user_verified = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    CUSTOMER = 1
    ADMIN = 2
    VENDOR = 3

    ROLE_CHOICES = [
        (CUSTOMER, 'Customer'),
        (ADMIN, 'Admin'),
        (VENDOR, 'Vendor'),
    ]

    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    contact_number = models.CharField(max_length=15, unique=True, null=False, blank=False)  # Now required
    password = models.CharField(max_length=255)
    user_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    role = models.PositiveSmallIntegerField(choices=ROLE_CHOICES, default=CUSTOMER)  # Default role is Customer
    is_active = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "contact_number"]  # contact_number is now required

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.full_name} (Role: {self.get_role_display()})"
