from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.timezone import now, timedelta
import random
from django import forms


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

    restaurant = models.ForeignKey('RestaurantMaster', on_delete=models.CASCADE, related_name='menu_items')
    item_name = models.CharField(max_length=255)
    item_price = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    cuisines = models.ManyToManyField('RestaurantCuisine', related_name='menu_items')
    item_image = models.ImageField(upload_to='menu_images/', blank=True, null=True)
    spice_level = models.CharField(max_length=20, choices=SPICE_LEVEL_CHOICES)
    preparation_time = models.PositiveIntegerField(help_text="Estimated time in minutes")
    serving_size = models.CharField(max_length=10, choices=SERVING_SIZE_CHOICES)
    availability = models.BooleanField(default=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    food_type = models.CharField(max_length=10, choices=FOOD_TYPE_CHOICES, default='Veg')
    buy_one_get_one_free = models.BooleanField(null=True, blank=True, help_text="Is this item eligible for Buy One Get One Free?")
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
            return f"Cart for {self.user.full_name} at {self.restaurant.restaurant_name} - {self.item.item_name}"
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
    rating = models.PositiveSmallIntegerField()  # typically between 1 and 5
    review_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order-review"

    def __str__(self):
        return f"Review by {self.user} for {self.order_id}"