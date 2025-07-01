# views/porter_webhook.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import PorterOrder

@api_view(["POST"])
def porter_webhook(request):
    data = request.data
    booking_id = data.get("booking_id")
    status = data.get("status")

    try:
        order = PorterOrder.objects.get(booking_id=booking_id)
        order.status = status
        order.save()
    except PorterOrder.DoesNotExist:
        pass  # Optionally log this

    return Response({"success": True})
