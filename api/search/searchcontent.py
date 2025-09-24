# views.py
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from api.models import RestaurantMaster, RestaurantMenu
from api.search_serialicers import MenuItemSerializer, RestaurantMenuSerializer, RestaurantSerializer

# Configure logger
logger = logging.getLogger(__name__)

@api_view(["GET"])
def search_suggestions(request):
    """
    Autocomplete/search API with logging.
    """
    q = request.GET.get("q", "").strip()
    logger.info(f"search_suggestions called with query: '{q}'")

    if not q:
        logger.info("Empty query received")
        return Response({"query": q, "menus": [], "restaurants": []})

    menus_response = []
    restaurants_response = []

    # -------- Step 1: Menu-first search --------
    menu_qs = RestaurantMenu.objects.filter(
        Q(item_name__icontains=q) | Q(description__icontains=q),
        availability=True
    ).select_related("restaurant").prefetch_related("cuisines").distinct()  # distinct BEFORE slicing

    logger.info(f"Found {menu_qs.count()} menu items matching query")

    if menu_qs.exists():
        # Group menu items by item_name
        menu_grouped = {}
        for item in menu_qs:
            key = item.item_name
            if key not in menu_grouped:
                menu_grouped[key] = []
            menu_grouped[key].append(item)

        for menu_name, items in menu_grouped.items():
            menus_response.append({
                "menu_name": menu_name,
                "items": [
                    {
                        "id": i.id,
                        "item_price": str(i.item_price),
                        "item_image": i.item_image.url if i.item_image else None,
                        "category": i.category,
                        "food_type": i.food_type,
                        "availability": i.availability,
                        "restaurant": {
                            "restaurant_id": i.restaurant.restaurant_id,
                            "restaurant_name": i.restaurant.restaurant_name,
                            "profile_image": i.restaurant.profile_image.url if i.restaurant.profile_image else None,
                            "restaurant_status": i.restaurant.restaurant_status,
                        }
                    } for i in items
                ]
            })

        # List of unique restaurants serving these menu items
        restaurant_ids = list(menu_qs.values_list("restaurant__restaurant_id", flat=True).distinct())
        logger.info(f"Unique restaurants serving menu items: {restaurant_ids}")

        restaurants_qs = RestaurantMaster.objects.filter(restaurant_id__in=restaurant_ids).prefetch_related("cuisines")
        for r in restaurants_qs:
            restaurants_response.append({
                "restaurant_id": r.restaurant_id,
                "restaurant_name": r.restaurant_name,
                "profile_image": r.profile_image.url if r.profile_image else None,
                "restaurant_status": r.restaurant_status,
                "cuisines": [{"id": c.id, "cuisine_name": c.cuisine_name} for c in r.cuisines.all()]
            })

        logger.info(f"Returning {len(menus_response)} menus and {len(restaurants_response)} restaurants")
        return Response({
            "query": q,
            "menus": menus_response,
            "restaurants": restaurants_response
        })

    # -------- Step 2: Fallback - Kitchen search --------
    restaurant_qs = RestaurantMaster.objects.filter(
        restaurant_name__icontains=q
    ).prefetch_related("cuisines", "menu_items").distinct()  # distinct BEFORE slicing

    logger.info(f"Fallback restaurant search found {restaurant_qs.count()} restaurants")

    for r in restaurant_qs:
        menu_items = r.menu_items.filter(availability=True)
        restaurants_response.append({
            "restaurant_id": r.restaurant_id,
            "restaurant_name": r.restaurant_name,
            "profile_image": r.profile_image.url if r.profile_image else None,
            "restaurant_status": r.restaurant_status,
            "cuisines": [{"id": c.id, "cuisine_name": c.cuisine_name} for c in r.cuisines.all()],
            "menu_items": [
                {
                    "id": m.id,
                    "item_name": m.item_name,
                    "item_price": str(m.item_price),
                    "item_image": m.item_image.url if m.item_image else None,
                    "category": m.category,
                    "food_type": m.food_type,
                    "availability": m.availability
                } for m in menu_items
            ]
        })

    logger.info(f"Returning {len(restaurants_response)} restaurants from fallback search")
    return Response({
        "query": q,
        "menus": [],
        "restaurants": restaurants_response
    })


@api_view(["GET"])
def search_results(request):
    q = request.GET.get("q", "").strip()
    logger.info(f"search_results called with query: '{q}'")

    if not q:
        logger.info("Empty query received")
        return Response({"menus": [], "restaurants": []})

    # Step 1: Search menu items
    menu_items_qs = RestaurantMenu.objects.filter(
        Q(item_name__icontains=q) | Q(description__icontains=q),
        availability=True
    ).select_related("restaurant")

    logger.info(f"Found {menu_items_qs.count()} menu items matching query")

    if menu_items_qs.exists():
        # Group menu items by item_name
        menu_grouped = {}
        for item in menu_items_qs:
            key = item.item_name
            if key not in menu_grouped:
                menu_grouped[key] = []
            menu_grouped[key].append(item)

        # Build menu response
        menus = []
        for menu_name, items in menu_grouped.items():
            menus.append({
                "menu_name": menu_name,
                "items": MenuItemSerializer(items, many=True).data
            })

        # List of unique restaurants serving the menu
        restaurant_ids = menu_items_qs.values_list("restaurant__restaurant_id", flat=True).distinct()
        restaurants = RestaurantMaster.objects.filter(restaurant_id__in=restaurant_ids)
        restaurant_data = [{"restaurant_id": r.restaurant_id, "restaurant_name": r.restaurant_name} for r in restaurants]

        logger.info(f"Returning {len(menus)} menus and {len(restaurant_data)} restaurants")
        return Response({
            "query": q,
            "menus": menus,
            "restaurants": restaurant_data
        })

    # Step 2: If no menu items found, search by kitchen/restaurant name
    restaurants_qs = RestaurantMaster.objects.filter(restaurant_name__icontains=q).prefetch_related("menu_items")
    restaurants = []
    logger.info(f"Fallback restaurant search found {restaurants_qs.count()} restaurants")

    for rest in restaurants_qs:
        menu_items = rest.menu_items.filter(availability=True)
        restaurants.append({
            "restaurant_id": rest.restaurant_id,
            "restaurant_name": rest.restaurant_name,
            "menu_items": MenuItemSerializer(menu_items, many=True).data
        })

    logger.info(f"Returning {len(restaurants)} restaurants from fallback search")
    return Response({
        "query": q,
        "menus": [],
        "restaurants": restaurants
    })
