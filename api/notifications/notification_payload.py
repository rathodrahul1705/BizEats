import logging
from api.models import Order, User, RestaurantLocation

logger = logging.getLogger(__name__)


def track_order_function(params, body):
    try:
        user_id = params.get("user_id")
        order_number = params.get("order_number")

        if not user_id or not order_number:
            logger.warning(
                "Missing required parameters",
                extra={"user_id": user_id, "order_number": order_number},
            )
            return {
                "status": "error",
                "message": "user_id and order_number required",
            }

        user = User.objects.filter(id=user_id).first()
        if not user:
            logger.warning("User not found", extra={"user_id": user_id})
            return {"status": "error", "message": "User not found"}

        order = (
            Order.objects.filter(user_id=user_id, order_number=order_number)
            .select_related("delivery_address", "restaurant")
            .first()
        )

        if not order:
            logger.warning(
                "Order not found",
                extra={"user_id": user_id, "order_number": order_number},
            )
            return {"status": "error", "message": "Order not found"}

        delivery_address = order.delivery_address
        restaurant = order.restaurant

        restaurant_name = (
            restaurant.restaurant_name
            if restaurant and restaurant.restaurant_name
            else "the restaurant"
        )

        # ------------------------------
        # Validate locations (basic check only)
        # ------------------------------
        if (
            not delivery_address
            or not delivery_address.latitude
            or not delivery_address.longitude
        ):
            logger.error(
                "Delivery address location missing",
                extra={"order_number": order_number},
            )
            return {
                "status": "error",
                "message": "Delivery address location not found",
            }

        try:
            _ = restaurant.restaurant_location
        except RestaurantLocation.DoesNotExist:
            logger.error(
                "Restaurant location not found",
                extra={"restaurant_id": restaurant.id if restaurant else None},
            )
            return {"status": "error", "message": "Restaurant location not found"}

        # ------------------------------
        # Notification content
        # ------------------------------
        status_code = order.status

        title_map = {
            1: "Order Update",
            2: "Order Confirmed",
            3: "Preparing Your Food",
            4: "Order Ready",
            5: "On the Way",
            6: "Delivered",
            7: "Order Cancelled",
            8: "Refund Processed",
        }

        body_map = {
            1: f"🍽️ Your order from {restaurant_name} is pending confirmation.",
            2: f"✅ Order confirmed from {restaurant_name}.",
            3: f"👨‍🍳 {restaurant_name} is preparing your food.",
            4: f"📦 Your order is ready at {restaurant_name}.",
            5: f"🛵 Delivery from {restaurant_name} is on the way.",
            6: f"🎉 Order delivered from {restaurant_name}. Enjoy your meal!",
            7: f"❌ Your order from {restaurant_name} was cancelled.",
            8: f"💸 Refund issued for your {restaurant_name} order.",
        }

        title = title_map.get(status_code, "Order Update")
        notification_body = body_map.get(
            status_code, "Your order has an update."
        )

        logger.info(
            "Track order response generated",
            extra={
                "order_number": order_number,
                "status_code": status_code,
            },
        )

        return {
            "status": "success",
            "title": title,
            "body": notification_body,
            "restaurant_name": restaurant_name,
            "order_number": order_number,
        }

    except Exception:
        logger.exception(
            "Unhandled exception in track_order_function",
            extra={"params": params},
        )
        return {
            "status": "error",
            "message": "Something went wrong",
        }
