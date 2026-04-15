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

from .utils import create_payment_generate_hash, verify_payment_generate_hash


# ✅ Logger setup
logger = logging.getLogger(__name__)


@api_view(['GET'])
def initiate_payment(request):
    try:
        logger.info("🚀 Initiate payment API called")

        # ✅ Get data from request
        amount = request.GET.get('amount')
        productinfo = request.GET.get('productinfo')
        firstname = request.GET.get('firstname')
        email = request.GET.get('email')
        phone = request.GET.get('phone')

        logger.debug(f"📥 Incoming params | amount={amount}, productinfo={productinfo}, firstname={firstname}, email={email}, phone={phone}")

        # ✅ Validation
        if not all([amount, productinfo, firstname, email, phone]):
            logger.warning("⚠️ Missing required parameters")
            return Response({
                "error": "Missing required parameters"
            }, status=400)

        # ✅ Generate txnid
        txnid = str(uuid.uuid4())[:20]
        logger.info(f"🆔 Generated txnid: {txnid}")

        # ✅ URLs
        application_base_url = settings.REACT_APP_BASE_URL
        surl = f"{application_base_url}/api/payment/success/"
        furl = f"{application_base_url}/api/payment/failure/"

        logger.debug(f"🔗 Redirect URLs | surl={surl}, furl={furl}")

        # ✅ Hash params
        hash_params = {
            'key': settings.PAYU_MERCHANT_KEY,
            'txnid': txnid,
            'amount': amount,
            'productinfo': productinfo,
            'firstname': firstname,
            'email': email,
            'udf1': ''
        }

        logger.debug(f"🔐 Hash params: {hash_params}")

        hashh = create_payment_generate_hash(hash_params, settings.PAYU_MERCHANT_SALT)

        logger.info(f"🔑 Hash generated successfully for txnid={txnid}")

        # ✅ Final PayU params
        api_params = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "amount": amount,
            "productinfo": productinfo,
            "firstname": firstname,
            "lastname": "",
            "email": email,
            "phone": phone,
            "surl": surl,
            "furl": furl,
            "pg": "UPI",
            "bankcode": "INTENT",
            "txn_s2s_flow": "4",
            "hash": hashh,
            "udf1": "",
            "udf2": "",
            "udf3": "",
            "udf4": "",
            "udf5": ""
        }

        logger.debug(f"📤 PayU request payload: {api_params}")

        # ✅ PayU API URL
        endpoint = "_payment"
        base_url = settings.PAYU_BASE_URL
        url = f"{base_url}/{endpoint}"

        logger.info(f"🌐 Sending request to PayU | URL={url}")

        # ✅ Make POST request
        response = requests.post(url, data=api_params)

        logger.info(f"📡 PayU response received | status={response.status_code} response type {type(response)}")

        # Log response (trim large HTML)
        logger.debug(f"📄 PayU response body (first 500 chars): {response.text[:500]}")

        return Response({
            "status": "success",
            "payu_response": response.json(),
            "txnid": txnid
        }, status=200)

    except Exception as e:
        logger.exception("❌ Initiate payment failed with exception")
        return Response({
            "error": "Something went wrong",
            "details": str(e)
        }, status=500)

