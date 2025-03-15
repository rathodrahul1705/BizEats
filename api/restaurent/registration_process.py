from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.serializers import RestaurantMasterSerializer

class RestaurantStoreStepOne(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RestaurantMasterSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            restaurant = serializer.save()
            return Response({
                "message": "Restaurant registered successfully!",
                "restaurant_id": restaurant.restaurant_id,
                "restaurant_name": restaurant.restaurant_name
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RestaurantStoreStepTwo(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RestaurantMasterSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            restaurant = serializer.save()
            return Response({
                "message": "Restaurant registered successfully!",
                "restaurant_id": restaurant.restaurant_id,
                "restaurant_name": restaurant.restaurant_name
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
