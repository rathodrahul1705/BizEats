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

from .utils import generate_hash


# ✅ Logger setup
logger = logging.getLogger(__name__)


import uuid
import requests
import logging
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .utils import generate_hash

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

        hashh = generate_hash(hash_params, settings.PAYU_MERCHANT_SALT)

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
        is_valid = verify_hash(data)

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


# 🔍 4. VERIFY PAYMENT
@api_view(['GET'])
def verify_payment_payu(request):
    try:
        txnid = request.GET.get("txnid")

        if not txnid:
            return Response({"error": "txnid required"}, status=400)

        logger.info(f"Verifying payment | txnid={txnid}")

        command = "verify_payment"
        hash_str = f"{settings.PAYU_MERCHANT_KEY}|{command}|{txnid}|{settings.PAYU_MERCHANT_SALT}"
        hashh = hashlib.sha512(hash_str.encode()).hexdigest().lower()

        payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "command": command,
            "var1": txnid,
            "hash": hashh
        }

        url = "https://info.payu.in/merchant/postservice?form=2"
        response = requests.post(url, data=payload)

        logger.info(f"Verify API response: {response.text}")

        return Response(response.json(), status=200)

    except Exception as e:
        logger.error(f"Verify payment error: {str(e)}")
        return Response({"error": "Verification failed"}, status=500)