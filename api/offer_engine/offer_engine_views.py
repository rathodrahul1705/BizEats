import logging
from datetime import datetime, timedelta

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q

from api.models import RestaurantMenu
from api.offer_engine.offer_engine import get_active_banners, apply_offer_logic
from api.offer_engine.offer_engine_menu_serializer import MenuSerializer


# ✅ Initialize logger
logger = logging.getLogger(__name__)


@api_view(['GET'])
def dynamic_offer_api(request):
    try:
        logger.info("🔵 dynamic_offer_api called")
        logger.debug(f"Query Params: {request.GET}")

        # 🔥 OLD PARAM STYLE
        offer_type = request.GET.get('offer_type')
        sub_filter = request.GET.get('sub_filter')
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        restaurant_id = request.GET.get('restaurant_id')
        sort_by = request.GET.get('sort_by', 'item_price')

        queryset = RestaurantMenu.objects.filter(availability=True)
        logger.debug(f"Initial queryset count: {queryset.count()}")

        # =========================
        # 🎯 FILTERS
        # =========================

        if restaurant_id:
            queryset = queryset.filter(restaurant_id=restaurant_id)
            logger.info(f"Filter applied: restaurant_id={restaurant_id}")

        if min_price:
            queryset = queryset.filter(item_price__gte=min_price)
            logger.info(f"Filter applied: min_price={min_price}")

        if max_price:
            queryset = queryset.filter(item_price__lte=max_price)
            logger.info(f"Filter applied: max_price={max_price}")

        if sub_filter:
            queryset = queryset.filter(
                Q(category__icontains=sub_filter) |
                Q(item_name__icontains=sub_filter) |
                Q(description__icontains=sub_filter)
            )
            logger.info(f"Filter applied: sub_filter={sub_filter}")

        # =========================
        # 🎯 OFFER LOGIC
        # =========================

        if offer_type:
            logger.info(f"Applying offer logic: {offer_type}")
            queryset = apply_offer_logic(queryset, offer_type)

        # =========================
        # 🎯 SORTING
        # =========================

        queryset = queryset.order_by(sort_by)
        logger.info(f"Sorting applied: {sort_by}")

        # =========================
        # 🎯 PAGINATION
        # =========================

        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 30))

        start = (page - 1) * limit
        end = start + limit

        total = queryset.count()
        queryset = queryset[start:end]

        logger.info(f"Pagination: page={page}, limit={limit}, total={total}")

        serializer = MenuSerializer(queryset, many=True)

        return Response({
            "success": True,
            "total": total,
            "page": page,
            "limit": limit,
            "data": serializer.data
        })

    except Exception as e:
        logger.error("❌ Error in dynamic_offer_api", exc_info=True)
        return Response({
            "success": False,
            "error": str(e)
        })


@api_view(['GET'])
def banner_list_api(request):
    try:
        logger.info("🔵 banner_list_api called")

        banners = get_active_banners()

        logger.info(f"Fetched {len(banners)} banners")

        return Response({
            "success": True,
            "message": "Banners fetched successfully",
            "data": banners,
            "total": len(banners)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error("❌ Error in banner_list_api", exc_info=True)
        return Response({
            "success": False,
            "message": str(e),
            "data": []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)