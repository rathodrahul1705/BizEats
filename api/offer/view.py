from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from api.models import OfferDetail
from api.offer.offer_serializers import OfferSerializer

# @api_view(['POST'])
def check_credit_offer(offer_type, sub_filter):
    # Step 1: Validate params
    if not offer_type or not sub_filter:
        return {
            "success": False,
            "error": "offer_type and sub_filter are required"
        }

    # Step 2: Find the offer
    offer = OfferDetail.objects.filter(
        offer_type=offer_type,
        sub_filter=sub_filter,
        is_active=OfferDetail.APPROVED
    ).first()

    # Step 3: No offer found
    if not offer:
        return {
            "success": False,
            "message": "No offer available"
        }

    now = timezone.now()

    # ---------------------------
    # DATE VALIDATION
    # ---------------------------

    # Offer not started yet
    if offer.valid_from and now < offer.valid_from:
        return {
            "success": False,
            "message": "Offer not started yet",
            "valid_from": offer.valid_from
        }

    # Offer expired
    if offer.valid_to and now > offer.valid_to:
        return {
            "success": False,
            "message": "Offer expired",
            "valid_to": offer.valid_to
        }

    # ---------------------------
    # Model-level validity check
    # ---------------------------
    if not offer.is_valid:
        return {
            "success": False,
            "message": "Offer expired or invalid"
        }

    # Step 4: Return offer data
    serializer = OfferSerializer(offer)
    return {
        "success": True,
        "message": "Offer available",
        "data": serializer.data
    }

def get_active_offers():
    """
    Returns a list of active, valid offers with:
    - title
    - offer details
    - validity check (valid_from <= now <= valid_to)
    """

    now = timezone.now()

    # Fetch approved & active offers
    offers = OfferDetail.objects.filter(
        is_active=OfferDetail.APPROVED
    )

    active_offers = []

    for offer in offers:
        # Skip invalid offers using model logic
        if not offer.is_valid:
            continue

        # Build a human readable title
        title = offer.get_offer_type_display()

        # Build offer description
        details = {}

        # Coupon
        if offer.offer_type == 'coupon_code':
            details["code"] = offer.code
            details["discount"] = f"{offer.discount_value}{'%' if offer.discount_type == 'percentage' else ''}"

        # Free Delivery
        if offer.offer_type == "free_delivery":
            details["sub_filter"] = offer.sub_filter
            if offer.sub_filter == "minimum_amount":
                details["minimum_order_amount"] = float(offer.minimum_order_amount)
            if offer.sub_filter == "location_based":
                details["max_delivery_distance_km"] = float(offer.max_delivery_distance or 0)
                details["max_delivery_fee"] = float(offer.max_delivery_fee or 0)

        # Credit Offers
        if offer.offer_type == "credit":
            details["credit_amount"] = float(offer.credit_amount or 0)
            details["credit_expiry_days"] = offer.credit_expiry_days

        # Restaurant Deal
        if offer.offer_type == "restaurant_deal":
            details["restaurant"] = offer.restaurant.restaurant_name if offer.restaurant else None

        # Auto Discount
        if offer.offer_type == "auto_discount":
            details["discount"] = f"{offer.discount_value}{'%' if offer.discount_type == 'percentage' else ''}"

        # Add validity info
        details["valid_from"] = offer.valid_from
        details["valid_to"] = offer.valid_to

        # Append final structure
        active_offers.append({
            "id": offer.id,
            "title": title,
            "offer_type": offer.offer_type,
            "details": details
        })

    return active_offers