# ✅ 2. SUCCESS CALLBACK
@csrf_exempt
@api_view(['POST'])
def payment_success(request):
    try:
        data = request.data

        logger.info(f"Payment SUCCESS callback received: {data}")

        # 🔥 Verify hash
        is_valid = verify_payment_generate_hash(data)

        if not is_valid:
            logger.warning("Hash verification FAILED")
        else:
            logger.info("Hash verification SUCCESS")

        return Response({
            "status": "success",
            "hash_verified": is_valid,
            "response": data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Success callback error: {str(e)}")
        return Response({"error": "Callback error"}, status=500)


# ❌ 3. FAILURE CALLBACK
@csrf_exempt
@api_view(['POST'])
def payment_failure(request):
    try:
        data = request.data

        logger.info(f"Payment FAILURE callback received: {data}")

        return Response({
            "status": "failure",
            "response": data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Failure callback error: {str(e)}")
        return Response({"error": "Callback error"}, status=500)

@api_view(['GET'])
def verify_payment_payu(request):
    txnid = request.GET.get("txnid")

    if not txnid:
        logger.warning("Verify Payment Failed | Missing txnid")
        return Response({"error": "txnid required"}, status=400)

    logger.info("Verify Payment Initiated", extra={"txnid": txnid})

    try:
        command = "verify_payment"

        # Step 1: Generate hash
        hash_payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "command": command,
        }

        hashh = verify_payment_generate_hash(
            hash_payload,
            settings.PAYU_MERCHANT_SALT
        )

        # Step 2: Prepare request payload
        payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "command": command,
            "var1": txnid,
            "hash": hashh
        }

        url = f"{settings.PAYU_BASE_URL}/merchant/postservice?form=2"

        logger.debug("PayU Verify Request", extra={
            "txnid": txnid,
            "url": url,
            "payload_keys": list(payload.keys())  # avoid logging sensitive values
        })

        # Step 3: Call PayU API with timeout
        response = requests.post(url, data=payload, timeout=10)

        logger.info("PayU Verify Response Received", extra={
            "txnid": txnid,
            "status_code": response.status_code
        })

        # Step 4: Handle non-200 responses
        if response.status_code != 200:
            logger.error("PayU Verify API Failed", extra={
                "txnid": txnid,
                "status_code": response.status_code,
                "response": response.text[:300]  # truncate large response
            })
            return Response({"error": "PayU API error"}, status=502)

        # Step 5: Safe JSON parsing
        try:
            response_data = response.json()
        except ValueError:
            logger.error("Invalid JSON from PayU", extra={
                "txnid": txnid,
                "response": response.text[:300]
            })
            return Response({"error": "Invalid response from payment gateway"}, status=502)

        # Step 6: Business validation (IMPORTANT)
        if response_data.get("status") != 1:
            logger.warning("Payment Verification Failed", extra={
                "txnid": txnid,
                "payu_status": response_data.get("status")
            })
            return Response({
                "status": "failed",
                "data": response_data
            }, status=200)

        logger.info("Payment Verified Successfully", extra={"txnid": txnid})

        return Response({
            "status": "success",
            "data": response_data
        }, status=200)

    except requests.exceptions.Timeout:
        logger.error("PayU Verify Timeout", extra={"txnid": txnid})
        return Response({"error": "Gateway timeout"}, status=504)

    except requests.exceptions.RequestException as e:
        logger.error("PayU Request Exception", extra={
            "txnid": txnid,
            "error": str(e)
        })
        return Response({"error": "Payment verification failed"}, status=502)

    except Exception as e:
        logger.exception("Unexpected Verify Payment Error", extra={
            "txnid": txnid
        })
        return Response({"error": "Internal server error"}, status=500)

@api_view(['GET'])
def payment_method_details(request):
    try:
        BASE_ICON_URL = "https://yourcdn.com/payment-icons/"

        PAYMENT_METHOD_MAP = {
            "credit_card": 1,
            "debit_card": 2,
            "upi": 3,
            "netbanking": 4,
            "cod": 5,
            "wallet": 6,
        }

        # ================= RAW DATA ================= #

        upi_apps = [
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "paytm",
                "name": "Paytm",
                "icon": f"{BASE_ICON_URL}paytm.png",
                "packageName": "net.one97.paytm",
                "scheme": "paytm://upi/pay?",
                "iosScheme": "paytm://upi/pay?",
                "priority": 1,
                "is_active": False
            },
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "phonepe",
                "name": "PhonePe",
                "icon": f"{BASE_ICON_URL}phonepe.png",
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
                "icon": f"{BASE_ICON_URL}gpay.png",
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
                "icon": f"{BASE_ICON_URL}cred.png",
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
                "icon": f"{BASE_ICON_URL}bhim.png",
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
                "icon": f"{BASE_ICON_URL}whatsapp.png",
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
                "icon": f"{BASE_ICON_URL}amazonpay.png",
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
                "icon": f"{BASE_ICON_URL}wallet.png",
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
            "is_active": True,
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

        # ================= PROCESSING ================= #

        # Filter & sort UPI apps
        active_upi_apps = sorted(
            [app for app in upi_apps if app.get("is_active")],
            key=lambda x: x.get("priority", 999)
        )

        # Filter wallets
        active_wallets = [w for w in wallets if w.get("is_active")]

        # Build response dynamically
        data = {}

        if active_upi_apps:
            data["upi_apps"] = active_upi_apps

        if active_wallets:
            data["wallets"] = active_wallets

        if netbanking.get("is_active"):
            data["netbanking"] = netbanking

        if cards.get("is_active"):
            data["cards"] = cards

        if cod.get("is_active"):
            data["cod"] = cod

        return Response({
            "success": True,
            "data": data
        })

    except Exception as e:
        logger.exception("Payment Method API Error")
        return Response(
            {
                "success": False,
                "error": "Internal server error"
            },
            status=500
        )