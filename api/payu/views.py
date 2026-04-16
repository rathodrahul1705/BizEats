from datetime import timezone
import json
import uuid
import requests
import hashlib
import logging
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.models import Order

from .utils import create_payment_generate_hash, order_create, upsert_user_payment_method, verify_payment_generate_hash, verify_payment_update

# ✅ Logger setup
logger = logging.getLogger(__name__)

@api_view(['POST'])
def initiate_payment(request):
    """
    Initiate payment with PayU gateway
    """    
    try:
        logger.info("Initiating payment request")

        data = request.data
        logger.debug(f"Incoming request data: {data}")

        # ✅ Extract required fields
        amount = data.get('amount')
        productinfo = data.get('productinfo')
        firstname = data.get('firstname')
        email = data.get('email')
        phone = data.get('phone')

        # ✅ Validate payment fields
        if not all([amount, productinfo, firstname, email, phone]):
            missing = [f for f in ['amount', 'productinfo', 'firstname', 'email', 'phone'] if not data.get(f)]
            logger.warning(f"Missing payment parameters: {missing}")
            return Response(
                {"error": "Missing required parameters", "missing": missing},
                status=400
            )

        # ✅ Validate order fields
        required_order_fields = ['user_id', 'restaurant_id', 'delivery_address_id', 'subtotal', 'total_amount']
        missing_order = [f for f in required_order_fields if not data.get(f)]
        if missing_order:
            logger.warning(f"Missing order parameters: {missing_order}")
            return Response(
                {"error": "Missing order parameters", "missing": missing_order},
                status=400
            )

        # ✅ Create order
        logger.info("Creating order...")
        order_result = order_create(data)

        if not order_result.get('success'):
            logger.error(f"Order creation failed: {order_result}")
            return Response(
                {"error": "Failed to create order", "details": order_result.get('error')},
                status=400
            )

        order_id = order_result['order_id']
        order_number = order_result['order_number']

        logger.info(f"Order created successfully: order_id={order_id}, order_number={order_number}")

        # ✅ Generate txnid
        txnid = f"ORD{order_id}_{uuid.uuid4().hex[:8]}"
        logger.debug(f"Generated txnid: {txnid}")

        # ✅ Prepare hash params
        application_base_url = settings.REACT_APP_BASE_URL

        hash_params = {
            'key': settings.PAYU_MERCHANT_KEY,
            'txnid': txnid,
            'amount': str(amount),
            'productinfo': productinfo,
            'firstname': firstname,
            'email': email,
            'udf1': str(order_id),
            'udf2': order_number,
            'udf3': str(data.get('user_id')),
            'udf4': data.get('payment_gateway', 'UPI'),
            'udf5': ''
        }

        logger.debug(f"Hash params: {hash_params}")

        hashh = create_payment_generate_hash(hash_params, settings.PAYU_MERCHANT_SALT)
        logger.debug(f"Generated hash: {hashh}")

        # ✅ Prepare PayU request
        api_params = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "amount": str(amount),
            "productinfo": productinfo,
            "firstname": firstname,
            "lastname": "",
            "email": email,
            "phone": str(phone),
            "surl": f"{application_base_url}/api/payment/success/",
            "furl": f"{application_base_url}/api/payment/failure/",
            "pg": "UPI",
            "txn_s2s_flow": "4",
            "hash": hashh,
            "udf1": str(order_id),
            "udf2": order_number,
            "udf3": str(data.get('user_id')),
            "udf4": data.get('payment_gateway', 'UPI'),
            "udf5": ""
        }

        # ⚠️ Fix typo: payment_mehotd_type → payment_method_type
        if data.get('payment_method_type') == "VPA":
            api_params["vpa"] = data.get('vpa')
            api_params["bankcode"] = "UPI"
            logger.info(f"Using VPA flow for txnid={txnid}, vpa={data.get('vpa')}")
        else:
            api_params["bankcode"] = data.get('INTENT')
            logger.info(f"Using Intent flow for txnid={txnid}, intent={data.get('INTENT')}")

        logger.debug(f"Final PayU params: {api_params}")

        # ✅ Send request to PayU
        url = f"{settings.PAYU_BASE_URL}/_payment"
        logger.info(f"Sending request to PayU: {url}")

        response = requests.post(url, data=api_params, timeout=30)
        
        logger.info(f"PayU response status: {response.status_code}")
        logger.debug(f"PayU raw response: {response.text}")

        response_json = response.json()

        # ✅ Return response
        return Response({
            "status": "success",
            "order_id": order_id,
            "order_number": order_number,
            "txnid": txnid,
            "amount": amount,
            "payu_response": response_json
        }, status=200)

    except requests.exceptions.Timeout:
        logger.error("PayU request timeout", exc_info=True)
        return Response(
            {"error": "Payment gateway timeout"},
            status=504
        )

    except requests.exceptions.RequestException as e:
        logger.error(f"PayU request failed: {str(e)}", exc_info=True)
        return Response(
            {"error": "Payment gateway error"},
            status=502
        )

    except Exception as e:
        logger.exception("Unexpected error in initiate_payment")
        return Response({
            "error": "Something went wrong",
            "details": str(e) if settings.DEBUG else "Internal server error"
        }, status=500)


