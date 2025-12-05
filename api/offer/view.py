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
