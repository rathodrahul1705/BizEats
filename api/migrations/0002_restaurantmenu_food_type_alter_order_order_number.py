# Generated by Django 4.2.20 on 2025-04-08 02:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='restaurantmenu',
            name='food_type',
            field=models.CharField(choices=[('Veg', 'Veg'), ('Non-Veg', 'Non-Veg')], default='Veg', max_length=10),
        ),
        migrations.AlterField(
            model_name='order',
            name='order_number',
            field=models.CharField(max_length=20, null=True),
        ),
    ]
