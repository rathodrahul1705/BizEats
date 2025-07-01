from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import PorterOrder

@api_view(["GET"])
def admin_porter_orders(request):
    orders = PorterOrder.objects.all().order_by("-created_at")
    data = [
        {
            "booking_id": o.booking_id,
            "status": o.status,
            "pickup_address": o.pickup_address,
            "drop_address": o.drop_address,
            "vehicle_type": o.vehicle_type,
        }
        for o in orders
    ]
    return Response(data)
