from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.timezone import now, timedelta
import random

class UserManager(BaseUserManager):
    def create_user(self, email, full_name, role=1):  # Default to Customer
        if not email:
            raise ValueError("Users must have an email address")
        
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, role=role)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name):
        user = self.create_user(email, full_name, role=2)  # Admin Role (2)
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
    contact_number = models.CharField(max_length=15, unique=True, null=True, blank=True)  # Optional
    user_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    role = models.PositiveSmallIntegerField(choices=ROLE_CHOICES, default=CUSTOMER)
    is_active = models.BooleanField(default=True)

    # OTP-based authentication
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_expiry = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        db_table = "users"

    def __str__(self):
        return f"{self.full_name} (Role: {self.get_role_display()})"

    def generate_otp(self):
        """Generate a 6-digit OTP and set expiry to 5 minutes."""
        self.otp = str(random.randint(100000, 999999))
        self.otp_expiry = now() + timedelta(minutes=5)
        self.save(update_fields=["otp", "otp_expiry"])

    def verify_otp(self, otp):
            """Verify if OTP is correct and not expired."""
            if self.otp == otp and self.otp_expiry and now() < self.otp_expiry:
                self.user_verified = True  # Set user_verified to True on successful OTP verification
                self.save(update_fields=["user_verified"])  # Only update the user_verified field
                return True
            return False
    
class RestaurantMaster(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # Authenticated user
    restaurant_id = models.CharField(max_length=20, unique=True, primary_key=True)  # Set as primary key
    restaurant_name = models.CharField(max_length=255)
    restaurant_status = models.PositiveSmallIntegerField(choices=((1, 'Active'), (2, 'Inactive')))

    class Meta:
        db_table = "restaurent_masters"

    def __str__(self):
        return self.restaurant_name

class RestaurantOwnerDetail(models.Model):
    restaurant = models.OneToOneField(RestaurantMaster, on_delete=models.CASCADE)
    owner_name = models.CharField(max_length=255)
    owner_email_address = models.EmailField(max_length=255)
    owner_contact = models.CharField(max_length=15, blank=True, null=True)
    owner_primary_contact = models.CharField(max_length=15, blank=True, null=True)

    class Meta:
        db_table = "restaurant_owner_details"

    def __str__(self):
        return f"{self.owner_name} - {self.restaurant.restaurant_name}"


class RestaurantLocation(models.Model):
    restaurant = models.OneToOneField(RestaurantMaster, on_delete=models.CASCADE)
    shop_no_building = models.CharField(max_length=255, blank=True, null=True)
    floor_tower = models.CharField(max_length=255, blank=True, null=True)
    area_sector_locality = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    nearby_locality = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "restaurant_location_details"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - {self.city}"



