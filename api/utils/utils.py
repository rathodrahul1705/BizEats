from decimal import Decimal
import math
import requests
from BizEats import settings
from api.delivery.porter_service import get_fare_estimate
from api.models import Payment, RestaurantMaster, UserDeliveryAddress, WalletTransaction
import os
import logging
from typing import Dict, Union, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2

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
