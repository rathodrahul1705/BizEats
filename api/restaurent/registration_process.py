from rest_framework import status
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming
from api.serializers import RestaurantMasterSerializer, RestaurantStep2Serializer

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
    def post(self, request, *args, **kwargs):
        # Parse the incoming data using the serializer
        serializer = RestaurantStep2Serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Extract validated data
        data = serializer.validated_data
        restaurant_id = data["restaurant_id"]
        profile_image = data.get("profile_image")
        cuisines = data["cuisines"]
        delivery_timings = data["delivery_timings"]

        # Fetch the restaurant
        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)

        # Save the profile image (if provided)
        if profile_image:
            restaurant.profile_image = profile_image
            restaurant.save()

        # Save cuisines
        for cuisine_data in cuisines:
            RestaurantCuisine.objects.create(restaurant=restaurant, **cuisine_data)

        # Save delivery timings
        for timing_data in delivery_timings:
            RestaurantDeliveryTiming.objects.create(restaurant=restaurant, **timing_data)

        return Response(
            {"message": "Step 2 data saved successfully"},
            status=status.HTTP_201_CREATED,
        )