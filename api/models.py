# from datetime import timezone
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.timezone import now, timedelta
from django.utils import timezone
import random
from django import forms
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError

class UserManager(BaseUserManager):
    def create_user(self, email, full_name, contact_number, role=1):  # Default to Customer
        if not email:
            raise ValueError("Users must have an email address")
        
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, role=role, contact_number=contact_number)
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

    DELIVERY_VEG = 1
    DELIVERY_NONVEG = 2

    DELIVERY_PREFERENCE_CHOICES = [
        (DELIVERY_VEG, 'Veg'),
        (DELIVERY_NONVEG, 'Non-Veg'),
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

    is_email_verified = models.BooleanField(default=False)
    is_mobile_verified = models.BooleanField(default=False)

    email_verified_at = models.DateTimeField(null=True, blank=True)
    mobile_verified_at = models.DateTimeField(null=True, blank=True)

    delivery_preference = models.PositiveSmallIntegerField(
        choices=DELIVERY_PREFERENCE_CHOICES, null=True, blank=True
    )
    whatsapp_updates = models.PositiveSmallIntegerField(
        choices=[(1, 'Yes'), (0, 'No')], null=True, blank=True
    )

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
    profile_image = models.ImageField(upload_to="restaurant_profile_images/", blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurent_masters"

    def __str__(self):
        return self.restaurant_name

class RestaurantOwnerDetail(models.Model):
    restaurant = models.OneToOneField(RestaurantMaster, on_delete=models.CASCADE, related_name='owner_details')
    owner_name = models.CharField(max_length=255)
    owner_email_address = models.EmailField(max_length=255)
    owner_contact = models.CharField(max_length=15, blank=True, null=True)
    owner_primary_contact = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_owner_details"

    def __str__(self):
        return f"{self.owner_name} - {self.restaurant.restaurant_name}"


class RestaurantLocation(models.Model):
    restaurant = models.OneToOneField(RestaurantMaster, on_delete=models.CASCADE, related_name='restaurant_location')
    shop_no_building = models.CharField(max_length=255, blank=True, null=True)
    floor_tower = models.CharField(max_length=255, blank=True, null=True)
    area_sector_locality = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    nearby_locality = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_location_details"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - {self.city}"

class RestaurantCuisine(models.Model):
    restaurant = models.ForeignKey(
        RestaurantMaster, 
        on_delete=models.CASCADE, 
        related_name="cuisines"  # One-to-many relationship
    )
    cuisine_name = models.CharField(max_length=100)  # Store a single cuisine per record
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_cuisines"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - {self.cuisine_name}"

class RestaurantDeliveryTiming(models.Model):
    restaurant = models.ForeignKey(
        RestaurantMaster, 
        on_delete=models.CASCADE, 
        related_name="delivery_timings"  # One-to-many relationship
    )
    day = models.CharField(max_length=10)
    open = models.BooleanField(default=False)
    start_time = models.TimeField(blank=True, null=True)
    end_time = models.TimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_delivery_timings"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - {self.day} ({self.start_time} to {self.end_time})"

class RestaurantDocuments(models.Model):
    restaurant = models.OneToOneField(
        RestaurantMaster, 
        on_delete=models.CASCADE, 
        related_name="documents"
    )
    pan_number = models.CharField(max_length=20)
    name_as_per_pan = models.CharField(max_length=255)
    registered_business_address = models.TextField()
    pan_image = models.ImageField(upload_to="pan_images/", blank=True, null=True)
    fssai_number = models.CharField(max_length=50)
    fssai_expiry_date = models.DateField()
    fssai_licence_image = models.ImageField(upload_to="fssai_images/", blank=True, null=True)
    bank_account_number = models.CharField(max_length=20)
    bank_account_ifsc_code = models.CharField(max_length=20)
    bank_account_type = models.PositiveSmallIntegerField(choices=((1, "Saving"), (2, "Current")))
    partner_contract_doc = models.FileField(upload_to="partner_contracts/", blank=True, null=True)  # New field
    is_contract_checked = models.BooleanField(default=False)  # New field
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_documents"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - Documents"
    
class RestaurantMenu(models.Model):
    CATEGORY_CHOICES = [
        ('Appetizer', 'Appetizer'),
        ('Main Course', 'Main Course'),
        ('Dessert', 'Dessert'),
        ('Beverage', 'Beverage'),
        ('Burger', 'Burger'),
        ('Pizza', 'Pizza'),
        ('Wraps & Rolls', 'Wraps & Rolls'),
        ('Sandwich', 'Sandwich'),
        ('Salad', 'Salad'),
        ('Breakfast', 'Breakfast'),
        ('Combo Meal', 'Combo Meal'),
        ('Street Food', 'Street Food'),
        ('Rice & Biryani', 'Rice & Biryani'),
        ('Noodles & Pasta', 'Noodles & Pasta'),
        ('Rotis', 'Rotis'),
    ]
    
    SPICE_LEVEL_CHOICES = [
        ('Mild', 'Mild'),
        ('Medium', 'Medium'),
        ('Spicy', 'Spicy'),
        ('Extra Spicy', 'Extra Spicy'),
    ]
    
    SERVING_SIZE_CHOICES = [
        ('Small', 'Small'),
        ('Medium', 'Medium'),
        ('Large', 'Large'),
    ]
    
    FOOD_TYPE_CHOICES = [
        ('Veg', 'Veg'),
        ('Non-Veg', 'Non-Veg'),
    ]

    INACTIVE = 0
    ACTIVE = 1

    STATUS_CHOICES = [
        (INACTIVE, 'Inactive'),
        (ACTIVE, 'Active'),
    ]

    restaurant = models.ForeignKey('RestaurantMaster', on_delete=models.CASCADE, related_name='menu_items')
    item_name = models.CharField(max_length=255)
    item_price = models.DecimalField(max_digits=6, decimal_places=2)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_active = models.IntegerField(choices=STATUS_CHOICES, default=INACTIVE)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    cuisines = models.ManyToManyField('RestaurantCuisine', related_name='menu_items')
    item_image = models.ImageField(upload_to='menu_images/', blank=True, null=True)
    spice_level = models.CharField(max_length=20, choices=SPICE_LEVEL_CHOICES)
    preparation_time = models.PositiveIntegerField(help_text="Estimated time in minutes")
    serving_size = models.CharField(max_length=10, choices=SERVING_SIZE_CHOICES)
    availability = models.BooleanField(default=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    food_type = models.CharField(max_length=10, choices=FOOD_TYPE_CHOICES, default='Veg')
    buy_one_get_one_free = models.BooleanField(null=True, blank=True, help_text="Is this item eligible for Buy One Get One Free?")
    start_time = models.TimeField(null=True, blank=True, verbose_name="Available From")
    end_time = models.TimeField(null=True, blank=True, verbose_name="Available Until")
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_menu"

    def __str__(self):
        return f"{self.restaurant.restaurant_name} - {self.item_name}"


class Cart(models.Model):
    """
    Represents a shopping cart for a user (logged-in or guest).
    """

    # Define status choices
    CART_STATUS_CHOICES = (
        (1, 'Item Added'),
        (2, 'Proceeded for Checkout'),
        (3, 'Address Updated'),
        (4, 'Proceeded for Payment'),
        (5, 'Payment Completed'),
    )

    INACTIVE = 0
    ACTIVE = 1

    STATUS_CHOICES = [
        (INACTIVE, 'Inactive'),
        (ACTIVE, 'Active'),
    ]
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name="carts"
    )  # Null for guest users
    restaurant = models.ForeignKey(
        RestaurantMaster, 
        on_delete=models.CASCADE, 
        related_name="carts"
    )  # Each cart is associated with a specific restaurant
    session_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True
    )  # For guest users
    order_number = models.CharField(max_length=20, null=True, blank=True)
    item_price = models.DecimalField(max_digits=6, decimal_places=2,null=True,blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_active = models.IntegerField(choices=STATUS_CHOICES, default=INACTIVE)
    description = models.TextField(null=True,blank=True)
    item = models.ForeignKey(
        RestaurantMenu, 
        on_delete=models.CASCADE, 
        related_name="carts"
    )  # The menu item added to the cart
    quantity = models.PositiveIntegerField(default=1)  # Quantity of the item
    cart_status = models.PositiveIntegerField(
        choices=CART_STATUS_CHOICES, 
        default=1
    )  # Status of the cart
    buy_one_get_one_free = models.BooleanField(null=True, blank=True, help_text="Is this item eligible for Buy One Get One Free?")
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts"
        
    def __str__(self):
        if self.user:
            return f"Cart for {self.user.full_name} at {self.restaurant.profile_image} {self.restaurant.restaurant_name} - {self.item.item_name}"
        return f"Cart for Guest (Session: {self.session_id}) at {self.restaurant.restaurant_name} - {self.item.item_name}"
    
class UserDeliveryAddress(models.Model):
    HOME = "Home"
    OFFICE = "Office"
    OTHER = "Other"
    
    HOME_TYPE_CHOICES = [
        (HOME, "Home"),
        (OFFICE, "Office"),
        (OTHER, "Other"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="delivery_addresses")
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    near_by_landmark = models.CharField(max_length=255, blank=True, null=True)
    home_type = models.CharField(max_length=10, choices=HOME_TYPE_CHOICES, default=HOME)
    name_of_location = models.CharField(max_length=100,blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_delivery_address"

    def __str__(self):
        return f"{self.user.full_name} - {self.street_address}, {self.city}"

class Order(models.Model):

    ORDER_STATUS_CHOICES = (
        (1, 'Pending'),
        (2, 'Confirmed'),
        (3, 'Preparing'),
        (4, 'Ready for Delivery/Pickup'),
        (5, 'On the Way'),
        (6, 'Delivered'),
        (7, 'Cancelled'),
        (8, 'Refunded')
    )

    PAYMENT_STATUS_CHOICES = (
        (1, 'in progress'),
        (2, 'Pending'),
        (3, 'Refunded'),
        (4, 'Failed'),
        (5, 'Completed')
    )

    PAYMENT_METHOD_CHOICES = (
        (1, 'Credit Card'),
        (2, 'Debit Card'),
        (3, 'UPI'),
        (4, 'Net Banking'),
        (5, 'Cash on Delivery')
    )

    PAYMENT_TYPE = (
        (1, 'online'),
        (2, 'cod'),
    )

    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='orders')
    restaurant = models.ForeignKey(RestaurantMaster, on_delete=models.PROTECT)
    order_number = models.CharField(max_length=20, null=True)
    order_date = models.DateTimeField(auto_now_add=True)
    delivery_date = models.DateTimeField(null=True, blank=True)
    status = models.PositiveSmallIntegerField(choices=ORDER_STATUS_CHOICES, default=1)
    payment_status = models.PositiveSmallIntegerField(choices=PAYMENT_STATUS_CHOICES, default=1)
    payment_method = models.PositiveSmallIntegerField(choices=PAYMENT_METHOD_CHOICES)
    payment_type = models.PositiveSmallIntegerField(
        choices=PAYMENT_TYPE,
        null=True,
        blank=True,
        default=None
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    quantity = models.PositiveIntegerField()
    delivery_address = models.ForeignKey(UserDeliveryAddress, on_delete=models.PROTECT)
    special_instructions = models.TextField(blank=True, null=True)
    is_takeaway = models.BooleanField(default=False, null=True)
    preparation_time = models.PositiveSmallIntegerField(help_text="Estimated minutes for preparation", null=True)
    special_requests = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    invoice_path = models.ImageField(upload_to='order_invoices/', blank=True, null=True)
    coupon = models.ForeignKey('Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    coupon_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Discount amount from coupon")

    class Meta:
        db_table = "order_details"
        ordering = ['-order_date']

    def __str__(self):
        return f"Order #{self.order_number} - {self.get_status_display()} {self.get_payment_status_display()} {self.get_payment_method_display()}"

class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs')
    status = models.PositiveSmallIntegerField(choices=Order.ORDER_STATUS_CHOICES)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_status_logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order} - {self.get_status_display()}"


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = (
        (1, 'Created'),
        (2, 'Attempted'),
        (3, 'Pending'),
        (4, 'Authorized'),
        (5, 'Captured'),
        (6, 'Failed'),
        (7, 'Refunded'),
        (8, 'Partially Refunded'),
    )

    PAYMENT_GATEWAY_CHOICES = (
        (1, 'Razorpay'),
        (2, 'Stripe'),
        (3, 'PayPal'),
        (4, 'Cash on Delivery'),
    )


    order = models.ForeignKey('Order', on_delete=models.PROTECT, related_name='payments')
    payment_gateway = models.PositiveSmallIntegerField(choices=PAYMENT_GATEWAY_CHOICES)
    payment_type = models.PositiveSmallIntegerField(
        choices=Order.PAYMENT_TYPE,
        null=True,
        blank=True,
        default=None
    )
    payment_method = models.PositiveSmallIntegerField(choices=Order.PAYMENT_METHOD_CHOICES)
    status = models.PositiveSmallIntegerField(choices=PAYMENT_STATUS_CHOICES, default=1)
    
    # Razorpay specific fields
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    
    # Payment amounts
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tax_on_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    
    # Additional info
    invoice_number = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    raw_response = models.JSONField(null=True, blank=True)  # Store complete gateway response

    class Meta:
        db_table = "payment_details"
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment #{self.id} for Order #{self.order.order_number}"

class Refund(models.Model):
    REFUND_STATUS_CHOICES = (
        (1, 'Requested'),
        (2, 'Processing'),
        (3, 'Processed'),
        (4, 'Failed'),
    )

    REFUND_REASON_CHOICES = (
        (1, 'Order Cancelled'),
        (2, 'Customer Request'),
        (3, 'Duplicate Payment'),
        (4, 'Fraudulent Transaction'),
        (5, 'Product Not Available'),
        (6, 'Other'),
    )

    order = models.ForeignKey('Order', on_delete=models.PROTECT, related_name='refunds')
    payment = models.ForeignKey('Payment', on_delete=models.PROTECT, related_name='refunds')
    status = models.PositiveSmallIntegerField(choices=REFUND_STATUS_CHOICES, default=1)
    reason = models.PositiveSmallIntegerField(choices=REFUND_REASON_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Razorpay specific fields
    razorpay_refund_id = models.CharField(max_length=100, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Additional info
    notes = models.TextField(null=True, blank=True)
    initiated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    raw_response = models.JSONField(null=True, blank=True)  # Store complete gateway response

    class Meta:
        db_table = "refund_details"
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund #{self.id} for Order #{self.order.order_number}"
    
class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    message = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.email})"
    
class OrderLiveLocation(models.Model):
    order_number = models.CharField(max_length=20, null=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_live_locations"

    def __str__(self):
        return f"Order #{self.order_number} location at {self.timestamp}"
    
class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    )

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "coupen_master"

    def __str__(self):
        return f"{self.is_active} {self.valid_from} {self.valid_to}"
    
class OrderReview(models.Model):
    order_id = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='order_reviews')
    restaurant_id = models.CharField(max_length=255, null=True, blank=True, default=None)
    rating = models.PositiveSmallIntegerField()  # typically between 1 and 5
    review_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order-review"

    def __str__(self):
        return f"Review by {self.user} for {self.order_id}"
class PorterOrder(models.Model):

    INPROGRESS = 0
    COMPLETED = 1
    ONTHEWAY = 2

    STATUS_CHOICES = [
        (INPROGRESS, 'Inprogress'),
        (COMPLETED, 'Completed'),
        (ONTHEWAY, 'On The Way'),
    ]

    order_number = models.CharField(max_length=20, null=True, blank=True)
    booking_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=50)
    vehicle_type = models.CharField(max_length=50)
    fare_estimate = models.JSONField(null=True, blank=True)
    estimated_pickup_time = models.DateTimeField(null=True, blank=True)
    porter_create_request = models.JSONField(null=True, blank=True)
    porter_create_response = models.JSONField(null=True, blank=True)
    track_order_api_response = models.JSONField(null=True, blank=True)
    eatoor_delivery_status = models.IntegerField(choices=STATUS_CHOICES, default=INPROGRESS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "porter-order"

    def __str__(self):
        return f"Booking {self.booking_id} - {self.status}"

class RestaurantCategory(models.Model):
    category_name = models.CharField(max_length=255)
    category_status = models.BooleanField(default=True)
    category_description = models.TextField(blank=True, null=True)
    restaurant_id = models.CharField(max_length=255, null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_category"

    def __str__(self):
        return self.category_name
    
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError

class OfferDetail(models.Model):
    # ------------------------------
    # OFFER TYPES
    # ------------------------------
    OFFER_TYPE_CHOICES = [
        ('coupon_code', 'Coupon Code'),
        ('free_delivery', 'Free Delivery'),
        ('credit', 'Credit'),
        ('restaurant_deal', 'Restaurant Deal'),
        ('auto_discount', 'Auto Discount'),
    ]

    # ------------------------------
    # SUB FILTERS
    # ------------------------------
    SUB_FILTER_CHOICES = [
        ('new_user', 'New User'),
        ('minimum_amount', 'Minimum Amount'),
        ('specific_restaurant', 'Specific Restaurant'),
        ('location_based', 'Location Based'),
        ('referral_bonus', 'Referral Bonus'),
        ('cashback', 'Cashback'),
    ]

    # ------------------------------
    # DISCOUNT TYPE
    # ------------------------------
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    # ------------------------------
    # CREDIT TYPE
    # ------------------------------
    CREDIT_TYPE_CHOICES = [
        ('fixed_amount', 'Fixed Amount'),
    ]

    # ------------------------------
    # STATUS
    # ------------------------------
    INACTIVE = 0
    APPROVED = 1
    PENDING_APPROVAL = 2

    STATUS_CHOICES = [
        (INACTIVE, 'Rejected'),
        (APPROVED, 'Approved'),
        (PENDING_APPROVAL, 'Pending Approval'),
    ]

    # ------------------------------
    # BASIC DETAILS
    # ------------------------------
    offer_type = models.CharField(max_length=30, choices=OFFER_TYPE_CHOICES)
    sub_filter = models.CharField(
        max_length=30,
        choices=SUB_FILTER_CHOICES,
        blank=True,
        null=True
    )
    is_active = models.IntegerField(choices=STATUS_CHOICES, default=PENDING_APPROVAL)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------
    # COUPON CODE
    # ------------------------------
    code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        help_text="Required for coupon_code offer type"
    )

    # ------------------------------
    # DISCOUNT DETAILS
    # ------------------------------
    discount_type = models.CharField(
        max_length=15,
        choices=DISCOUNT_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="Required for coupon_code, auto_discount, and credit"
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        blank=True,
        null=True,
        help_text="Required for coupon_code, auto_discount, and credit"
    )

    # ------------------------------
    # MINIMUM ORDER AMOUNT
    # ------------------------------
    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0
    )

    # ------------------------------
    # RESTAURANT
    # ------------------------------
    restaurant = models.ForeignKey(
        'RestaurantMaster',
        on_delete=models.CASCADE,
        related_name='offers',
        blank=True,
        null=True,
        to_field='restaurant_id'
    )

    # ------------------------------
    # VALIDITY
    # ------------------------------
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_to = models.DateTimeField(blank=True, null=True)

    # ------------------------------
    # USAGE LIMITS
    # ------------------------------
    max_uses = models.PositiveIntegerField(blank=True, null=True)
    max_uses_per_user = models.PositiveIntegerField(blank=True, null=True)
    times_used = models.PositiveIntegerField(default=0)

    # ------------------------------
    # FREE DELIVERY FIELDS
    # ------------------------------
    max_delivery_distance = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Maximum delivery distance in km for location-based free delivery"
    )
    max_delivery_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Maximum delivery fee covered for free delivery offers"
    )

    # ------------------------------
    # CREDIT FIELDS
    # ------------------------------
    credit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Credit amount (used when offer_type is 'credit')"
    )
    credit_type = models.CharField(
        max_length=20,
        choices=CREDIT_TYPE_CHOICES,
        blank=True,
        null=True,
        default='fixed_amount',
        help_text="Type of credit offer"
    )
    credit_expiry_days = models.PositiveIntegerField(
        blank=True,
        null=True,
        default=30,
        help_text="Credit expiry in days from first use"
    )

    class Meta:
        db_table = "offer_details"
        ordering = ['-created_at']
        verbose_name = "Offer Detail"
        verbose_name_plural = "Offer Details"

    def __str__(self):
        return f"{self.get_offer_type_display()} - {self.code or 'No Code'}"

    @property
    def is_valid(self):
        """Check if offer is currently valid"""
        now = timezone.now()
        
        if self.is_active != self.APPROVED:
            return False
        
        if self.valid_from and now < self.valid_from:
            return False
        
        if self.valid_to and now > self.valid_to:
            return False
        
        if self.max_uses is not None and self.times_used >= self.max_uses:
            return False
        
        return True

    def clean(self):
        errors = {}

        # --- Offer type validation ---
        if not self.offer_type:
            errors['offer_type'] = 'Offer type is required'

        # --- Coupon Code validation ---
        if self.offer_type == 'coupon_code':
            if not self.code:
                errors['code'] = 'Coupon code is required for coupon_code offer type'
            elif len(self.code) > 20:
                errors['code'] = 'Coupon code cannot exceed 20 characters'

        # --- Restaurant validation ---
        if self.offer_type == 'restaurant_deal' and not self.restaurant:
            errors['restaurant'] = 'Restaurant is required for restaurant deals'

        if self.sub_filter == 'specific_restaurant' and not self.restaurant:
            errors['restaurant'] = 'Restaurant required when sub_filter is specific_restaurant'

        # --- Discount validation for applicable offer types ---
        discount_required_types = ['coupon_code', 'auto_discount', 'credit']
        if self.offer_type in discount_required_types:
            if not self.discount_type:
                errors['discount_type'] = 'Discount type is required'
            if not self.discount_value:
                errors['discount_value'] = 'Discount value is required'
            
            if self.discount_type == 'percentage' and self.discount_value > 100:
                errors['discount_value'] = 'Percentage discount cannot exceed 100%'

        # --- Free Delivery validation ---
        if self.offer_type == 'free_delivery':
            if self.sub_filter == 'minimum_amount' and not self.minimum_order_amount:
                errors['minimum_order_amount'] = 'Minimum order amount is required for this filter'
            
            if self.sub_filter == 'location_based':
                if not self.max_delivery_distance:
                    errors['max_delivery_distance'] = 'Maximum delivery distance is required for location-based free delivery'
                elif self.max_delivery_distance <= 0:
                    errors['max_delivery_distance'] = 'Maximum delivery distance must be positive'
                
                if not self.max_delivery_fee:
                    errors['max_delivery_fee'] = 'Maximum delivery fee is required for location-based free delivery'
                elif self.max_delivery_fee < 0:
                    errors['max_delivery_fee'] = 'Maximum delivery fee cannot be negative'

        # --- Credit validation ---
        if self.offer_type == 'credit':
            if not self.credit_amount and not self.discount_value:
                errors['credit_amount'] = 'Credit amount or discount value is required for credit offers'
            elif self.credit_amount and self.credit_amount <= 0:
                errors['credit_amount'] = 'Credit amount must be positive'
            
            if self.credit_expiry_days and (self.credit_expiry_days < 1 or self.credit_expiry_days > 365):
                errors['credit_expiry_days'] = 'Credit expiry days must be between 1 and 365'

        # --- Date validation ---
        if self.valid_from and self.valid_to and self.valid_from >= self.valid_to:
            errors['valid_to'] = 'End date must be after start date'

        # --- Usage limits validation ---
        if self.max_uses is not None and self.max_uses <= 0:
            errors['max_uses'] = 'Maximum uses must be positive or empty'
        
        if self.max_uses_per_user is not None and self.max_uses_per_user <= 0:
            errors['max_uses_per_user'] = 'Maximum uses per user must be positive or empty'
        
        if self.times_used < 0:
            errors['times_used'] = 'Times used cannot be negative'

        # --- Minimum order amount validation ---
        if self.minimum_order_amount is not None and self.minimum_order_amount < 0:
            errors['minimum_order_amount'] = 'Minimum order amount cannot be negative'

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        
        # Set default values
        if self.offer_type == 'credit':
            if not self.credit_type:
                self.credit_type = 'fixed_amount'
            if not self.credit_expiry_days:
                self.credit_expiry_days = 30
        
        if not self.minimum_order_amount:
            self.minimum_order_amount = 0
            
        super().save(*args, **kwargs)
