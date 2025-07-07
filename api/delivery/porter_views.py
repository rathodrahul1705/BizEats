# views/porter_views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

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

@api_view(["POST"])
def porter_create_booking(request):
    response_data = create_booking(request.data)    
    if response_data.get("booking_id"):
        PorterOrder.objects.create(
            booking_id=response_data["booking_id"],
            status=response_data.get("status", "pending"),
            pickup_address=request.data["pickup"]["address"],
            drop_address=request.data["drop"]["address"],
            vehicle_type=request.data["vehicle_type"],
            fare_estimate=response_data.get("fare", None),
        )

    return Response(response_data)

@api_view(["GET"])
def porter_track_booking(request, booking_id):
    data = track_booking(booking_id)
    return Response(data)

@api_view(["POST"])
def porter_cancel_booking(request, booking_id):
    data = cancel_booking(booking_id)
    return Response(data)
