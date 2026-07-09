from datetime import datetime, timedelta, timezone
from decimal import Decimal
import math
import requests
from BizEats import settings
from api.delivery.porter_service import get_fare_estimate
from api.models import Order, Payment, RestaurantMaster, UserDeliveryAddress, WalletTransaction
import os
import logging
from typing import Dict, Union, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2


from django.utils import timezone
from django.db.models import Sum, Count

logger = logging.getLogger(__name__)

DEFAULT_DISTANCE_KM = 1.0

def calculate_distance_and_cost(
    restaurant_id: int,
    delivery_address_id: int,
    cost_per_km: float = 15.0
) -> Dict[str, Union[float, str, Dict]]:
    """
    Calculates distance in km and estimated delivery cost between restaurant and user address.
    Returns a dictionary with coordinates, distance, and cost.
    Uses fallback values if routing distance fails.
    """

    try:
        # Fetch restaurant
        restaurant = (
            RestaurantMaster.objects
            .filter(restaurant_id=restaurant_id)
            .select_related("restaurant_location")
            .only(
                "restaurant_id",
                "restaurant_location__latitude",
                "restaurant_location__longitude"
            )
            .first()
        )

        if not restaurant or not restaurant.restaurant_location:
            return {"error": "Invalid restaurant or missing location."}

        # Fetch user address
        user_address = (
            UserDeliveryAddress.objects
            .filter(id=delivery_address_id)
            .select_related("user")
            .only(
                "latitude",
                "longitude",
                "user__full_name",
                "user__contact_number"
            )
            .first()
        )

        if not user_address:
            return {"error": "User delivery address not found."}

        # Extract coordinates
        try:
            r_lat = float(restaurant.restaurant_location.latitude)
            r_lon = float(restaurant.restaurant_location.longitude)
            u_lat = float(user_address.latitude)
            u_lon = float(user_address.longitude)
        except (TypeError, ValueError):
            return {"error": "Invalid latitude or longitude values."}

        # Calculate routing distance
        distance_km = _get_routing_distance(r_lat, r_lon, u_lat, u_lon)

        # ===============================
        # FALLBACK LOGIC
        # ===============================
        fallback_used = False

        if not distance_km or distance_km <= 0:
            logger.warning(
                "Routing distance failed. Using fallback distance. "
                "restaurant_id=%s, address_id=%s",
                restaurant_id,
                delivery_address_id
            )
            distance_km = DEFAULT_DISTANCE_KM
            fallback_used = True

        # Calculate delivery cost
        delivery_cost = calculate_delivery_cost(distance_km)

        return {
            "restaurant_coordinates": {
                "latitude": r_lat,
                "longitude": r_lon
            },
            "user_coordinates": {
                "latitude": u_lat,
                "longitude": u_lon
            },
            "distance_km": round(distance_km, 2),
            "estimated_delivery_cost": round(delivery_cost),
            "fallback_used": fallback_used
        }

    except Exception as e:
        logger.exception("Error in calculate_distance_and_cost")
        return {"error": str(e)}

