# favourites/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import FavouriteKitchen
from api.models import RestaurantMaster
from .serializers import FavouriteKitchenSerializer

class FavouriteKitchenToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        restaurant_id = request.data.get("restaurant_id")

        if not restaurant_id:
            return Response({"error": "restaurant_id is required."}, status=400)

        try:
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
        except RestaurantMaster.DoesNotExist:
            return Response({"error": "Kitchen not found."}, status=404)

        fav, created = FavouriteKitchen.objects.get_or_create(user=user, restaurant=restaurant)

        if not created:
            fav.delete()
            return Response({"message": "Removed from favourites."})
        else:
            return Response({"message": "Added to favourites."})


class FavouriteKitchenListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        favourites = FavouriteKitchen.objects.filter(user=request.user).select_related('restaurant')
        serializer = FavouriteKitchenSerializer(favourites, many=True, context={'request': request})
        return Response(serializer.data)
