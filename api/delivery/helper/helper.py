import uuid
import logging
from api.delivery.porter_views import porter_create_booking
from api.models import RestaurantMaster, UserDeliveryAddress

# Initialize logger for this module
logger = logging.getLogger(__name__)


def create_delivery_request(order_number, order):

    logger.info(f"Create Delivery Request triggered for Order: {order_number}")

    restaurant = (
        RestaurantMaster.objects
        .filter(restaurant_id=order.restaurant_id)
        .select_related('restaurant_location')
        .first()
    )

    if not restaurant or not restaurant.restaurant_location:
        logger.error(f"Restaurant or location missing for Order: {order_number}")
        return {"error": "Invalid restaurant or missing location."}

    logger.info(f"Restaurant found: {restaurant.restaurant_name}")

    user_address = (
        UserDeliveryAddress.objects
        .filter(id=order.delivery_address_id)
        .only('latitude', 'longitude')
        .first()
    )

    if not user_address:
        logger.error(f"User delivery address not found for Order: {order_number}")
        return {"error": "User delivery address not found."}

    logger.info(f"User address found: ID={order.delivery_address_id}")

    r_lat = float(restaurant.restaurant_location.latitude)
    r_lon = float(restaurant.restaurant_location.longitude)
    u_lat = float(user_address.latitude)
    u_lon = float(user_address.longitude)

    request_id = f"REQ_{uuid.uuid4()}"

    payload = {
        "request_id": request_id,
        "order_number": order_number,
        "delivery_instructions": {
            "instructions_list": [
                {
                    "type": "text",
                    "description": "handle with care"
                }
            ]
        },
        "pickup_details": {
            "address": {
                "apartment_address": restaurant.restaurant_location.shop_no_building,
                "street_address1": restaurant.restaurant_location.floor_tower,
                "street_address2": restaurant.restaurant_location.area_sector_locality,
                "landmark": restaurant.restaurant_location.nearby_locality,
                "city": restaurant.restaurant_location.city,
                "state": user_address.state,
                "pincode": restaurant.restaurant_location.zip_code,
                "country": "India",
                "lat": r_lat,
                "lng": r_lon,
                "contact_details": {
                    "name": restaurant.owner_details.owner_name,
                    "phone_number": restaurant.owner_details.owner_contact
                }
            }
        },
        "drop_details": {
            "address": {
                "apartment_address": user_address.street_address,
                "street_address1": user_address.street_address,
                "street_address2": user_address.street_address,
                "landmark": user_address.near_by_landmark,
                "city": user_address.city,
                "state": user_address.state,
                "pincode": user_address.zip_code,
                "country": "India",
                "lat": u_lat,
                "lng": u_lon,
                "contact_details": {
                    "name": user_address.user.full_name,
                    "phone_number": user_address.user.contact_number
                }
            }
        },
        "additional_comments": "This is a test comment"
    }

    logger.info(f"Payload created for Request ID {request_id}: {payload}")

    try:
        # Simulate POST request to internal API view        
        response = porter_create_booking(payload)

        logger.info(
            f"Porter Booking API Response for Order {order_number}: {response.data}"
        )

        return response.data

    except Exception as e:
        logger.exception(
            f"Exception while creating porter booking for Order {order_number}: {str(e)}"
        )
        return {
            "success": False,
            "error": str(e)
        }
