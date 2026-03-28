import razorpay
import uuid
import json
import hmac
import hashlib

from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

client = razorpay.Client(auth=(settings.RAZORPAY_API_KEY, settings.RAZORPAY_API_SECRET))

# temp store (no DB)
PAYMENTS = {}


# ✅ Create Order
def create_order(request):
    order = client.order.create({
        "amount": 10000,  # ₹100
        "currency": "INR",
        "payment_capture": 1
    })

    PAYMENTS[order["id"]] = {
        "status": "created"
    }

    return JsonResponse({
        "order_id": order["id"],
        "amount": 100,
        "currency": "INR",
        "key": settings.RAZORPAY_API_KEY
    })


# ✅ Check Status (polling)
def check_status(request, order_id):
    status = PAYMENTS.get(order_id, {}).get("status", "pending")

    return JsonResponse({"status": status})


# ✅ Webhook
@csrf_exempt
def razorpay_webhook(request):
    body = request.body
    signature = request.headers.get("X-Razorpay-Signature")

    expected = hmac.new(
        bytes(settings.RAZORPAY_WEBHOOK_SECRET, "utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return HttpResponse(status=400)

    payload = json.loads(body)
    event = payload.get("event")

    if event == "payment.captured":
        order_id = payload["payload"]["payment"]["entity"]["order_id"]

        if order_id in PAYMENTS:
            PAYMENTS[order_id]["status"] = "success"

    elif event == "payment.failed":
        order_id = payload["payload"]["payment"]["entity"]["order_id"]

        if order_id in PAYMENTS:
            PAYMENTS[order_id]["status"] = "failed"

    return HttpResponse(status=200)