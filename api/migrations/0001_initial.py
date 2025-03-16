# Generated by Django 4.2.20 on 2025-03-16 06:07

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('full_name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('contact_number', models.CharField(blank=True, max_length=15, null=True, unique=True)),
                ('user_verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('role', models.PositiveSmallIntegerField(choices=[(1, 'Customer'), (2, 'Admin'), (3, 'Vendor')], default=1)),
                ('is_active', models.BooleanField(default=True)),
                ('otp', models.CharField(blank=True, max_length=6, null=True)),
                ('otp_expiry', models.DateTimeField(blank=True, null=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'db_table': 'users',
            },
        ),
        migrations.CreateModel(
            name='RestaurantMaster',
            fields=[
                ('restaurant_id', models.CharField(max_length=20, primary_key=True, serialize=False, unique=True)),
                ('restaurant_name', models.CharField(max_length=255)),
                ('restaurant_status', models.PositiveSmallIntegerField(choices=[(1, 'Active'), (2, 'Inactive')])),
                ('profile_image', models.ImageField(blank=True, null=True, upload_to='restaurant_profile_images/')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'restaurent_masters',
            },
        ),
        migrations.CreateModel(
            name='RestaurantOwnerDetail',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('owner_name', models.CharField(max_length=255)),
                ('owner_email_address', models.EmailField(max_length=255)),
                ('owner_contact', models.CharField(blank=True, max_length=15, null=True)),
                ('owner_primary_contact', models.CharField(blank=True, max_length=15, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='owner_details', to='api.restaurantmaster')),
            ],
            options={
                'db_table': 'restaurant_owner_details',
            },
        ),
        migrations.CreateModel(
            name='RestaurantLocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('shop_no_building', models.CharField(blank=True, max_length=255, null=True)),
                ('floor_tower', models.CharField(blank=True, max_length=255, null=True)),
                ('area_sector_locality', models.CharField(max_length=255)),
                ('city', models.CharField(max_length=100)),
                ('nearby_locality', models.CharField(blank=True, max_length=255, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='restaurant_location', to='api.restaurantmaster')),
            ],
            options={
                'db_table': 'restaurant_location_details',
            },
        ),
        migrations.CreateModel(
            name='RestaurantDocuments',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pan_number', models.CharField(max_length=20)),
                ('name_as_per_pan', models.CharField(max_length=255)),
                ('registered_business_address', models.TextField()),
                ('pan_image', models.ImageField(blank=True, null=True, upload_to='pan_images/')),
                ('fssai_number', models.CharField(max_length=50)),
                ('fssai_expiry_date', models.DateField()),
                ('fssai_licence_image', models.ImageField(blank=True, null=True, upload_to='fssai_images/')),
                ('bank_account_number', models.CharField(max_length=20)),
                ('bank_account_ifsc_code', models.CharField(max_length=20)),
                ('bank_account_type', models.PositiveSmallIntegerField(choices=[(1, 'Saving'), (2, 'Current')])),
                ('partner_contract_doc', models.FileField(blank=True, null=True, upload_to='partner_contracts/')),
                ('is_contract_checked', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='api.restaurantmaster')),
            ],
            options={
                'db_table': 'restaurant_documents',
            },
        ),
        migrations.CreateModel(
            name='RestaurantDeliveryTiming',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day', models.CharField(max_length=10)),
                ('open', models.BooleanField(default=False)),
                ('start_time', models.TimeField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_timings', to='api.restaurantmaster')),
            ],
            options={
                'db_table': 'restaurant_delivery_timings',
            },
        ),
        migrations.CreateModel(
            name='RestaurantCuisine',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cuisine_name', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('restaurant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cuisines', to='api.restaurantmaster')),
            ],
            options={
                'db_table': 'restaurant_cuisines',
            },
        ),
    ]
