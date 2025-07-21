import math
import requests
from api.delivery.porter_service import get_fare_estimate
from api.models import RestaurantMaster, UserDeliveryAddress
import os
import logging
from typing import Dict, Union, Optional, Tuple

logger = logging.getLogger(__name__)

def calculate_distance_and_cost(restaurant_id: int, delivery_address_id: int, cost_per_km: float = 15.0) -> Dict[str, Union[float, str, Dict]]:
    """
    Calculates distance in km and estimated delivery cost between restaurant and user address.
    Returns a dictionary with coordinates, distance, and cost or error message.
    
    Args:
        restaurant_id: ID of the restaurant
        delivery_address_id: ID of the user's delivery address
        cost_per_km: Base cost per kilometer (default: 12.0)
        
    Returns:
        Dictionary containing:
        - restaurant_coordinates: {latitude, longitude}
        - user_coordinates: {latitude, longitude}
        - distance_km: rounded to 2 decimal places
        - estimated_delivery_cost: rounded to nearest integer
        OR
        - error: error message if something went wrong
    """
    try:
        # Fetch data in a single query each
        restaurant = RestaurantMaster.objects.filter(
            restaurant_id=restaurant_id
        ).select_related('restaurant_location').only(
            'restaurant_id', 'restaurant_location__latitude', 'restaurant_location__longitude'
        ).first()

        if not restaurant or not restaurant.restaurant_location:
            return {"error": "Invalid restaurant or missing location."}

        user_address = UserDeliveryAddress.objects.filter(
            id=delivery_address_id
        ).select_related('user').only(
            'latitude', 'longitude', 'user__full_name', 'user__contact_number'
        ).first()

        if not user_address:
            return {"error": "User delivery address not found."}

        # Extract coordinates with validation
        try:
            r_lat = float(restaurant.restaurant_location.latitude)
            r_lon = float(restaurant.restaurant_location.longitude)
            u_lat = float(user_address.latitude)
            u_lon = float(user_address.longitude)
        except (TypeError, ValueError) as e:
            return {"error": f"Invalid coordinate values: {str(e)}"}

        # Calculate distance
        distance_km = _get_routing_distance(r_lat, r_lon, u_lat, u_lon)
        if distance_km <= 0:
            return {"error": "Could not calculate valid distance between locations."}

        # Prepare payload for fare estimate
        payload = {
            "pickup_details": {"lat": r_lat, "lng": r_lon},
            "drop_details": {"lat": u_lat, "lng": u_lon},
            "customer": {
                "name": user_address.user.full_name,
                "mobile": {
                    "country_code": "+91",
                    "number": user_address.user.contact_number
                }
            }
        }
        
        logger.info("Porter get api quote for payload: %s", payload)
        
        delivery_cost = calculate_delivery_cost(distance_km)
        # Get fare estimate from external service
        # delivery_cost = round(distance_km * cost_per_km, 2)
        # if distance_km > 5:
        #     response = get_fare_estimate(payload)
        #     if response and 'vehicles' in response:
        #         two_wheeler = next(
        #             (v for v in response['vehicles'] if v.get("type") in ("2 Wheeler", "Scooter")),
        #             None
        #         )
        #         if two_wheeler and 'fare' in two_wheeler and 'minor_amount' in two_wheeler['fare']:
        #             delivery_cost = two_wheeler['fare']['minor_amount'] / 100

        return {
            "restaurant_coordinates": {"latitude": r_lat, "longitude": r_lon},
            "user_coordinates": {"latitude": u_lat, "longitude": u_lon},
            "distance_km": round(distance_km, 2),
            "estimated_delivery_cost": round(delivery_cost)
        }

    except Exception as e:
        logger.exception("Error in calculate_distance_and_cost")
        return {"error": str(e)}

def _get_routing_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Get routing distance between two points using OLA Maps API.
    
    Args:
        lat1, lon1: Origin coordinates
        lat2, lon2: Destination coordinates
        
    Returns:
        Distance in kilometers (rounded to 2 decimal places) or 0.0 if failed
    """
    base_url = os.environ.get("OLA_MAPS_URL", "https://api.olamaps.io")
    api_key = os.environ.get("OLA_MAP_API_KEY", "cVMkjEbmY4Qu0FfAbUOa7CWfzUOyR00wMNS6F7hT")
    
    url = f"{base_url}/routing/v1/directions"
    headers = {"X-Request-Id": "EATOOR-DISTANCE-CALC"}
    params = {
        "origin": f"{lat1},{lon1}",
        "destination": f"{lat2},{lon2}",
        "api_key": api_key
    }

    logger.info("Calculating distance between (%s, %s) and (%s, %s)", lat1, lon1, lat2, lon2)

    try:
        response = requests.post(url, headers=headers, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        # Safely navigate the response structure
        distance_meters = data.get("routes", [{}])[0].get("legs", [{}])[0].get("distance")
        
        if distance_meters is not None and distance_meters > 0:
            distance_km = round(distance_meters / 1000, 2)
            logger.info("Calculated distance: %s km", distance_km)
            return distance_km
        
        logger.warning("Invalid or zero distance returned from API")
        return 0.0

    except requests.exceptions.RequestException as e:
        logger.error("Request failed: %s", str(e))
        return 0.0
    except (ValueError, KeyError, IndexError) as e:
        logger.error("Failed to parse API response: %s", str(e))
        return 0.0
    
def calculate_delivery_cost(distance_km):
    if distance_km <= 5:
        return distance_km * 15
    else:
        extra_cost = distance_km * 15  # Remaining km at ₹11/km
        return extra_cost