import math
import requests
from api.models import RestaurantMaster, UserDeliveryAddress
import os
import logging

logger = logging.getLogger(__name__)

def calculate_distance_and_cost(restaurant_id, delivery_address_id, cost_per_km=12):
    """
    Calculates distance in km and estimated delivery cost between restaurant and user address.
    Returns a dictionary with coordinates, distance, and cost or error message.
    """
    try:
        restaurant = (RestaurantMaster.objects
                      .filter(restaurant_id=restaurant_id)
                      .select_related('restaurant_location')
                      .first())

        user_address = (UserDeliveryAddress.objects
                        .filter(id=delivery_address_id)
                        .only('latitude', 'longitude')
                        .first())

        if not restaurant or not restaurant.restaurant_location:
            return {"error": "Invalid restaurant or missing location."}

        if not user_address:
            return {"error": "User delivery address not found."}

        r_lat = float(restaurant.restaurant_location.latitude)
        r_lon = float(restaurant.restaurant_location.longitude)
        u_lat = float(user_address.latitude)
        u_lon = float(user_address.longitude)

        distance_km = _haversine_distance(r_lat, r_lon, u_lat, u_lon)
        delivery_cost = round(distance_km * cost_per_km, 2)

        return {
            "restaurant_coordinates": {"latitude": r_lat, "longitude": r_lon},
            "user_coordinates": {"latitude": u_lat, "longitude": u_lon},
            "distance_km": round(distance_km, 2),
            "estimated_delivery_cost": round(delivery_cost)
        }

    except Exception as e:
        return {"error": str(e)}


# def _haversine_distance(lat1, lon1, lat2, lon2):
#     R = 6371  # Radius of Earth in km
#     d_lat = math.radians(lat2 - lat1)
#     d_lon = math.radians(lon2 - lon1)
#     a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * \
#         math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
#     c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
#     return R * c

def _haversine_distance(lat1, lon1, lat2, lon2):
    base_url = os.environ.get("OLA_MAPS_URL", "https://api.olamaps.io")
    url = f"{base_url}/routing/v1/directions"
    api_key = os.environ.get("OLA_MAP_API_KEY")
    
    headers = {
        "X-Request-Id": "EATOOR-DISTANCE-CALC"
    }

    params = {
        "origin": f"{lat1},{lon1}",
        "destination": f"{lat2},{lon2}",
        "api_key": api_key
    }

    logger.info(f"Calculating distance between ({lat1}, {lon1}) and ({lat2}, {lon2}) using {url}")

    try:
        response = requests.post(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        logger.debug(f"Response from OLA Maps API: {data}")

        if (
            "routes" in data and isinstance(data["routes"], list)
            and data["routes"] and "legs" in data["routes"][0]
            and data["routes"][0]["legs"]
        ):
            leg = data["routes"][0]["legs"][0]
            distance_meters = leg.get("distance")
            if distance_meters is not None:
                distance_km = round(distance_meters / 1000, 2)
                logger.info(f"Calculated distance: {distance_km} km")
                return distance_km
            else:
                logger.warning("Distance not found in route leg.")
                return 0.0
        else:
            logger.warning("Invalid or missing route/leg structure in response.")
            return 0.0

    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException during distance fetch: {e}")
        return 0.0
    except Exception as e:
        logger.exception("Unexpected error during distance calculation.")
        return 0.0
