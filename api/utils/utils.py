import math
from api.models import RestaurantMaster, UserDeliveryAddress


def calculate_distance_and_cost(restaurant_id, delivery_address_id, cost_per_km=15):
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


def _haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of Earth in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