# ✅ 2. SUCCESS CALLBACK
@csrf_exempt
@api_view(['POST'])
def payment_success(request):
    """
    Handle payment success callback from PayU
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        data = request.data
        txnid = data.get('txnid', 'Unknown')
        
        logger.info(f"[{request_id}] ✅ Payment SUCCESS callback received for txnid: {txnid}")
        logger.debug(f"[{request_id}] 📦 Full callback data: {data}")

        # 🔥 Verify hash
        try:
            is_valid = verify_payment_generate_hash(data)
            
            if not is_valid:
                logger.warning(f"[{request_id}] 🔐 Hash verification FAILED for txnid: {txnid}")
                logger.warning(f"[{request_id}] Received hash: {data.get('hash')}")
                logger.warning(f"[{request_id}] Expected hash verification failed - possible tampering detected")
            else:
                logger.info(f"[{request_id}] 🔐 Hash verification SUCCESS for txnid: {txnid}")
        except Exception as hash_error:
            logger.error(f"[{request_id}] ❌ Hash verification error: {str(hash_error)}")
            is_valid = False

        # Log payment status
        payment_status = data.get('status', 'Unknown')
        amount = data.get('amount', 'Unknown')
        logger.info(f"[{request_id}] Payment details | txnid={txnid} | status={payment_status} | amount={amount}")

        return Response({
            "status": "success",
            "hash_verified": is_valid,
            "response": data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[{request_id}] ❌ Success callback error: {str(e)}", exc_info=True)
        return Response({"error": "Callback error"}, status=500)


# ❌ 3. FAILURE CALLBACK
@csrf_exempt
@api_view(['POST'])
def payment_failure(request):
    """
    Handle payment failure callback from PayU
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        data = request.data
        txnid = data.get('txnid', 'Unknown')
        error_msg = data.get('error', data.get('msg', 'No error details provided'))
        
        logger.warning(f"[{request_id}] ❌ Payment FAILURE callback received for txnid: {txnid}")
        logger.warning(f"[{request_id}] Failure reason: {error_msg}")
        logger.debug(f"[{request_id}] 📦 Full failure data: {data}")

        # Log additional failure details if available
        if data.get('unmappedstatus'):
            logger.warning(f"[{request_id}] Unmapped status: {data.get('unmappedstatus')}")
        if data.get('bank_ref_num'):
            logger.warning(f"[{request_id}] Bank reference number: {data.get('bank_ref_num')}")

        return Response({
            "status": "failure",
            "response": data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"[{request_id}] ❌ Failure callback error: {str(e)}", exc_info=True)
        return Response({"error": "Callback error"}, status=500)


@api_view(['GET'])
def verify_payment_payu(request):
    """
    Verify payment status with PayU
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        txnid = request.GET.get("txnid")
        payment_method = request.GET.get("payment_method")
        order_id = request.GET.get("order_id")

        logger.info(f"[{request_id}] 🔍 Verify Payment API called | txnid={txnid} | payment_method={payment_method} | order_id={order_id}")

        if not txnid:
            logger.warning(f"[{request_id}] ⚠️ Verify Payment Failed | Missing txnid")
            return Response({"error": "txnid required"}, status=400)

        logger.info(f"[{request_id}] 🔍 Starting payment verification for txnid: {txnid}")

        command = "verify_payment"

        # Step 1: Generate hash
        hash_payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "command": command,
        }

        logger.debug(f"[{request_id}] Generating verification hash for txnid: {txnid}")

        try:
            hashh = verify_payment_generate_hash(
                hash_payload,
                settings.PAYU_MERCHANT_SALT
            )
            logger.debug(f"[{request_id}] Verification hash generated successfully")
        except Exception as hash_error:
            logger.error(f"[{request_id}] Failed to generate verification hash: {str(hash_error)}")
            return Response({"error": "Failed to generate verification hash"}, status=500)

        # Step 2: Prepare request payload
        payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "command": command,
            "var1": txnid,
            "hash": hashh
        }

        url = f"{settings.PAYU_BASE_URL}/merchant/postservice?form=2"

        logger.info(f"[{request_id}] Sending verification request to PayU | URL={url}")
        logger.debug(f"[{request_id}] Request payload keys: {list(payload.keys())} | txnid={txnid}")

        # Step 3: Call PayU API with timeout
        try:
            response = requests.post(url, data=payload, timeout=10)
            logger.info(f"[{request_id}] PayU verification response received | status_code={response.status_code}")
        except requests.exceptions.Timeout:
            logger.error(f"[{request_id}] ⏰ PayU verification timeout for txnid: {txnid}")
            return Response({"error": "Gateway timeout"}, status=504)
        except requests.exceptions.ConnectionError:
            logger.error(f"[{request_id}] 🔌 Connection error to PayU verification API")
            return Response({"error": "Cannot connect to payment gateway"}, status=502)
        except requests.exceptions.RequestException as req_error:
            logger.error(f"[{request_id}] Request exception during verification: {str(req_error)}")
            return Response({"error": "Payment verification failed"}, status=502)

        # Step 4: Handle non-200 responses
        if response.status_code != 200:
            logger.error(f"[{request_id}] PayU verification API returned non-200 | status_code={response.status_code} | response={response.text[:300]}")
            return Response({"error": "PayU API error"}, status=502)

        # Step 5: Safe JSON parsing
        try:
            response_data = response.json()
            logger.info(f"[{request_id}] PayU verification response parsed successfully | Response keys: {list(response_data.keys())}")
            
            # Update payment status in database
            try:
                verify_data_response = verify_payment_update(response_data, payment_method, order_id)
                logger.info(f"[{request_id}] Payment record updated successfully for txnid: {txnid}")
            except Exception as update_error:
                logger.error(f"[{request_id}] Failed to update payment record: {str(update_error)}")
                # Continue execution even if update fails - we still return verification result
                
        except json.JSONDecodeError as json_error:
            logger.error(f"[{request_id}] Invalid JSON from PayU | error={str(json_error)} | response={response.text[:300]}")
            return Response({"error": "Invalid response from payment gateway"}, status=502)

        # Step 6: Business validation
        payu_status = response_data.get("status")
        
        if payu_status != 1:
            logger.warning(f"[{request_id}] Payment verification FAILED for txnid: {txnid} | payu_status={payu_status}")
            logger.warning(f"[{request_id}] Response details: {response_data.get('message', 'No message')}")
            
            # Log specific failure reasons if available
            if response_data.get('error'):
                logger.warning(f"[{request_id}] PayU error: {response_data.get('error')}")
            
            return Response({
                "status": "failed",
                "data": response_data,
                "verify_data_response": verify_data_response
            }, status=200)

        # Success case
        logger.info(f"[{request_id}] ✅ Payment verified SUCCESSFULLY for txnid: {txnid}")
        
        # Extract and log transaction details
        transaction_details = response_data.get('transaction_details', {})
        if txnid in transaction_details:
            tx_details = transaction_details[txnid]
            logger.info(f"[{request_id}] Transaction details | status={tx_details.get('status')} | amount={tx_details.get('amount')} | mode={tx_details.get('mode')}")

        return Response({
            "status": "success",
            "data": response_data,
            "verify_data_response": verify_data_response
        }, status=200)

    except Exception as e:
        logger.exception(f"[{request_id}] ❌ Unexpected error during payment verification | txnid={request.GET.get('txnid', 'Unknown')} | error={str(e)}")
        return Response({"error": "Internal server error"}, status=500)


@api_view(['GET'])
def payment_method_details(request):
    """
    Get available payment methods with their details
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        logger.info(f"[{request_id}] 💳 Payment method details API called")
        
        BASE_ICON_URL = "https://yourcdn.com/payment-icons/"

        PAYMENT_METHOD_MAP = {
            "credit_card": 1,
            "debit_card": 2,
            "upi": 3,
            "netbanking": 4,
            "cod": 5,
            "wallet": 6,
        }

        logger.debug(f"[{request_id}] Loading payment methods configuration")

        # ================= RAW DATA ================= #

        upi_apps = [
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "paytm",
                "name": "Paytm",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/paymt_image.webp",
                "packageName": "net.one97.paytm",
                "scheme": "paytm://upi/pay?",
                "iosScheme": "paytm://upi/pay?",
                "priority": 1,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "phonepe",
                "name": "PhonePe",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/phonepe.png",
                "packageName": "com.phonepe.app",
                "scheme": "phonepe://upi/pay?",
                "iosScheme": "phonepe://upi/pay?",
                "priority": 2,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "googlepay",
                "name": "Google Pay",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/googlepay.jpg",
                "packageName": "com.google.android.apps.nbu.paisa.user",
                "scheme": "gpay://upi/pay?",
                "iosScheme": "gpay://upi/pay?",
                "priority": 3,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "cred",
                "name": "CRED",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/credlogo.webp",
                "packageName": "com.cred.club",
                "scheme": "credpay://upi/pay?",
                "iosScheme": "credpay://upi/pay?",
                "priority": 4,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "bhim",
                "name": "BHIM",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/bhimupilogo.jpg",
                "packageName": "in.org.npci.upiapp",
                "scheme": "bhim://upi/pay?",
                "iosScheme": "bhim://upi/pay?",
                "priority": 5,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "whatsapp",
                "name": "WhatsApp Pay",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/whatsapppaylogo.png",
                "packageName": "",
                "scheme": "upi://pay?",
                "iosScheme": "upi://pay?",
                "priority": 6,
                "is_active": True
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "amazonpay",
                "name": "Amazon Pay",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/amazonpaylogo.png",
                "packageName": "in.amazon.mShop.android.shopping",
                "scheme": "amazonpay://upi/pay?",
                "iosScheme": "amazonpay://upi/pay?",
                "priority": 7,
                "is_active": True
            }
        ]

        wallets = [
            {
                "method_id": PAYMENT_METHOD_MAP["wallet"],
                "id": "eatoor_money",
                "name": "Eatoor Money",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/eatoormob.png",
                "balance": 0,
                "is_active": True
            }
        ]

        netbanking = {
            "method_id": PAYMENT_METHOD_MAP["netbanking"],
            "is_active": False,
            "icon": f"{BASE_ICON_URL}netbanking.png",
            "supported_banks": [
                {"code": "HDFC", "name": "HDFC Bank"},
                {"code": "ICICI", "name": "ICICI Bank"},
                {"code": "SBI", "name": "State Bank of India"},
                {"code": "AXIS", "name": "Axis Bank"}
            ]
        }

        cards = {
            "is_active": False,
            "icon": f"{BASE_ICON_URL}card.png",
            "supported": [
                {
                    "type": "credit_card",
                    "method_id": PAYMENT_METHOD_MAP["credit_card"]
                },
                {
                    "type": "debit_card",
                    "method_id": PAYMENT_METHOD_MAP["debit_card"]
                }
            ]
        }

        cod = {
            "method_id": PAYMENT_METHOD_MAP["cod"],
            "is_active": True,
            "icon": f"{BASE_ICON_URL}cod.png",
            "message": "Cash on Delivery available"
        }

        logger.debug(f"[{request_id}] Raw payment data loaded | UPI apps: {len(upi_apps)} | Wallets: {len(wallets)}")

        # ================= PROCESSING ================= #

        # Filter & sort UPI apps
        active_upi_apps = sorted(
            [app for app in upi_apps if app.get("is_active")],
            key=lambda x: x.get("priority", 999)
        )
        logger.debug(f"[{request_id}] Active UPI apps after filtering: {len(active_upi_apps)}")

        # Filter wallets
        active_wallets = [w for w in wallets if w.get("is_active")]
        logger.debug(f"[{request_id}] Active wallets after filtering: {len(active_wallets)}")

        # Build response dynamically
        data = {}

        if active_upi_apps:
            data["upi_apps"] = active_upi_apps
            logger.info(f"[{request_id}] Added {len(active_upi_apps)} UPI apps to response")

        if active_wallets:
            data["wallets"] = active_wallets
            logger.info(f"[{request_id}] Added {len(active_wallets)} wallets to response")

        if netbanking.get("is_active"):
            data["netbanking"] = netbanking
            logger.info(f"[{request_id}] Added netbanking to response")

        if cards.get("is_active"):
            data["cards"] = cards
            logger.info(f"[{request_id}] Added cards to response")

        if cod.get("is_active"):
            data["cod"] = cod
            logger.info(f"[{request_id}] Added COD to response")

        response_data = {
            "success": True,
            "data": data
        }
        
        logger.info(f"[{request_id}] ✅ Payment methods response prepared successfully | Total categories: {len(data)}")
        
        return Response(response_data)

    except KeyError as key_error:
        logger.error(f"[{request_id}] Key error in payment method mapping: {str(key_error)}")
        return Response(
            {
                "success": False,
                "error": "Configuration error"
            },
            status=500
        )
    except Exception as e:
        logger.exception(f"[{request_id}] ❌ Payment Method API Error: {str(e)}")
        return Response(
            {
                "success": False,
                "error": "Internal server error"
            },
            status=500
        )

