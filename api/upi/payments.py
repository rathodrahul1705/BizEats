# views.py
import requests
import uuid
import logging
import hmac
import hashlib
import json
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render

# Configure logger
logger = logging.getLogger(__name__)

# Temporary store - In production, use database
PAYMENTS = {}


def verify_webhook_signature(payload, signature, secret_key):
    """Verify Cashfree webhook signature"""
    try:
        # Sort keys and create string for signature verification
        sorted_payload = json.dumps(payload, sort_keys=True)
        expected_signature = hmac.new(
            secret_key.encode('utf-8'),
            sorted_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False

# ✅ Create Order
@csrf_exempt
@require_http_methods(["POST"])
def create_order_cashfree(request):
    """Create a new order with Cashfree"""
    try:
        # Parse request data
        data = json.loads(request.body)
        
        # Extract values from request with validation
        amount = data.get('amount')
        customer_id = data.get('customer_phone')
        customer_phone = data.get('customer_phone')
        customer_email = data.get('customer_email')
        customer_name = data.get('customer_name', '')
        
        # Validate required fields
        if not amount:
            return JsonResponse({"error": "amount is required"}, status=400)
        if not customer_id:
            return JsonResponse({"error": "customer_id is required"}, status=400)
        if not customer_phone:
            return JsonResponse({"error": "customer_phone is required"}, status=400)
        
        # Validate amount is numeric and positive
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, TypeError):
            return JsonResponse({
                "error": "Invalid amount. Must be a positive number"
            }, status=400)
        
        # Validate phone number format
        phone_str = str(customer_phone).strip()
        if not phone_str.isdigit() or len(phone_str) < 10:
            return JsonResponse({
                "error": "Invalid phone number. Must be at least 10 digits"
            }, status=400)
        
        # Generate unique order ID
        order_id = f"ORD_{uuid.uuid4().hex[:12].upper()}"
        logger.info(f"Creating new order with ID: {order_id} for customer: {customer_id}")
        
        # Prepare customer details
        customer_details = {
            "customer_id": str(customer_id),
            "customer_phone": phone_str
        }
        
        # Add optional customer details
        if customer_email:
            customer_details["customer_email"] = customer_email
        if customer_name:
            customer_details["customer_name"] = customer_name
        
        # Prepare order payload for Cashfree
        payload = {
            "order_id": order_id,
            "order_amount": amount,
            "order_currency": data.get('currency', 'INR'),
            "customer_details": customer_details,
            "order_meta": {
                "return_url": data.get('return_url', 'eatoor://CartScreen'),
                "notify_url": data.get('webhook_url', f"{settings.REACT_APP_BASE_URL}/api/payment/webhook/")
            }
        }
        
        # Add optional fields
        if data.get('order_note'):
            payload["order_note"] = data.get('order_note')
        
        if data.get('order_tags'):
            payload["order_tags"] = data.get('order_tags')
        
        # Set up headers for Cashfree API
        headers = {
            "x-client-id": settings.CASHFREE_APP_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
            "x-api-version": "2025-01-01",
            "Content-Type": "application/json"
        }
        
        logger.debug(f"Cashfree API request payload: {json.dumps(payload, indent=2)}")
        
        # Make API request to Cashfree
        response = requests.post(
            f"{settings.CASHFREE_BASE_URL}/orders",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        # Handle API response
        if response.status_code != 200:
            logger.error(f"Cashfree API error {response.status_code}: {response.text}")
            return JsonResponse({
                "error": "Failed to create order with payment gateway",
                "status_code": response.status_code,
                "message": response.json() if response.text else "Unknown error"
            }, status=response.status_code)
        
        response_data = response.json()
        
        # Store order in temporary storage
        PAYMENTS[order_id] = {
            "status": "PENDING",
            "amount": amount,
            "customer_id": customer_id,
            "customer_phone": phone_str,
            "customer_email": customer_email,
            "customer_name": customer_name,
            "created_at": datetime.now().isoformat(),
            "payment_session_id": response_data.get("payment_session_id"),
            "order_data": response_data
        }
        
        logger.info(f"Order created successfully: {order_id}")
        
        # Return response with payment details
        return JsonResponse({
            "success": True,
            "order_id": order_id,
            "payment_session_id": response_data.get("payment_session_id"),
            "payment_link": response_data.get("payment_link"),
            "amount": amount,
            "currency": payload["order_currency"],
            "customer_id": customer_id,
            "order_status": response_data.get("order_status", "PENDING")
        })
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in request: {e}")
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Payment gateway communication error: {e}")
        return JsonResponse({
            "error": "Payment gateway communication error",
            "details": str(e) if settings.DEBUG else "Please try again later"
        }, status=503)
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return JsonResponse({
            "error": "Internal server error",
            "details": str(e) if settings.DEBUG else "Please contact support"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def create_upi_session(request):
    """
    Create UPI session using existing payment_session_id
    (Cashfree PG v2025 API)
    """
    try:
        data = json.loads(request.body)

        payment_session_id = data.get("payment_session_id")

        if not payment_session_id:
            return JsonResponse(
                {"error": "payment_session_id is required"},
                status=400
            )

        # Correct payload as per Cashfree docs
        payload = {
            "payment_session_id": payment_session_id,
            "payment_method": {
                "upi": {
                    "channel": "link"
                }
            }
        }

        print("payload===",payload)

        headers = {
            "Content-Type": "application/json",
            "x-api-version": settings.CASHFREE_API_VERSION,
        }

        response = requests.post(
            f"{settings.CASHFREE_BASE_URL}/orders/sessions",
            headers=headers,
            json=payload,
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Cashfree error: {response.text}")
            return JsonResponse(
                {"error": "Failed to create UPI session", "details": response.text},
                status=response.status_code
            )

        response_data = response.json()

        # Extract UPI links safely
        upi_urls = {}
        payload_data = (
            response_data.get("data", {})
            .get("payload", {})
        )

        upi_urls = {
            "bhim": payload_data.get("bhim"),
            "gpay": payload_data.get("gpay"),
            "paytm": payload_data.get("paytm"),
            "phonepe": payload_data.get("phonepe"),
            "web": payload_data.get("web"),
            "default": payload_data.get("default"),
        }

        return JsonResponse({
            "success": True,
            "payment_session_id": payment_session_id,
            "upi_urls": upi_urls,
        })

    except Exception as e:
        logger.error(f"UPI session error: {str(e)}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


# ✅ Get UPI Payment Links (for existing payment)
def get_upi_payment_links(request, cf_payment_id):
    """Retrieve UPI payment links for a specific payment"""
    try:
        if cf_payment_id not in PAYMENTS:
            return JsonResponse({"error": "Payment session not found"}, status=404)
        
        payment_info = PAYMENTS[cf_payment_id]
        response_data = payment_info.get('response_data', {})
        
        # Extract UPI URLs from stored response
        upi_urls = {}
        if 'data' in response_data and 'payload' in response_data['data']:
            payload_data = response_data['data']['payload']
            upi_urls = {
                'bhim': payload_data.get('bhim'),
                'gpay': payload_data.get('gpay'),
                'paytm': payload_data.get('paytm'),
                'phonepe': payload_data.get('phonepe'),
                'web': payload_data.get('web'),
                'default': payload_data.get('default')
            }
        
        return JsonResponse({
            "cf_payment_id": cf_payment_id,
            "amount": payment_info['amount'],
            "payment_session_id": payment_info.get('payment_session_id'),
            "status": payment_info['status'],
            "upi_urls": upi_urls
        })
        
    except Exception as e:
        logger.error(f"Error getting UPI links: {e}")
        return JsonResponse({"error": str(e)}, status=500)


# ✅ Check Order Status
@csrf_exempt
@require_http_methods(["GET"])
def check_order_status(request, order_id):
    """Check payment status for an order"""
    try:
        logger.info(f"Checking status for order: {order_id}")
        
        # Check in local storage first
        if order_id in PAYMENTS:
            order_data = PAYMENTS[order_id]
            status = order_data.get("status", "PENDING")
            
            # If status is still pending, verify with Cashfree
            if status == "PENDING":
                try:
                    headers = {
                        "x-client-id": settings.CASHFREE_APP_ID,
                        "x-client-secret": settings.CASHFREE_SECRET_KEY,
                        "x-api-version": "2023-08-01"
                    }
                    
                    response = requests.get(
                        f"{settings.CASHFREE_BASE_URL}/orders/{order_id}",
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        cf_data = response.json()
                        cf_status = cf_data.get("order_status")
                        
                        # Map Cashfree status to our status
                        if cf_status == "PAID":
                            PAYMENTS[order_id]["status"] = "SUCCESS"
                            status = "SUCCESS"
                        elif cf_status == "ACTIVE":
                            status = "PENDING"
                        elif cf_status in ["CANCELLED", "EXPIRED"]:
                            PAYMENTS[order_id]["status"] = "FAILED"
                            status = "FAILED"
                            
                except Exception as e:
                    logger.error(f"Error checking with Cashfree: {e}")
            
            return JsonResponse({
                "order_id": order_id,
                "status": status,
                "amount": order_data.get("amount"),
                "customer_id": order_data.get("customer_id")
            })
        
        # If not found locally, check directly with Cashfree
        try:
            headers = {
                "x-client-id": settings.CASHFREE_APP_ID,
                "x-client-secret": settings.CASHFREE_SECRET_KEY,
                "x-api-version": "2023-08-01"
            }
            
            response = requests.get(
                f"{settings.CASHFREE_BASE_URL}/orders/{order_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                cf_data = response.json()
                cf_status = cf_data.get("order_status")
                
                # Map Cashfree status
                mapped_status = {
                    "PAID": "SUCCESS",
                    "ACTIVE": "PENDING",
                    "CANCELLED": "FAILED",
                    "EXPIRED": "FAILED"
                }.get(cf_status, "PENDING")
                
                return JsonResponse({
                    "order_id": order_id,
                    "status": mapped_status,
                    "amount": cf_data.get("order_amount"),
                    "customer_id": cf_data.get("customer_details", {}).get("customer_id")
                })
            else:
                logger.warning(f"Order not found: {order_id}")
                return JsonResponse({
                    "status": "NOT_FOUND",
                    "error": "Order ID not found"
                }, status=404)
                
        except Exception as e:
            logger.error(f"Error checking with Cashfree: {e}")
            return JsonResponse({
                "status": "ERROR",
                "error": "Unable to verify payment status"
            }, status=500)
        
    except Exception as e:
        logger.error(f"Error checking status for order {order_id}: {e}", exc_info=True)
        return JsonResponse({"error": "Internal server error"}, status=500)


# ✅ Check UPI Payment Status
@csrf_exempt
@require_http_methods(["GET"])
def check_upi_payment_status(request, cf_payment_id):
    """Check UPI payment status"""
    try:
        if cf_payment_id not in PAYMENTS:
            return JsonResponse({"error": "Payment not found"}, status=404)
        
        payment_info = PAYMENTS[cf_payment_id]
        status = payment_info.get("status", "PENDING")
        
        return JsonResponse({
            "cf_payment_id": cf_payment_id,
            "status": status,
            "amount": payment_info.get("amount"),
            "customer_phone": payment_info.get("customer_phone"),
            "updated_at": payment_info.get("updated_at", payment_info.get("created_at"))
        })
        
    except Exception as e:
        logger.error(f"Error checking UPI status: {e}")
        return JsonResponse({"error": str(e)}, status=500)


# ✅ Webhook Handler
@csrf_exempt
@require_http_methods(["POST"])
def cashfree_webhook(request):
    """Handle Cashfree webhook callbacks"""
    try:
        # Get webhook signature
        webhook_signature = request.headers.get('x-webhook-signature')
        
        # Parse payload
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in webhook payload: {e}")
            logger.error(f"Raw body: {request.body}")
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        
        # Log webhook details
        logger.info(f"Webhook received from: {request.META.get('REMOTE_ADDR')}")
        logger.info(f"Webhook payload: {json.dumps(payload, indent=2)}")
        
        # Verify signature (recommended for production)
        if webhook_signature and hasattr(settings, 'CASHFREE_WEBHOOK_SECRET'):
            is_valid = verify_webhook_signature(
                payload,
                webhook_signature,
                settings.CASHFREE_WEBHOOK_SECRET
            )
            
            if not is_valid:
                logger.warning("Invalid webhook signature")
                return JsonResponse({"error": "Invalid signature"}, status=401)
        
        # Extract order and payment details
        order_data = payload.get("data", {}).get("order", {})
        payment_data = payload.get("data", {}).get("payment", {})
        
        order_id = order_data.get("order_id")
        cf_payment_id = payment_data.get("cf_payment_id") or order_id
        
        payment_status = payment_data.get("payment_status")
        order_status = order_data.get("order_status")
        
        if not order_id and not cf_payment_id:
            logger.error("Webhook missing order_id/cf_payment_id in payload")
            return JsonResponse({"error": "Missing payment identifier"}, status=400)
        
        # Use whichever ID is available
        payment_id = order_id or cf_payment_id
        logger.info(f"Processing webhook for payment {payment_id}")
        logger.info(f"Order status: {order_status}, Payment status: {payment_status}")
        
        # Update payment status based on webhook data
        status_mapping = {
            "SUCCESS": "SUCCESS",
            "FAILED": "FAILED",
            "PENDING": "PENDING",
            "CANCELLED": "FAILED",
            "EXPIRED": "FAILED",
            "PAID": "SUCCESS",
            "ACTIVE": "PENDING"
        }
        
        final_status = status_mapping.get(payment_status or order_status, "PENDING")
        
        # Update local storage (try both IDs)
        updated = False
        for payment_key in [payment_id, order_id, cf_payment_id]:
            if payment_key and payment_key in PAYMENTS:
                PAYMENTS[payment_key]["status"] = final_status
                PAYMENTS[payment_key]["updated_at"] = datetime.now().isoformat()
                PAYMENTS[payment_key]["webhook_data"] = payload
                updated = True
                logger.info(f"Updated payment {payment_key} status to: {final_status}")
        
        if not updated:
            # Store payment if not found (from webhook)
            logger.warning(f"Payment {payment_id} not found in local storage, creating record")
            PAYMENTS[payment_id] = {
                "status": final_status,
                "amount": order_data.get("order_amount") or payment_data.get("payment_amount"),
                "customer_id": order_data.get("customer_details", {}).get("customer_id"),
                "customer_phone": order_data.get("customer_details", {}).get("customer_phone"),
                "customer_email": order_data.get("customer_details", {}).get("customer_email"),
                "created_at": datetime.now().isoformat(),
                "webhook_data": payload
            }
        
        # Business logic for successful payment
        if final_status == "SUCCESS":
            logger.info(f"Processing successful payment for {payment_id}")
            # Add your business logic here
            # - Update user subscription
            # - Send confirmation email
            # - Add to analytics
            pass
        
        # Business logic for failed payment
        elif final_status == "FAILED":
            logger.warning(f"Processing failed payment for {payment_id}")
            # Add your business logic for failed payments
            # - Notify user
            # - Retry logic
            pass
        
        # Return success response
        return JsonResponse({"ok": True, "status": "processed"})
        
    except KeyError as e:
        logger.error(f"Missing expected field in webhook: {e}")
        return JsonResponse({"error": "Invalid webhook format"}, status=400)
        
    except Exception as e:
        logger.error(f"Unexpected error in webhook: {e}", exc_info=True)
        return JsonResponse({"error": "Internal server error"}, status=500)