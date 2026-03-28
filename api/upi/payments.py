import requests
import uuid
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# temp store
PAYMENTS = {}


# ✅ Create Order
def create_order_cashfree(request):
    order_id = f"ORD_{uuid.uuid4().hex[:10]}"

    payload = {
        "order_id": order_id,
        "order_amount": 100,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": "cust_001",
            "customer_phone": "9999999999"
        },
        "order_meta": {
            "return_url": "yourapp://payment"
        }
    }

    headers = {
        "x-client-id": settings.CASHFREE_APP_ID,
        "x-client-secret": settings.CASHFREE_SECRET_KEY,
        "x-api-version": "2022-09-01",  # ✅ FIXED
        "Content-Type": "application/json"
    }

    res = requests.post(settings.CASHFREE_BASE_URL, json=payload, headers=headers)
    data = res.json()
    PAYMENTS[order_id] = "pending"

    return JsonResponse({
        "order_id": order_id,
        "payment_session_id": data["payment_session_id"],
        "amount": 100
    })


# ✅ Check status
def check_status(request, order_id):
    status = PAYMENTS.get(order_id, "pending")
    return JsonResponse({"status": status})


# ✅ Webhook
@csrf_exempt
def cashfree_webhook(request):
    import json
    payload = json.loads(request.body)

    order_id = payload["data"]["order"]["order_id"]
    status = payload["data"]["payment"]["payment_status"]

    if status == "SUCCESS":
        PAYMENTS[order_id] = "success"
    elif status == "FAILED":
        PAYMENTS[order_id] = "failed"

    return JsonResponse({"ok": True})