@api_view(['GET'])
def payment_vpa_validate(request):
    MERCHANT_KEY = settings.PAYU_MERCHANT_KEY
    MERCHANT_SALT = settings.PAYU_MERCHANT_SALT
    PAYU_BASE_URL = settings.PAYU_BASE_URL

    command = "validateVPA"
    vpa = request.query_params.get('vpa')
    user_id = request.query_params.get('user_id')

    if not vpa:
        logger.warning("VPA missing in request")
        return Response(
            {"status": "error", "message": "VPA is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info("Starting VPA validation for: %s", vpa)

    try:

        hash_payload = {
            "key": MERCHANT_KEY,
            "command": command,
            "txnid": vpa,
        }

        hash_value = verify_payment_generate_hash(hash_payload, MERCHANT_SALT)

        logger.debug("Generated hash: %s", hash_value)

        url = f"{PAYU_BASE_URL}/merchant/postservice?form=2"

        payload = {
            "key": MERCHANT_KEY,
            "command": command,
            "var1": vpa,
            "hash": hash_value
        }

        headers = {
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        logger.info("Sending request to PayU for VPA validation")

        response = requests.post(url, data=payload, headers=headers)

        logger.info("PayU response status: %s", response.status_code)

        response.raise_for_status()
        json_response = response.json()

        if json_response['status'] == "SUCCESS":  # PayU success case

            upsert_user_payment_method(
                user_id=user_id,
                payment_type="UPI",
                provider="PAYU",
                payment_identifier=vpa,
                payment_data={
                    "identifier": vpa,
                    "payu_response": json_response
                },
                is_default=True  # optional
            )

        logger.info("VPA validation successful for: %s", vpa)

        return Response(json_response, status=status.HTTP_200_OK)

    except requests.exceptions.RequestException as e:
        logger.error("Request error during VPA validation: %s", str(e), exc_info=True)
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_502_BAD_GATEWAY
        )

    except Exception as e:
        logger.exception("Unexpected error during VPA validation")
        return Response(
            {"status": "error", "message": "Something went wrong"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )