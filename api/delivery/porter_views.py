# views/porter_views.py
from datetime import datetime, timezone
import math
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import get_fixed_timezone


from api.models import PorterOrder
from api.delivery.porter_service import (
    get_serviceable_locations,
    get_fare_estimate,
    create_booking,
    track_booking,
    cancel_booking
)

@api_view(["GET"])
def porter_locations(request):
    data = get_serviceable_locations()
    return Response(data)

@api_view(["POST"])
def porter_fare_estimate(request):
    data = get_fare_estimate(request.data)
    return Response(data)

# @api_view(["POST"])
def porter_create_booking(request):
    response_data = create_booking(request)  
    IST = get_fixed_timezone(330)  # 330 minutes = 5 hours 30 minutes
    epoch_ms = response_data["estimated_pickup_time"]
    pickup_time = datetime.fromtimestamp(epoch_ms / 1000, tz=IST)
    paise_to_rupees = math.ceil(response_data['estimated_fare_details']['minor_amount'] / 100)

    if response_data.get("order_id"):
        PorterOrder.objects.update_or_create(
            order_number=request['order_number'],
            defaults={
                "booking_id": response_data["order_id"],
                "status": response_data.get("status", "pending"),
                "vehicle_type": '2 Wheeler',
                "fare_estimate": paise_to_rupees,
                "estimated_pickup_time": pickup_time,
                "porter_create_request": request,
                "porter_create_response": response_data,
            }
        )
        
    return Response(response_data)

# @api_view(["GET"])
def porter_track_booking(request):
    data = track_booking(request)
    PorterOrder.objects.filter(booking_id=data["order_id"]).update(
        track_order_api_response=data,
        status=data['status'],
    )
    return Response(data)

@api_view(["POST"])
def porter_cancel_booking(request, booking_id):
    data = cancel_booking(booking_id)
    return Response(data)
