import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from api.models import OfferDetail, RestaurantMenu
from api.offer.offer_serializers import OfferSerializer, OfferMenuSerializer

# ✅ Logger setup
logger = logging.getLogger(__name__)


# ----------------------------------------
# CHECK CREDIT OFFER
# ----------------------------------------
def check_credit_offer(offer_type, sub_filter):
    logger.info(f"[CHECK_CREDIT_OFFER] offer_type={offer_type}, sub_filter={sub_filter}")

    if not offer_type or not sub_filter:
        logger.warning("[CHECK_CREDIT_OFFER] Missing parameters")
        return {
            "success": False,
            "error": "offer_type and sub_filter are required"
        }

    offer = OfferDetail.objects.filter(
        offer_type=offer_type,
        sub_filter=sub_filter,
        is_active=OfferDetail.APPROVED
    ).first()

    if not offer:
        logger.info("[CHECK_CREDIT_OFFER] No offer found")
        return {
            "success": False,
            "message": "No offer available"
        }

    now = timezone.now()
    logger.debug(f"[CHECK_CREDIT_OFFER] now={now}, valid_from={offer.valid_from}, valid_to={offer.valid_to}")

    if offer.valid_from and now < offer.valid_from:
        logger.info(f"[CHECK_CREDIT_OFFER] Offer not started | valid_from={offer.valid_from}")
        return {
            "success": False,
            "message": "Offer not started yet",
            "valid_from": offer.valid_from
        }

    if offer.valid_to and now > offer.valid_to:
        logger.info(f"[CHECK_CREDIT_OFFER] Offer expired | valid_to={offer.valid_to}")
        return {
            "success": False,
            "message": "Offer expired",
            "valid_to": offer.valid_to
        }

    if not offer.is_valid:
        logger.warning(f"[CHECK_CREDIT_OFFER] Offer invalid | offer_id={offer.id}")
        return {
            "success": False,
            "message": "Offer expired or invalid"
        }

    serializer = OfferSerializer(offer)

    logger.info(f"[CHECK_CREDIT_OFFER] Offer valid | offer_id={offer.id}")

    return {
        "success": True,
        "message": "Offer available",
        "data": serializer.data
    }


# ----------------------------------------
# GET ACTIVE OFFERS
# ----------------------------------------
def get_active_offers():
    logger.info("[GET_ACTIVE_OFFERS] Fetching active offers")

    now = timezone.now()
    offers = OfferDetail.objects.filter(
        is_active=OfferDetail.APPROVED
    )

    active_offers = []

    for offer in offers:
        if not offer.is_valid:
            logger.debug(f"[GET_ACTIVE_OFFERS] Skipping invalid offer | offer_id={offer.id}")
            continue

        title = offer.get_offer_type_display()
        details = {}

        if offer.offer_type == 'coupon_code':
            details["code"] = offer.code
            details["discount"] = f"{offer.discount_value}{'%' if offer.discount_type == 'percentage' else ''}"

        elif offer.offer_type == "free_delivery":
            details["sub_filter"] = offer.sub_filter

            if offer.sub_filter == "minimum_amount":
                details["minimum_order_amount"] = float(offer.minimum_order_amount)

            elif offer.sub_filter == "location_based":
                details["max_delivery_distance_km"] = float(offer.max_delivery_distance or 0)
                details["max_delivery_fee"] = float(offer.max_delivery_fee or 0)

        elif offer.offer_type == "credit":
            details["credit_amount"] = float(offer.credit_amount or 0)
            details["credit_expiry_days"] = offer.credit_expiry_days

        elif offer.offer_type == "restaurant_deal":
            details["restaurant"] = offer.restaurant.restaurant_name if offer.restaurant else None

        elif offer.offer_type == "auto_discount":
            details["discount"] = f"{offer.discount_value}{'%' if offer.discount_type == 'percentage' else ''}"

        details["valid_from"] = offer.valid_from
        details["valid_to"] = offer.valid_to

        active_offers.append({
            "id": offer.id,
            "title": title,
            "offer_type": offer.offer_type,
            "details": details
        })

    logger.info(f"[GET_ACTIVE_OFFERS] Total active offers: {len(active_offers)}")

    return active_offers


# ----------------------------------------
# OFFER ITEMS API
# ----------------------------------------
@api_view(['GET'])
def offer_items_api(request):
    logger.info(f"[OFFER_ITEMS_API] Called | params={request.GET.dict()}")

    queryset = RestaurantMenu.objects.filter(availability=True)

    # Query params
    category = request.GET.get('category')
    food_type = request.GET.get('food_type')
    min_price = request.GET.get('min_price')
    max_price = request.GET.get('max_price')
    has_discount = request.GET.get('has_discount')
    bogo = request.GET.get('bogo')
    spice_level = request.GET.get('spice_level')

    # Filters
    if bogo == 'true':
        if bogo == 'true':
            queryset = queryset.filter(buy_one_get_one_free=True)
            logger.debug("[FILTER] bogo=true")
    else:
        if category:
            queryset = queryset.filter(category=category)
            logger.debug(f"[FILTER] category={category}")

        if food_type:
            queryset = queryset.filter(food_type=food_type)
            logger.debug(f"[FILTER] food_type={food_type}")

        if min_price and max_price:
            queryset = queryset.filter(item_price__range=(min_price, max_price))
            logger.debug(f"[FILTER] price_range={min_price}-{max_price}")

        if has_discount == 'true':
            queryset = queryset.filter(discount_active=1)
            logger.debug("[FILTER] has_discount=true")

        if spice_level:
            queryset = queryset.filter(spice_level=spice_level)
            logger.debug(f"[FILTER] spice_level={spice_level}")

    # Sorting
    sort_by = request.GET.get('sort_by')

    if sort_by == 'price_low_high':
        queryset = queryset.order_by('item_price')
        logger.debug("[SORT] price_low_high")

    elif sort_by == 'price_high_low':
        queryset = queryset.order_by('-item_price')
        logger.debug("[SORT] price_high_low")

    elif sort_by == 'discount':
        queryset = queryset.order_by('-discount_percent')
        logger.debug("[SORT] discount")

    count = queryset.count()
    logger.info(f"[OFFER_ITEMS_API] Result count={count}")

    serializer = OfferMenuSerializer(queryset, many=True)

    return Response({
        "count": count,
        "results": serializer.data
    }, status=status.HTTP_200_OK)