class FavouriteKitchen(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    restaurant = models.ForeignKey(RestaurantMaster, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'restaurant')
        db_table = "favourite_kitchens"

    def __str__(self):
        return f"{self.user} ❤️ {self.restaurant.restaurant_name}"
class CustomImage(models.Model):
    IMAGE_TYPES = (
        (1, "Restaurant"),
        (2, "Menu"),
        (3, "Banner"),
        (4, "Offer"),
        (5, "Category"),
        (6, "Other"),
    )

    title = models.CharField(max_length=100)
    image = models.ImageField(upload_to="uploads/", blank=True, null=True)
    type_of_images = models.PositiveSmallIntegerField(choices=IMAGE_TYPES, default=6)

    class Meta:
        db_table = "custom_image"

    def __str__(self):
        return f"{self.title} ({self.get_type_of_images_display()})"

class TagMaster(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification_tag_master"
        verbose_name = "Tag"
        verbose_name_plural = "Tags"

    def __str__(self):
        return self.name


class AssignTags(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_tags')
    tag = models.ForeignKey(TagMaster, on_delete=models.CASCADE, related_name='assigned_users')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification_assign_tags"
        unique_together = ('user', 'tag')
        verbose_name = "Assigned Tag"
        verbose_name_plural = "Assigned Tags"

    def __str__(self):
        return f"{self.user.username} → {self.tag.name}"

class NotificationMaster(models.Model):
    key = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True, null=True)
    body = models.TextField()

    # NEW: Notification is connected to tags
    tags = models.ManyToManyField(TagMaster, blank=True, related_name="notifications")

    channel = models.CharField(
        max_length=10,
        choices=(
            ('email', 'Email'),
            ('push', 'Push'),
            ('both', 'Both')
        )
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notification_master"
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"

    def __str__(self):
        return self.key


class NotificationQueue(models.Model):
    template = models.ForeignKey(NotificationMaster, on_delete=models.SET_NULL, null=True)
    channel = models.CharField(max_length=10)  # email / push / both

    # Either direct user OR tag-based targeting
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    target_tags = models.ManyToManyField(TagMaster, blank=True)

    # Extra dynamic data
    payload = models.JSONField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=(
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('failed', 'Failed'),
            ('cancelled', 'Cancelled')
        ),
        default='pending'
    )

    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)

    next_try_at = models.DateTimeField(default=timezone.now)
    scheduled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notification_queue"
        verbose_name = "Notification Queue"
        verbose_name_plural = "Notification Queue"

    def __str__(self):
        return f"{self.id} - {self.status}"


class Device(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='devices')
    token = models.CharField(max_length=512)  # FCM Token
    platform = models.CharField(max_length=10)  # android / ios / web
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "user_device"
        verbose_name = "Device"
        verbose_name_plural = "Devices"

    def __str__(self):
        return f"{self.user.username} - {self.platform}"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    signup_bonus_given = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} Wallet"


class WalletTransaction(models.Model):

    TRANSACTION_TYPES = (
        ("credit", "Credit"),
        ("debit", "Debit"),
    )

    TRANSACTION_SOURCES = (
        ("add_money", "Add Money"),
        ("order_payment", "Order Payment"),
        ("order_refund", "Order Refund"),
        ("promo_credit", "Promo Credit"),
        ("manual_adjustment", "Manual Adjustment"),
    )

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("success", "Success"),
        ("failed", "Failed"),
    )

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    txn_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    txn_source = models.CharField(max_length=30, choices=TRANSACTION_SOURCES)
    order = models.ForeignKey("api.Order", null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="success")
    note = models.CharField(max_length=255, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.txn_type} {self.amount}"
