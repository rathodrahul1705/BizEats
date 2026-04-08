from rest_framework import serializers
from api.models import RestaurantMenu


class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantMenu
        fields = '__all__'