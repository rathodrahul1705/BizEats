# Generated by Django 4.2.20 on 2025-03-24 02:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_userdeliveryaddress'),
    ]

    operations = [
        migrations.AddField(
            model_name='cart',
            name='cart_status',
            field=models.PositiveIntegerField(choices=[(1, 'Item Added'), (2, 'Proceeded for Checkout'), (3, 'Address Updated'), (4, 'Proceeded for Payment'), (5, 'Payment Completed')], default=1),
        ),
    ]
