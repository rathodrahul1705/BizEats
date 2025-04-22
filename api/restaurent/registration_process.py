import os
import json
from rest_framework import status
from django.views import View
from django.http import JsonResponse
from rest_framework.views import APIView
from api.models import User
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from api.serializers import RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu

class RestaurantStoreStepOne(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, restaurant_id=None):
        # If restaurant_id is provided, fetch the existing restaurant
        if restaurant_id:
            try:
                restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id, user=request.user)
                serializer = RestaurantMasterSerializer(restaurant, data=request.data, partial=True, context={'request': request})
            except RestaurantMaster.DoesNotExist:
                return Response({"error": "Restaurant not found or you do not have permission to edit it."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # If no restaurant_id is provided, create a new restaurant
            serializer = RestaurantMasterSerializer(data=request.data, context={'request': request})

        # Validate and save the serializer
        if serializer.is_valid():
            restaurant = serializer.save()
            return Response({
                "message": "Restaurant updated successfully!" if restaurant_id else "Restaurant registered successfully!",
                "restaurant_id": restaurant.restaurant_id,
                "restaurant_name": restaurant.restaurant_name
            }, status=status.HTTP_201_CREATED if not restaurant_id else status.HTTP_200_OK)

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
            active_restaurants = RestaurantMaster.objects.filter(user=user, restaurant_status=1)
            live_restaurants = RestaurantMaster.objects.filter(user=user, restaurant_status=2)

            data = {
                "active_restaurants": RestaurantSerializerByStatus(active_restaurants, many=True).data,
                "live_restaurants": RestaurantSerializerByStatus(live_restaurants, many=True).data,
            }

            return Response(data, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class RestaurantByRestauranrtAPIView(APIView):
    def get(self, request, restaurant_id):
        try:
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
            serializer = RestaurantMasterNewSerializer(restaurant)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except RestaurantMaster.DoesNotExist:
            return Response({"error": "Restaurant not found"}, status=status.HTTP_404_NOT_FOUND)

class RestaurantMenueStore(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, restaurant_id, *args, **kwargs):
        # Get the restaurant instance
        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)

        # Extract form data
        item_name = request.data.get('item_name')
        item_price = request.data.get('item_price')
        description = request.data.get('description')
        category = request.data.get('category')
        spice_level = request.data.get('spice_level')
        preparation_time = request.data.get('preparation_time')
        serving_size = request.data.get('serving_size')
        availability = request.data.get('availability') == 'true'  # Convert to boolean
        stock_quantity = request.data.get('stock_quantity')
        food_type = request.data.get('food_type')
        cuisines = request.data.get('cuisines', '').split(',')  # Split cuisines by comma

        # Handle image upload
        item_image = request.FILES.get('item_image')
        image_path = None  # Default image path to None

        if item_image:
            # Define image directory inside media
            image_directory = os.path.join(settings.MEDIA_ROOT, 'menu_images')
            # Ensure directory exists
            os.makedirs(image_directory, exist_ok=True)
            # Save image and get the relative path
            image_path = default_storage.save(os.path.join('menu_images', item_image.name), item_image)

        # Create the menu item
        menu_item = RestaurantMenu.objects.create(
            restaurant=restaurant,
            item_name=item_name,
            item_price=item_price,
            description=description,
            category=category,
            spice_level=spice_level,
            preparation_time=preparation_time,
            serving_size=serving_size,
            availability=availability,
            stock_quantity=stock_quantity,
            food_type=food_type,
            item_image=image_path  # Save the relative image path
        )

        # Associate cuisines with the menu item
        for cuisine_name in cuisines:
            cuisine, _ = RestaurantCuisine.objects.get_or_create(restaurant=restaurant, cuisine_name=cuisine_name.strip())
            menu_item.cuisines.add(cuisine)

        menu_item.save()

        return Response(
            {
                "message": "Menu item added successfully",
                "menu_item_id": menu_item.id,
                "image_path": image_path  # Return saved image path
            },
            status=status.HTTP_201_CREATED
        )

class RestaurantMenueList(APIView):
    def get(self, request, restaurant_id, *args, **kwargs):
        # Get all menu items for the given restaurant_id
        menu_items = RestaurantMenu.objects.filter(restaurant_id=restaurant_id)

        # Convert the queryset to a list of dictionaries
        menu_data = [
            {
                "id": item.id,
                "restaurant_id": item.restaurant.restaurant_id,
                "restaurant_name": item.restaurant.restaurant_name,
                "item_name": item.item_name,
                "item_price": float(item.item_price),
                "description": item.description,
                "category": item.category,
                "spice_level": item.spice_level,
                "preparation_time": item.preparation_time,
                "serving_size": item.serving_size,
                "availability": item.availability,
                "food_type": item.food_type,
                "stock_quantity": item.stock_quantity,
                "cuisines": [cuisine.cuisine_name for cuisine in item.cuisines.all()],
                "item_image": request.build_absolute_uri(item.item_image.url) if item.item_image else None,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in menu_items
        ]

        return Response(menu_data, status=status.HTTP_200_OK)
    

class RestaurantMenueDetails(APIView):
    def get(self, request, menu_id, *args, **kwargs):
        # Get a single menu item for the given menu_id
        menu_item = RestaurantMenu.objects.filter(id=menu_id).first()

        # If no menu item found, return a 404 response
        if not menu_item:
            return Response({"error": "Menu item not found"}, status=status.HTTP_404_NOT_FOUND)

        # Prepare the response data
        menu_data = {
            "id": menu_item.id,
            "restaurant_id": menu_item.restaurant.restaurant_id,
            "restaurant_name": menu_item.restaurant.restaurant_name,
            "item_name": menu_item.item_name,
            "item_price": float(menu_item.item_price),
            "description": menu_item.description,
            "category": menu_item.category,
            "spice_level": menu_item.spice_level,
            "preparation_time": menu_item.preparation_time,
            "serving_size": menu_item.serving_size,
            "availability": menu_item.availability,
            "stock_quantity": menu_item.stock_quantity,
            "cuisines": [cuisine.cuisine_name for cuisine in menu_item.cuisines.all()],
            "item_image": request.build_absolute_uri(menu_item.item_image.url) if menu_item.item_image else None,
            "created_at": menu_item.created_at,
            "updated_at": menu_item.updated_at,
        }

        return Response(menu_data, status=status.HTTP_200_OK)

class RestaurantMenueUpdate(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request, restaurant_id, menu_id, *args, **kwargs):
        # Get the restaurant and menu item instances
        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)
        menu_item = get_object_or_404(RestaurantMenu, id=menu_id, restaurant=restaurant)

        # Extract form data
        item_name = request.data.get('item_name', menu_item.item_name)
        item_price = request.data.get('item_price', menu_item.item_price)
        description = request.data.get('description', menu_item.description)
        category = request.data.get('category', menu_item.category)
        spice_level = request.data.get('spice_level', menu_item.spice_level)
        preparation_time = request.data.get('preparation_time', menu_item.preparation_time)
        serving_size = request.data.get('serving_size', menu_item.serving_size)
        availability = request.data.get('availability')
        stock_quantity = request.data.get('stock_quantity', menu_item.stock_quantity)
        food_type = request.data.get('food_type', menu_item.food_type)
        cuisines = request.data.get('cuisines', '').split(',')  # Split cuisines by comma

        print("availability===",availability)

        # Handle image update
        item_image = request.FILES.get('item_image')

        if item_image:
            # Define image directory inside media
            image_directory = os.path.join(settings.MEDIA_ROOT, 'menu_images')
            os.makedirs(image_directory, exist_ok=True)  # Ensure directory exists

            # Delete old image if it exists
            if menu_item.item_image:
                old_image_path = menu_item.item_image.path  # Use .path to get the file path
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)

            # Save new image
            image_path = default_storage.save(os.path.join('menu_images', item_image.name), item_image)
            menu_item.item_image = image_path  # Update image field

        # Update menu item fields
        menu_item.item_name = item_name
        menu_item.item_price = item_price
        menu_item.description = description
        menu_item.category = category
        menu_item.spice_level = spice_level
        menu_item.preparation_time = preparation_time
        menu_item.serving_size = serving_size
        menu_item.availability = availability
        menu_item.stock_quantity = stock_quantity
        menu_item.food_type = food_type

        # Update cuisines
        if cuisines:
            menu_item.cuisines.clear()  # Remove existing cuisines
            for cuisine_name in cuisines:
                cuisine, _ = RestaurantCuisine.objects.get_or_create(restaurant=restaurant, cuisine_name=cuisine_name.strip())
                menu_item.cuisines.add(cuisine)

        menu_item.save()

        return Response(
            {
                "message": "Menu item updated successfully",
                "menu_item_id": menu_item.id,
                "image_path": menu_item.item_image.url if menu_item.item_image else None  # Return URL of the image
            },
            status=status.HTTP_200_OK
        )
    
class RestaurantMenueDelete(APIView):
    def delete(self, request, restaurant_id, menu_id, *args, **kwargs):
        """
        Delete a specific menu item for a restaurant.
        """
        try:
            restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)
            menu_item = get_object_or_404(RestaurantMenu, id=menu_id, restaurant=restaurant)

            if menu_item.item_image:
                image_path = menu_item.item_image.path
                if os.path.exists(image_path):
                    os.remove(image_path)

            menu_item.delete()

            return Response(
                {"message": "Menu item deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RestaurantListAPI(APIView):
    def get(self, request):
        try:
            live_restaurants = RestaurantMaster.objects.filter(restaurant_status=2)
            data = RestaurantSerializerByStatus(live_restaurants, many=True).data
            
            final_data = []
            for restaurant in data:

                location = restaurant.get("location", {})
                restaurant_location = ", ".join([
                    location.get("area_sector_locality", ""),
                    location.get("city", ""),
                ]).strip(", ")

                item_cuisines = ", ".join([c["cuisine_name"] for c in restaurant.get("cuisines", []) if c["cuisine_name"]])

                menu_items = restaurant.get("menu_items", [])
                total_price = sum(float(item["item_price"]) for item in menu_items)
                avg_price_range = round(total_price / len(menu_items), 2) if menu_items else 0
                image_profie = request.build_absolute_uri(restaurant["profile_image"]) if restaurant["profile_image"] else None,

                final_data.append({
                    "restaurant_id": restaurant["restaurant_id"],
                    "restaurant_name": restaurant["restaurant_name"],
                    "restaurant_image": image_profie,
                    "restaurant_location": restaurant_location,
                    "item_cuisines": item_cuisines,
                    "avg_price_range": round(avg_price_range)
                })

            return Response(final_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RestaurantDetailMenuView(APIView):
    def get(self, request, restaurant_id):
        try:
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
            serializer = RestaurantMasterSerializer(restaurant)
            
            restaurant_location = RestaurantLocation.objects.get(restaurant=restaurant)

            address_parts = [
                restaurant_location.area_sector_locality,
                restaurant_location.city
            ]
            address = ", ".join(filter(None, address_parts))

            time_required_to_reach_loc = 45  # This could be dynamic based on user location
            
            for item in serializer.data['menu_items']:
                if item["item_image"]:
                    item["item_image"] = request.build_absolute_uri(default_storage.url(item["item_image"]))
                    
            response_data = {
                'time_required_to_reach_loc': time_required_to_reach_loc,
                'restaurant_name': serializer.data['restaurant_name'],
                'Address': address,
                'rating': 4.5,
                'itemlist': serializer.data['menu_items']
            }
            
            return Response(response_data)
        except RestaurantMaster.DoesNotExist:
            return Response({"error": "Restaurant not found"}, status=404)
        except RestaurantLocation.DoesNotExist:
            return Response({"error": "Restaurant location not found"}, status=404)