from api.models import Order, User, PorterOrder, OrderLiveLocation, RestaurantLocation
from api.delivery.porter_views import porter_track_booking
from math import radians, sin, cos, sqrt, atan2


def track_order_function(params, body):
    try:
        user_id = params.get("user_id")
        order_number = params.get("order_number")

        if not user_id or not order_number:
            return {"status": "error", "message": "user_id and order_number required"}

        user = User.objects.filter(id=user_id).first()
        if not user:
            return {"status": "error", "message": "User not found"}

        order = (
            Order.objects.filter(user_id=user_id, order_number=order_number)
            .select_related("delivery_address", "restaurant")
            .first()
        )

        if not order:
            return {"status": "error", "message": "Order not found"}

        delivery_address = order.delivery_address
        restaurant = order.restaurant

        restaurant_name = restaurant.restaurant_name if restaurant and restaurant.restaurant_name else "the restaurant"

        # ------------------------------
        # Validate locations
        # ------------------------------
        if not delivery_address or not delivery_address.latitude or not delivery_address.longitude:
            return {"status": "error", "message": "Delivery address location not found"}

        try:
            restaurant_location = restaurant.restaurant_location
        except RestaurantLocation.DoesNotExist:
            return {"status": "error", "message": "Restaurant location not found"}

        # ------------------------------
        # Distance & ETA helpers
        # ------------------------------
        def haversine_distance(lat1, lon1, lat2, lon2):
            R = 6371  # Earth radius in KM
            dLat = radians(lat2 - lat1)
            dLon = radians(lon2 - lon1)
            a = (
                sin(dLat / 2) ** 2
                + cos(radians(lat1))
                * cos(radians(lat2))
                * sin(dLon / 2) ** 2
            )
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c

        def estimate_time_minutes(lat1, lon1, lat2, lon2, speed_kmph=15):
            distance_km = haversine_distance(lat1, lon1, lat2, lon2)
            minutes = round((distance_km / speed_kmph) * 60)
            return max(1, minutes)

        # ------------------------------
        # Get live delivery location
        # ------------------------------
        live_lat = live_lng = None

        porter_details = PorterOrder.objects.filter(order_number=order_number).first()
        if porter_details:
            if porter_details.eatoor_delivery_status == 0:
                porter_track_booking(porter_details.booking_id)

            porter_response = porter_details.track_order_api_response
            if porter_response and porter_response.get("partner_info"):
                loc = porter_response["partner_info"].get("location")
                if loc:
                    live_lat = loc.get("lat")
                    live_lng = loc.get("long")

        # Fallback to OrderLiveLocation
        if not live_lat or not live_lng:
            last_location = (
                OrderLiveLocation.objects.filter(order_number=order_number)
                .order_by("-timestamp")
                .first()
            )
            if last_location:
                live_lat = last_location.latitude
                live_lng = last_location.longitude

        # ------------------------------
        # ETA calculation
        # ------------------------------
        eta_minutes = None
        if live_lat and live_lng:
            eta_minutes = estimate_time_minutes(
                float(live_lat),
                float(live_lng),
                float(delivery_address.latitude),
                float(delivery_address.longitude),
            )

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

        if eta_minutes:
            body_map = {
                1: f"🍽️ Your order from {restaurant_name} is pending confirmation | ETA: {eta_minutes} mins",
                2: f"✅ Order confirmed from {restaurant_name} | ETA: {eta_minutes} mins",
                3: f"👨‍🍳 {restaurant_name} is preparing your food | ETA: {eta_minutes} mins",
                4: f"📦 Your order is ready at {restaurant_name} | ETA: {eta_minutes} mins",
                5: f"🛵 Delivery from {restaurant_name} is on the way | ETA: {eta_minutes} mins",
                6: f"🎉 Order delivered from {restaurant_name}. Enjoy your meal!",
                7: f"❌ Your order from {restaurant_name} was cancelled. Refund will be processed shortly.",
                8: f"💸 Refund issued for your {restaurant_name} order.",
            }
        else:
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
        notification_body = body_map.get(status_code, "Your order has an update.")

        return {
            "status": "success",
            "title": title,
            "body": notification_body,
            "eta_minutes": eta_minutes,
            "restaurant_name": restaurant_name,
            "order_number": order_number,
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
