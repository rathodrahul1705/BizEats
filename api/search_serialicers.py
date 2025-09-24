# serializers.py
from rest_framework import serializers
from api.models import RestaurantMaster, RestaurantMenu, RestaurantCuisine, RestaurantLocation


class RestaurantCuisineSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantCuisine
        fields = ["id", "cuisine_name"]


class RestaurantLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantLocation
        fields = ["city", "area_sector_locality", "latitude", "longitude"]


class RestaurantSerializer(serializers.ModelSerializer):
    cuisines = RestaurantCuisineSerializer(many=True, read_only=True)
    restaurant_location = RestaurantLocationSerializer(read_only=True)

    class Meta:
        model = RestaurantMaster
        fields = ["restaurant_id", "restaurant_name", "profile_image", "restaurant_status", "cuisines", "restaurant_location"]


class RestaurantMenuSerializer(serializers.ModelSerializer):
    restaurant = RestaurantSerializer(read_only=True)
    cuisines = RestaurantCuisineSerializer(many=True, read_only=True)

    class Meta:
        model = RestaurantMenu
        fields = [
            "id", "item_name", "item_price", "discount_percent", "discount_active",
            "description", "category", "cuisines", "item_image", "spice_level",
            "preparation_time", "serving_size", "availability", "stock_quantity",
            "food_type", "buy_one_get_one_free", "start_time", "end_time", "restaurant"
    ]


class MenuItemSerializer(serializers.ModelSerializer):
    restaurant = RestaurantSerializer(read_only=True)

    class Meta:
        model = RestaurantMenu
        fields = ["id", "item_name", "item_price", "availability", "restaurant"]


class RestaurantWithMenuSerializer(serializers.ModelSerializer):
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = RestaurantMaster
        fields = ["restaurant_id", "restaurant_name", "menu_items"]
