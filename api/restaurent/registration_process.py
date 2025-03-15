import json
from rest_framework import status
from django.views import View
from django.http import JsonResponse
from rest_framework.views import APIView
from api.models import User
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from api.serializers import RestaurantMasterSerializer, RestaurantSerializer
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments

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

@method_decorator(csrf_exempt, name="dispatch")
class RestaurantStoreStepTwo(View):
    def post(self, request, *args, **kwargs):
        try:
            # Extract form data
            restaurant_id = request.POST.get("restaurant_id")
            profile_image = request.FILES.get("profile_image")
            cuisines = json.loads(request.POST.get("cuisines"))  # Parse JSON string
            delivery_timings = json.loads(request.POST.get("delivery_timings"))  # Parse JSON string

            # Fetch the restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # Save the profile image (if provided)
            if profile_image:
                restaurant.profile_image = profile_image
                restaurant.save()

            # Save cuisines (delete existing cuisines and create new ones)
            RestaurantCuisine.objects.filter(restaurant=restaurant).delete()
            for cuisine_data in cuisines:
                RestaurantCuisine.objects.create(restaurant=restaurant, **cuisine_data)

            # Save delivery timings (delete existing timings and create new ones)
            RestaurantDeliveryTiming.objects.filter(restaurant=restaurant).delete()
            for timing_data in delivery_timings:
                RestaurantDeliveryTiming.objects.create(restaurant=restaurant, **timing_data)

            return JsonResponse(
                {"message": "Step 2 data saved successfully"},
                status=201,
            )

        except RestaurantMaster.DoesNotExist:
            return JsonResponse(
                {"detail": "Restaurant not found. Please complete Step 1 first."},
                status=404,
            )
        except Exception as e:
            return JsonResponse(
                {"detail": str(e)},
                status=400,
            )

@method_decorator(csrf_exempt, name="dispatch")
class RestaurantStoreStepThree(View):
    def post(self, request, *args, **kwargs):
        try:
            # Extract form data
            restaurant_id = request.POST.get("restaurant_id")
            pan_number = request.POST.get("pan_number")
            name_as_per_pan = request.POST.get("name_as_per_pan")
            registered_business_address = request.POST.get("registered_business_address")
            pan_image = request.FILES.get("pan_image")
            fssai_number = request.POST.get("fssai_number")
            fssai_expiry_date = request.POST.get("fssai_expiry_date")
            fssai_licence_image = request.FILES.get("fssai_licence_image")
            bank_account_number = request.POST.get("bank_account_number")
            bank_account_ifsc_code = request.POST.get("bank_account_ifsc_code")
            bank_account_type = request.POST.get("bank_account_type")

            # Fetch the restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # Create or update restaurant documents
            RestaurantDocuments.objects.update_or_create(
                restaurant=restaurant,
                defaults={
                    "pan_number": pan_number,
                    "name_as_per_pan": name_as_per_pan,
                    "registered_business_address": registered_business_address,
                    "pan_image": pan_image,
                    "fssai_number": fssai_number,
                    "fssai_expiry_date": fssai_expiry_date,
                    "fssai_licence_image": fssai_licence_image,
                    "bank_account_number": bank_account_number,
                    "bank_account_ifsc_code": bank_account_ifsc_code,
                    "bank_account_type": bank_account_type,
                }
            )

            return JsonResponse(
                {"message": "Step 3 data saved successfully"},
                status=201,
            )

        except RestaurantMaster.DoesNotExist:
            return JsonResponse(
                {"detail": "Restaurant not found. Please complete Step 1 first."},
                status=404,
            )
        except Exception as e:
            return JsonResponse(
                {"detail": str(e)},
                status=400,
            )

@method_decorator(csrf_exempt, name="dispatch")
class RestaurantStoreStepFour(View):
    def post(self, request, *args, **kwargs):
        try:
            # Extract form data
            restaurant_id = request.POST.get("restaurant_id")
            partner_contract_doc = request.FILES.get("partner_contract_doc")  # File upload
            is_contract_checked = request.POST.get("is_contract_checked") == "true"  # Boolean field

            # Fetch the restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # Update restaurant documents
            restaurant_documents, created = RestaurantDocuments.objects.get_or_create(restaurant=restaurant)
            restaurant_documents.partner_contract_doc = partner_contract_doc
            restaurant_documents.is_contract_checked = is_contract_checked
            restaurant_documents.save()

            return JsonResponse(
                {"message": "Step 4 data saved successfully"},
                status=201,
            )

        except RestaurantMaster.DoesNotExist:
            return JsonResponse(
                {"detail": "Restaurant not found. Please complete Step 1 first."},
                status=404,
            )
        except Exception as e:
            return JsonResponse(
                {"detail": str(e)},
                status=400,
            )
        
class RestaurantByUserAPIView(APIView):
    def get(self, request, user_id):
        try:
            # Fetch the user
            user = User.objects.get(id=user_id)
            # Fetch all restaurants associated with the user
            restaurants = RestaurantMaster.objects.filter(user=user)
            # Serialize the data
            serializer = RestaurantSerializer(restaurants, many=True)
            # Return the response
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)