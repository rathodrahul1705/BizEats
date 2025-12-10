from decimal import Decimal, InvalidOperation
import os
import json
from rest_framework import status
from django.views import View
from django.http import JsonResponse
from rest_framework.views import APIView
from api.aws.s3_client import get_s3_client
from api.models import CustomImage, FavouriteKitchen, RestaurantCategory, User
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
from api.offer.view import get_active_offers
from api.serializers import RestaurantMasterSerializer, RestaurantSerializerByStatus, RestaurantDetailSerializer, RestaurantMasterNewSerializer, RestaurantMenuSerializer, RestaurantListSerializer
from api.models import RestaurantMaster, RestaurantCuisine, RestaurantDeliveryTiming, RestaurantDocuments, RestaurantOwnerDetail, RestaurantLocation, RestaurantMenu
from django.utils.text import slugify
from datetime import datetime, timedelta
import pytz
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from api.storage_backends import optimize_image

User = get_user_model()
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
    """
    Step 2 of Restaurant Registration:
    - Upload Profile Image (optimized before saving to S3)
    - Save cuisines
    - Save delivery timings
    """

    def post(self, request, *args, **kwargs):
        try:
            restaurant_id = request.POST.get("restaurant_id")
            profile_image = request.FILES.get("profile_image")
            cuisines = json.loads(request.POST.get("cuisines"))
            delivery_timings = json.loads(request.POST.get("delivery_timings"))

            # Fetch restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # ------------------- 🔥 PROFILE IMAGE S3 UPLOAD -------------------
            if profile_image:

                # 1️⃣ Optimize image
                optimized_file = optimize_image(profile_image)

                # 2️⃣ Define S3 folder + file name
                file_key = f"restaurant_profile_images/{optimized_file.name}"

                # 3️⃣ Upload to S3
                s3 = get_s3_client()
                s3.upload_fileobj(
                    Fileobj=optimized_file.file,
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=file_key,
                    ExtraArgs={"ContentType": "image/jpeg"}
                )

                # 4️⃣ Save S3 key or URL into DB
                restaurant.profile_image = file_key
                restaurant.save()

            # ------------------- 🔥 SAVE CUISINES -------------------
            RestaurantCuisine.objects.filter(restaurant=restaurant).delete()
            for cuisine_data in cuisines:
                RestaurantCuisine.objects.create(
                    restaurant=restaurant,
                    **cuisine_data
                )

            # ------------------- 🔥 SAVE DELIVERY TIMINGS -------------------
            RestaurantDeliveryTiming.objects.filter(restaurant=restaurant).delete()
            for timing_data in delivery_timings:
                RestaurantDeliveryTiming.objects.create(
                    restaurant=restaurant,
                    **timing_data
                )

            # Build final S3 URL for frontend
            image_url = (
                f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3."
                f"{settings.AWS_S3_REGION_NAME}.amazonaws.com/{restaurant.profile_image}"
                if restaurant.profile_image else None
            )

            return JsonResponse(
                {
                    "message": "Step 2 data saved successfully",
                    "profile_image_url": image_url
                },
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

            # Fetch restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)

            # ------------------- 🔥 S3 PAN IMAGE UPLOAD -------------------
            pan_image_key = None

            if pan_image:
                optimized_pan = optimize_image(pan_image)
                file_key = f"pan_images/{optimized_pan.name}"

                s3 = get_s3_client()
                s3.upload_fileobj(
                    Fileobj=optimized_pan.file,
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=file_key,
                    ExtraArgs={"ContentType": "image/jpeg"}
                )

                pan_image_key = file_key  # Store S3 key in DB

            # ------------------- 🔥 S3 FSSAI IMAGE UPLOAD -------------------
            fssai_image_key = None

            if fssai_licence_image:
                optimized_fssai = optimize_image(fssai_licence_image)
                file_key = f"fssai_images/{optimized_fssai.name}"

                s3 = get_s3_client()
                s3.upload_fileobj(
                    Fileobj=optimized_fssai.file,
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=file_key,
                    ExtraArgs={"ContentType": "image/jpeg"}
                )

                fssai_image_key = file_key  # Store S3 key in DB

            # ------------------- 🔥 SAVE DOCUMENTS IN DB -------------------

            RestaurantDocuments.objects.update_or_create(
                restaurant=restaurant,
                defaults={
                    "pan_number": pan_number,
                    "name_as_per_pan": name_as_per_pan,
                    "registered_business_address": registered_business_address,
                    "pan_image": pan_image_key,
                    "fssai_number": fssai_number,
                    "fssai_expiry_date": fssai_expiry_date,
                    "fssai_licence_image": fssai_image_key,
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

            user = User.objects.get(id=user_id)

            if user.role == 2:
                active_restaurants = RestaurantMaster.objects.filter(restaurant_status=1)
                live_restaurants = RestaurantMaster.objects.all()
            else:
                # Only show restaurants linked to this user
                active_restaurants = RestaurantMaster.objects.filter(user=user, restaurant_status=1)
                live_restaurants = RestaurantMaster.objects.filter(user=user)

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
        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)

        # Collect form fields
        item_name = request.data.get('item_name')
        item_price = request.data.get('item_price')
        description = request.data.get('description')
        category = request.data.get('category')
        spice_level = request.data.get('spice_level')
        preparation_time = request.data.get('preparation_time')
        serving_size = request.data.get('serving_size')
        availability = request.data.get('availability') == 'true'
        stock_quantity = request.data.get('stock_quantity')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        food_type = request.data.get('food_type')
        discount_percent = request.data.get('discount_percent')
        discount_active = request.data.get('discount_active')
        cuisines = request.data.get('cuisines', '').split(',')

        # --------------------- 🔥 S3 IMAGE UPLOAD ----------------------------
        item_image = request.FILES.get('item_image')
        file_key = None

        if item_image:
            # 1️⃣ Optimize image
            optimized_file = optimize_image(item_image)

            # 2️⃣ Define S3 path
            file_key = f"menu_images/{optimized_file.name}"

            # 3️⃣ Upload to S3
            s3 = get_s3_client()
            s3.upload_fileobj(
                Fileobj=optimized_file.file,
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=file_key,
                ExtraArgs={"ContentType": "image/jpeg"}
            )

        # --------------------------------------------------------------------

        # Create menu item
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
            discount_percent=discount_percent,
            discount_active=discount_active,
            start_time=start_time,
            end_time=end_time,
            food_type=food_type,
            item_image=file_key  # Save S3 key (NOT a file)
        )

        # Save cuisines
        for cuisine_name in cuisines:
            cuisine, _ = RestaurantCuisine.objects.get_or_create(
                restaurant=restaurant, cuisine_name=cuisine_name.strip()
            )
            menu_item.cuisines.add(cuisine)

        menu_item.save()

        # Build S3 public URL to return
        image_url = (
            f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3."
            f"{settings.AWS_S3_REGION_NAME}.amazonaws.com/{file_key}"
            if file_key else None
        )

        return Response(
            {
                "message": "Menu item added successfully",
                "menu_item_id": menu_item.id,
                "image_url": image_url
            },
            status=status.HTTP_201_CREATED
        )

class RestaurantMenueList(APIView):
    def get(self, request, restaurant_id, *args, **kwargs):
        menu_items = RestaurantMenu.objects.filter(restaurant_id=restaurant_id)
        menu_data = []
        for item in menu_items:
            category = RestaurantCategory.objects.filter(id=item.category).first()
            menu_data.append({
                "id": item.id,
                "restaurant_id": item.restaurant.restaurant_id,
                "restaurant_name": item.restaurant.restaurant_name,
                "item_name": item.item_name,
                "item_price": float(item.item_price),
                "description": item.description,
                "category": category.category_name,
                "category_id": category.id,
                "spice_level": item.spice_level,
                "preparation_time": item.preparation_time,
                "serving_size": item.serving_size,
                "availability": item.availability,
                "buy_one_get_one_free": item.buy_one_get_one_free,
                "food_type": item.food_type,
                "stock_quantity": item.stock_quantity,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "discount_percent": item.discount_percent,
                "discount_active": item.discount_active,
                "cuisines": [cuisine.cuisine_name for cuisine in item.cuisines.all()],
                "item_image": request.build_absolute_uri(item.item_image.url) if item.item_image else "/food_image_eatoor.png",
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            })

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
        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)
        menu_item = get_object_or_404(RestaurantMenu, id=menu_id, restaurant=restaurant)

        # Extract form data
        item_name = request.data.get('item_name', menu_item.item_name)
        item_price = request.data.get('item_price', menu_item.item_price)
        description = request.data.get('description', menu_item.description)
        category_id = request.data.get('category_id')
        spice_level = request.data.get('spice_level', menu_item.spice_level)
        preparation_time = request.data.get('preparation_time', menu_item.preparation_time)
        serving_size = request.data.get('serving_size', menu_item.serving_size)
        buy_one_get_one_free = request.data.get('buy_one_get_one_free')
        availability = request.data.get('availability')
        stock_quantity = request.data.get('stock_quantity', menu_item.stock_quantity)
        food_type = request.data.get('food_type', menu_item.food_type)

        cuisines = request.data.get('cuisines', '').split(',')

        start_time = request.data.get('start_time', '')
        end_time = request.data.get('end_time', '')
        discount_active = request.data.get('discount_active', '')

        raw_discount = request.data.get('discount_percent', '0.00')
        try:
            discount_percent = Decimal(raw_discount.strip()) if raw_discount.strip() else Decimal('0.00')
        except Exception:
            discount_percent = Decimal('0.00')

        # --------------------- 🔥 S3 IMAGE UPDATE PROCESS ---------------------

        item_image = request.FILES.get('item_image')

        if item_image:
            # 1️⃣ Optimize the uploaded image
            optimized_file = optimize_image(item_image)

            # 2️⃣ Generate S3 key
            file_key = f"menu_images/{optimized_file.name}"

            # 3️⃣ Get S3 client
            s3 = get_s3_client()

            # 4️⃣ Upload to S3
            s3.upload_fileobj(
                Fileobj=optimized_file.file,
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=file_key,
                ExtraArgs={"ContentType": "image/jpeg"}
            )

            # 5️⃣ Generate Public URL
            file_url = (
                f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3."
                f"{settings.AWS_S3_REGION_NAME}.amazonaws.com/{file_key}"
            )

            # 6️⃣ Remove old image from S3 (optional)
            if menu_item.item_image:
                try:
                    old_key = str(menu_item.item_image)
                    if old_key:
                        s3.delete_object(
                            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                            Key=old_key.replace(settings.AWS_S3_BASE_URL, "")
                        )
                except Exception:
                    pass

            # 7️⃣ Save the new S3 key in the model (NOT FileField)
            menu_item.item_image = file_key

        # --------------------------------------------------------------------

        # Update normal fields
        menu_item.item_name = item_name
        menu_item.item_price = item_price
        menu_item.description = description
        menu_item.category = category_id
        menu_item.spice_level = spice_level
        menu_item.preparation_time = preparation_time
        menu_item.serving_size = serving_size
        menu_item.availability = availability
        menu_item.stock_quantity = stock_quantity
        menu_item.food_type = food_type
        menu_item.buy_one_get_one_free = buy_one_get_one_free
        menu_item.start_time = start_time
        menu_item.end_time = end_time
        menu_item.discount_percent = discount_percent
        menu_item.discount_active = discount_active

        # Update cuisines list
        if cuisines:
            menu_item.cuisines.clear()
            for cuisine_name in cuisines:
                cuisine, _ = RestaurantCuisine.objects.get_or_create(
                    restaurant=restaurant,
                    cuisine_name=cuisine_name.strip()
                )
                menu_item.cuisines.add(cuisine)

        menu_item.save()

        return Response(
            {
                "message": "Menu item updated successfully",
                "menu_item_id": menu_item.id,
                "image_url": (
                    f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3."
                    f"{settings.AWS_S3_REGION_NAME}.amazonaws.com/{menu_item.item_image}"
                    if menu_item.item_image else None
                )
            },
            status=status.HTTP_200_OK
        )    
