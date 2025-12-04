from api.models import Order, User, PorterOrder, OrderLiveLocation, RestaurantLocation
from api.delivery.porter_views import porter_track_booking
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime

def track_order_function(params, body):
    try:
        user_id = params.get("user_id")
        order_number = params.get("order_number")

        if not user_id or not order_number:
            return {"status": "error", "message": "user_id and order_number required"}

        user = User.objects.filter(id=user_id).first()
        if not user:
            return {"status": "error", "message": "User not found"}

        order = Order.objects.filter(user_id=user_id, order_number=order_number).select_related(
            "delivery_address", "restaurant"
        ).first()

        if not order:
            return {"status": "error", "message": "Order not found"}

        delivery_address = order.delivery_address
        restaurant = order.restaurant

        # Validate delivery location
        if not delivery_address or not delivery_address.latitude or not delivery_address.longitude:
            return {"status": "error", "message": "Delivery address location not found"}

        # Validate restaurant location
        try:
            restaurant_location = restaurant.restaurant_location
        except RestaurantLocation.DoesNotExist:
            return {"status": "error", "message": "Restaurant location not found"}

        # ------------------------------
        # ETA CALCULATION USING LIVE LOCATION
        # ------------------------------

        def haversine_distance(lat1, lon1, lat2, lon2):
            R = 6371
            dLat = radians(lat2 - lat1)
            dLon = radians(lon2 - lon1)
            a = sin(dLat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c

        def estimate_time_minutes(lat1, lon1, lat2, lon2, speed_kmph=15):
            distance_km = haversine_distance(lat1, lon1, lat2, lon2)
            minutes = round((distance_km / speed_kmph) * 60)
            return max(1, minutes)

        # Get live agent location
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

        # Fallback: OrderLiveLocation
        if not live_lat or not live_lng:
            last_location = OrderLiveLocation.objects.filter(order_number=order_number).order_by("-timestamp").first()
            if last_location:
                live_lat = last_location.latitude
                live_lng = last_location.longitude

        # Compute ETA using live location
        eta_minutes = None
        if live_lat and live_lng:
            eta_minutes = estimate_time_minutes(
                float(live_lat),
                float(live_lng),
                float(delivery_address.latitude),
                float(delivery_address.longitude),
            )

        # ------------------------------
        # Notification Mappings
        # ------------------------------
        status_code = order.status

        title_map = {
            1: "Order Pending",
            2: "Order Confirmed",
            3: "Order Preparing",
            4: "Order Ready",
            5: "Order On the Way",
            6: "Order Delivered",
            7: "Order Cancelled",
            8: "Order Refunded",
        }

        if eta_minutes:
            body_map = {
                1: f"Your order is Pending for confirmation | Arriving in {eta_minutes} mins",
                2: f"Your order is confirmed | Arriving in {eta_minutes} mins",
                3: f"Your food is being prepared | Arriving in {eta_minutes} mins",
                4: f"Your food is ready for delivery | Arriving in {eta_minutes} mins",
                5: f"Your delivery partner is on the way | Arriving in {eta_minutes} mins",
                6: "Your order has been delivered. Enjoy your meal!",
                7: "Your order has been cancelled. Refund will be processed shortly.",
                8: "Your refund has been issued. Amount will reflect soon.",
            }
        else:
            body_map = {
                1: "Your order is Pending for confirmation.",
                2: "Your order is confirmed.",
                3: "Your food is being prepared.",
                4: "Your food is ready for delivery.",
                5: "Your delivery partner is on the way.",
                6: "Your order has been delivered.",
                7: "Your order has been cancelled. Refund will be processed shortly.",
                8: "Your refund has been issued.",
            }

        title = title_map.get(status_code, "Order Update")
        body = body_map.get(status_code, "Your order has an update.")

        order_data = body

        return order_data

    except Exception as e:
        return {"status": "error", "message": str(e)}