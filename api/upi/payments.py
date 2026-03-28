import requests
import uuid
import logging
import json
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# Configure logger
logger = logging.getLogger(__name__)

# temp store
PAYMENTS = {}


# ✅ Create Order
def create_order_cashfree(request):
    """Create a new order with Cashfree"""
    try:
        order_id = f"ORD_{uuid.uuid4().hex[:10]}"
        logger.info(f"Creating new order with ID: {order_id}")

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
            "x-api-version": "2022-09-01",
            "Content-Type": "application/json"
        }

        logger.debug(f"Cashfree API request payload: {payload}")
        
        res = requests.post(settings.CASHFREE_BASE_URL, json=payload, headers=headers)
        
        if res.status_code != 200:
            logger.error(f"Cashfree API returned status {res.status_code}: {res.text}")
            return JsonResponse({
                "error": "Failed to create order",
                "status_code": res.status_code
            }, status=500)
            
        data = res.json()
        PAYMENTS[order_id] = "pending"
        
        logger.info(f"Order created successfully: {order_id}, payment_session_id: {data.get('payment_session_id')}")
        
        return JsonResponse({
            "order_id": order_id,
            "payment_session_id": data["payment_session_id"],
            "amount": 100
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error while creating order: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Payment gateway communication error"
        }, status=503)
        
    except KeyError as e:
        logger.error(f"Missing expected field in Cashfree response: {str(e)}")
        return JsonResponse({
            "error": "Invalid response from payment gateway"
        }, status=502)
        
    except Exception as e:
        logger.error(f"Unexpected error in create_order_cashfree: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Internal server error"
        }, status=500)


# ✅ Check status
def check_status(request, order_id):
    """Check payment status for an order"""
    try:
        logger.info(f"Checking status for order: {order_id}")
        
        if order_id not in PAYMENTS:
            logger.warning(f"Order not found: {order_id}")
            return JsonResponse({
                "status": "not_found",
                "error": "Order ID not found"
            }, status=404)
            
        status = PAYMENTS.get(order_id, "pending")
        logger.info(f"Order {order_id} status: {status}")
        
        return JsonResponse({"status": status})
        
    except Exception as e:
        logger.error(f"Error checking status for order {order_id}: {str(e)}", exc_info=True)
        return JsonResponse({
            "error": "Internal server error"
        }, status=500)


# ✅ Webhook
@csrf_exempt
def cashfree_webhook(request):
    """Handle Cashfree webhook callbacks"""
    try:
        # Log raw request info
        logger.info(f"Webhook received from: {request.META.get('REMOTE_ADDR')}")
        logger.info(f"Webhook headers: {dict(request.headers)}")
        
        # Parse payload
        payload = json.loads(request.body)
        logger.info(f"Webhook payload received: {json.dumps(payload, indent=2)}")
        
        # Extract order and payment details
        order_id = payload.get("data", {}).get("order", {}).get("order_id")
        payment_status = payload.get("data", {}).get("payment", {}).get("payment_status")
        
        if not order_id:
            logger.error("Webhook missing order_id in payload")
            return JsonResponse({"error": "Missing order_id"}, status=400)
            
        if not payment_status:
            logger.error(f"Webhook missing payment_status for order {order_id}")
            return JsonResponse({"error": "Missing payment_status"}, status=400)
        
        # Update payment status
        logger.info(f"Updating order {order_id} status to: {payment_status}")
        
        if payment_status == "SUCCESS":
            PAYMENTS[order_id] = "success"
            logger.info(f"Payment successful for order {order_id}")
            # TODO: Add business logic here (e.g., update database, send confirmation email)
            
        elif payment_status == "FAILED":
            PAYMENTS[order_id] = "failed"
            logger.warning(f"Payment failed for order {order_id}")
            # TODO: Add business logic for failed payments
            
        else:
            PAYMENTS[order_id] = payment_status.lower()
            logger.info(f"Payment status for order {order_id}: {payment_status}")
        
        # Verify signature if Cashfree provides one
        webhook_signature = request.headers.get('x-webhook-signature')
        if webhook_signature:
            logger.debug(f"Webhook signature: {webhook_signature}")
            # TODO: Implement signature verification
            # if not verify_signature(payload, webhook_signature):
            #     logger.warning(f"Invalid webhook signature for order {order_id}")
            #     return JsonResponse({"error": "Invalid signature"}, status=401)
        
        logger.info(f"Webhook processed successfully for order {order_id}")
        return JsonResponse({"ok": True})
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {str(e)}")
        logger.error(f"Raw request body: {request.body}")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
        
    except KeyError as e:
        logger.error(f"Missing expected field in webhook payload: {str(e)}")
        return JsonResponse({"error": "Invalid webhook format"}, status=400)
        
    except Exception as e:
        logger.error(f"Unexpected error in webhook handler: {str(e)}", exc_info=True)
        return JsonResponse({"error": "Internal server error"}, status=500)