@method_decorator(csrf_exempt, name="dispatch")
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
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        try:
            user = request.user if request.user.is_authenticated else None

            # Get all live restaurants
            live_restaurants = RestaurantMaster.objects.filter(restaurant_status__in=[2, 3])
            serialized_data = RestaurantSerializerByStatus(live_restaurants, many=True).data

            # Fetch user's favourite restaurant IDs if logged in
            favourite_ids = set()
            if user:
                favourite_ids = set(
                    FavouriteKitchen.objects.filter(user=user).values_list('restaurant_id', flat=True)
                )

            final_data = []
            for restaurant in serialized_data:
                location = restaurant.get("location", {})
                area = location.get("area_sector_locality", "")
                city = location.get("city", "")
                restaurant_name = restaurant.get("restaurant_name", "")

                restaurant_location = ", ".join(filter(None, [area, city]))

                item_cuisines = ", ".join([
                    c["cuisine_name"] for c in restaurant.get("cuisines", []) if c.get("cuisine_name")
                ][:2])

                menu_items = restaurant.get("menu_items", [])
                total_price = sum(float(item["item_price"]) for item in menu_items)
                avg_price_range = round(total_price / len(menu_items), 2) if menu_items else 0

                image_profile = request.build_absolute_uri(restaurant["profile_image"]) if restaurant.get("profile_image") else None

                seo_slug = slugify(f"{restaurant_name} {area} {city}")
                seo_city = slugify(f"{city}")

                restaurant_id = restaurant.get("restaurant_id")

                final_data.append({
                    "restaurant_id": restaurant_id,
                    "restaurant_name": restaurant_name,
                    "restaurant_slug": seo_slug,
                    "restaurant_image": image_profile,
                    "restaurant_location": restaurant_location,
                    "item_cuisines": item_cuisines,
                    "avg_price_range": round(avg_price_range),
                    "restaurant_city": seo_city,
                    "restaurant_status": restaurant.get("restaurant_status"),
                    "is_favourite": restaurant_id in favourite_ids
                })

            category_list_images = CustomImage.objects.filter(type_of_images=5)
            final_category_image = [
                {
                    "id": img.id,
                    "name": img.title,
                    "icon": img.image.url  # S3 URL
                }
                    for img in category_list_images
            ]

            # Feature Kitchen List (Top 10 by avg_price_range)
            feature_kitchen_list = sorted(final_data, key=lambda r: r.get("avg_price_range", 0), reverse=True)[:10]

            return Response({
                "success": True,
                "data": {
                    "CategoryList": final_category_image,
                    "FeatureKitchenList": feature_kitchen_list,
                    "KitchenList": final_data
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class RestaurantDetailMenuView(APIView):
    def get(self, request, restaurant_id, offer=None):
        try:
            restaurantStatuses = {
                0: {"label": "Inactive", "color": "danger"},
                1: {"label": "Pending Approval", "color": "warning"},
                2: {"label": "Active", "color": "success"},
                3: {"label": "Closed", "color": "dark"},
                4: {"label": "Suspended", "color": "secondary"},
            }

            # Fetch and serialize restaurant
            restaurant = RestaurantMaster.objects.get(restaurant_id=restaurant_id)
            serializer = RestaurantMasterSerializer(restaurant)
            restaurant_data = serializer.data.copy()
            image_profile = request.build_absolute_uri(restaurant_data["profile_image"]) if restaurant_data.get("profile_image") else None

            restaurant_status_value = restaurant_data.get("restaurant_status", 0)
            status_meta = restaurantStatuses.get(restaurant_status_value, {
                "label": "Unknown", "color": "secondary"
            })

            restaurant_location = RestaurantLocation.objects.get(restaurant=restaurant)
            restaurant_document = RestaurantDocuments.objects.get(restaurant=restaurant)

            address = ", ".join(filter(None, [
                restaurant_location.area_sector_locality,
                restaurant_location.city
            ]))

            # Get current time in IST (UTC+5:30)
            ist = pytz.timezone('Asia/Kolkata')
            current_datetime = datetime.now(ist)
            current_day = current_datetime.strftime("%A")
            current_time = current_datetime.time()
            
            delivery_timings_qs = RestaurantDeliveryTiming.objects.filter(
                restaurant=restaurant, day=current_day
            )

            delivery_timings = []
            is_open = False
            today_start_time = None
            today_end_time = None

            for timing in delivery_timings_qs:
                start = timing.start_time
                end = timing.end_time
                delivery_timings.append({
                    "day": timing.day,
                    "open": timing.open,
                    "start_time": start.strftime("%H:%M") if start else None,
                    "end_time": end.strftime("%H:%M") if end else None,
                })

                if timing.open and start and end and restaurant_status_value == 2:
                    # Convert time objects to datetime for comparison
                    start_datetime = datetime.combine(current_datetime.date(), start)
                    end_datetime = datetime.combine(current_datetime.date(), end)
                    
                    # Handle cases where end time crosses midnight (e.g., 23:00 to 01:00)
                    if end < start:
                        end_datetime += timedelta(days=1)
                    
                    current_datetime_no_tz = datetime.combine(current_datetime.date(), current_time)
                    
                    if start_datetime <= current_datetime_no_tz <= end_datetime:
                        is_open = True
                    
                    # Set today's timings (regardless of whether currently open)
                    today_start_time = start
                    today_end_time = end

            if restaurant_status_value != 2:
                is_open = False

            time_required_to_reach_loc = 45

            items = restaurant_data.get("menu_items", [])
            processed_items = []

            for item in items:
                category = RestaurantCategory.objects.filter(id=item['category']).first()
                item['category'] = category.category_name
                if item.get("item_image"):
                    item["item_image"] = request.build_absolute_uri(
                        default_storage.url(item["item_image"])
                    )
                else:
                    item["item_image"] = "/food_image_eatoor.png"

                if offer:
                    if offer == "buy-one-get-one-free" and item.get("buy_one_get_one_free"):
                        processed_items.append(item)
                else:
                    processed_items.append(item)

            active_offer_list = get_active_offers()
            
            response_data = {
                "time_required_to_reach_loc": time_required_to_reach_loc,
                "restaurant_image": image_profile,
                "restaurant_name": restaurant_data.get("restaurant_name"),
                "restaurant_status": restaurant_status_value,
                "restaurant_current_status": {
                    "value": restaurant_status_value,
                    "label": status_meta["label"],
                    "color": status_meta["color"],
                    "is_open": is_open
                },
                "Address": address,
                "rating": 4.5,
                "min_order": restaurant_data.get("min_order", 0),
                "opening_time": today_start_time.strftime("%H:%M") if today_start_time else None,
                "closing_time": today_end_time.strftime("%H:%M") if today_end_time else None,
                "itemlist": processed_items,
                "fssai_number": restaurant_document.fssai_number,
                "active_offer_list": active_offer_list,
                "delivery_timings": delivery_timings,
            }

            return Response(response_data)

        except RestaurantMaster.DoesNotExist:
            return Response({"error": "Restaurant not found"}, status=404)
        except RestaurantLocation.DoesNotExist:
            return Response({"error": "Restaurant location not found"}, status=404)
        except RestaurantDocuments.DoesNotExist:
            return Response({"error": "Restaurant documents not found"}, status=404)
        
class RestaurantStatusUpdate(APIView):
    def patch(self, request, restaurant_id):
        try:
            new_status = int(request.data.get("status"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Invalid or missing status value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = [0, 1, 2, 3, 4]
        if new_status not in valid_statuses:
            return Response(
                {"detail": "Invalid status value."},
                status=status.HTTP_400_BAD_REQUEST
            )

        restaurant = get_object_or_404(RestaurantMaster, restaurant_id=restaurant_id)

        if restaurant.user != request.user:
            return Response(
                {"detail": "You do not have permission to update this restaurant."},
                status=status.HTTP_403_FORBIDDEN
            )

        restaurant.restaurant_status = new_status
        restaurant.save()

        return Response(
            {
                "detail": "Restaurant status updated successfully.",
                "restaurant_id": restaurant_id,
                "new_status": new_status
            },
            status=status.HTTP_200_OK
        )