def _get_routing_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> Tuple[float, int, str, int]:
    """
    Returns:
        distance_km      -> accurate backend distance
        eta_seconds      -> backend ETA (seconds)
        display_distance -> UI distance (actual - 500m)
    """

    base_url = "https://maps.googleapis.com/maps/api/directions/json"
    api_key = settings.GOOGLE_MAP_API_KEY

    params = {
        "origin": f"{lat1},{lon1}",
        "destination": f"{lat2},{lon2}",
        "mode": "two_wheeler",
        "key": api_key
    }

    try:
        response = requests.get(base_url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "OK":
            return 0.0, 0, "0 km", 0

        legs = data["routes"][0]["legs"]

        # Accurate backend distance & duration
        distance_meters = sum(leg["distance"]["value"] for leg in legs)
        duration_seconds = sum(leg["duration"]["value"] for leg in legs)

        distance_km_original = round(distance_meters / 1000, 2)

        # Display distance = actual - 500m
        distance_km = max(distance_km_original - 0.5, 0)

        logger.info(
            "Distance: %.2f km | Display: %s | ETA: %s mins",
            distance_km,
        )

        return distance_km

    except Exception as e:
        logger.error("Routing failed: %s", str(e))
        return 0.0, 0, "0 km", 0

def calculate_delivery_cost(distance_km):
    if distance_km <= 2:
        return distance_km * 10
    else:
        extra_cost = distance_km * 15  # Remaining km at ₹11/km
        return extra_cost
    
def get_final_payment_checks(order_id, payment_method_display, order_payment_details):
    wallet_details = WalletTransaction.objects.filter(order_id=order_id).first()
    online_payment_details = Payment.objects.filter(order_id=order_id).first()

    eatoor_wallet_used = False
    wallet_used_amount = 0
    online_transaction_id = None
    wallet_payment_method = None
    online_payment_method = None
    online_payment_amount = None
    online_payment_used = False
    cod_payment_used = False
    cod_payment_pending = None

    if wallet_details:
        eatoor_wallet_used = True
        wallet_used_amount = wallet_details.amount
        wallet_payment_method = "Eatoor Money"

    if online_payment_details:
        online_transaction_id = online_payment_details.razorpay_payment_id
        online_payment_amount = online_payment_details.amount
        online_payment_method = payment_method_display
        online_payment_used = True
    
    if payment_method_display == "Cash on Delivery":
        cod_payment_used = True
        cod_payment_pending =  Decimal(order_payment_details.get('total', 0)) - Decimal(wallet_used_amount)

    return {
        "eatoor_wallet_used": eatoor_wallet_used,
        "online_payment_used": online_payment_used,
        "wallet_payment_amount": wallet_used_amount,
        "wallet_payment_method": wallet_payment_method,
        "online_payment_method": online_payment_method,
        "online_payment_amount": online_payment_amount,
        "online_transaction_id": online_transaction_id,
        "cod_payment_used": cod_payment_used,
        "cod_payment_pending": cod_payment_pending,
    }

# ---------- Revenue summary helper (unchanged) ----------
def get_revenue_summary(orders_queryset):
    """
    Given a queryset of Order objects, compute:
        - total_orders: int (excluding 'In Progress')
        - total_revenue: Decimal (as string, excluding 'In Progress')
        - status_breakdown: list of {status: str, order_count: int, revenue: str}
          (excluding 'In Progress')
    """
    # Exclude orders with status = 9 ('In Progress')
    filtered_qs = orders_queryset.exclude(status=9)

    total_orders = filtered_qs.count()
    total_revenue = filtered_qs.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

    status_choices = dict(Order.ORDER_STATUS_CHOICES)

    status_breakdown = (
        filtered_qs.values('status')
        .annotate(
            order_count=Count('id'),
            revenue=Sum('total_amount')
        )
        .order_by('status')
    )

    breakdown_list = []
    for item in status_breakdown:
        status_code = item['status']
        breakdown_list.append({
            'status': status_choices.get(status_code, str(status_code)),
            'order_count': item['order_count'],
            'revenue': str(item['revenue'] or Decimal('0.00'))
        })

    return {
        'total_orders': total_orders,
        'total_revenue': str(total_revenue),
        'status_breakdown': breakdown_list,
    }


# ---------- Settlement date range helpers ----------
def parse_date(date_str):
    """Convert 'YYYY-MM-DD' to timezone-aware datetime at start of day."""
    if not date_str:
        return None
    try:
        naive = datetime.strptime(date_str, '%Y-%m-%d')
        return timezone.make_aware(naive)
    except ValueError:
        return None


def get_settlement_range(settlement_date=None):
    """
    Return (start_date, end_date) for a weekly settlement period ending on a Wednesday.
    If settlement_date is given, it must be a Wednesday.
    Otherwise, use the most recent Wednesday (or today if today is Wednesday).
    The period is: Thursday (start) to Wednesday (end) inclusive.
    """
    if settlement_date:
        # Validate that it's a Wednesday (weekday=2)
        if settlement_date.weekday() != 2:
            raise ValueError("settlement_date must be a Wednesday.")
        wednesday = settlement_date
    else:
        # Use today's date
        today = timezone.now().date()
        # Find the most recent Wednesday. Wednesday weekday = 2 (Monday=0)
        days_since_wednesday = (today.weekday() - 2) % 7
        wednesday = today - timedelta(days=days_since_wednesday)

    # Start: Thursday = Wednesday - 6 days (since Thursday to Wednesday inclusive is 7 days)
    start = wednesday - timedelta(days=6)
    # End: end of the Wednesday (so orders on that day are included)
    end = wednesday + timedelta(days=1) - timedelta(microseconds=1)

    # Make them timezone-aware datetimes (start at midnight, end at 23:59:59)
    start_dt = timezone.make_aware(datetime.combine(start, datetime.min.time()))
    end_dt = timezone.make_aware(datetime.combine(end, datetime.max.time()))

    return start_dt, end_dt


def get_date_range_from_request(data):
    """
    Determine the date range based on request data.
    Priority:
        1. Explicit start_date & end_date (must both be present)
        2. settlement_date (must be a Wednesday)
        3. Default: current settlement week (last Thursday to this Wednesday)
    Returns (start_date, end_date, range_type)
    """
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    settlement_date_str = data.get('settlement_date')

    # 1. Explicit dates
    if start_date_str and end_date_str:
        start = parse_date(start_date_str)
        end = parse_date(end_date_str)
        if start is None or end is None:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")
        # Make end inclusive
        end = end + timedelta(days=1) - timedelta(microseconds=1)
        return start, end, 'custom'

    # 2. Settlement date
    if settlement_date_str:
        settlement = parse_date(settlement_date_str)
        if settlement is None:
            raise ValueError("Invalid settlement_date format. Use YYYY-MM-DD.")
        start, end = get_settlement_range(settlement)
        return start, end, 'settlement_week'

    # 3. Default: current settlement week
    start, end = get_settlement_range()  # no date -> uses today
    return start, end, 'current_settlement_week'
