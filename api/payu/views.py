from datetime import timezone
from decimal import Decimal
from gettext import translation
import json
import uuid
from django.http import HttpResponse
import requests
import hashlib
import logging
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import User, UserPaymentMethod, Wallet, WalletTransaction
from api.models import Order
from api.payu.response_utils import APIResponse
from api.wallet.services import add_money_success, debit_wallet
from .utils import create_payment_generate_hash, get_order_id_by_razorpay_payment_id, get_order_or_fail, order_create, send_payment_notifications, update_cart_items, update_order_status, upsert_user_payment_method, verify_payment_generate_hash, verify_payment_update
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

# ✅ Logger setup
logger = logging.getLogger(__name__)

# Above give me payment intiate and verify api start

@api_view(['POST'])
def initiate_payment(request):
    """
    Initiate payment with PayU gateway
    Supports:
    1. Order Payment
    2. Wallet (Eatoor Money) Recharge
    """
    try:
        logger.info("Initiating payment request")
        data = request.data
        logger.debug(f"Incoming request data: {data}")

        # ====================================================================
        # 1. VALIDATE REQUIRED FIELDS
        # ====================================================================
        required_fields = ["total_amount", "productinfo", "firstname", "email", "phone"]
        missing = [f for f in required_fields if not data.get(f)]
        
        if missing:
            logger.warning(f"Missing payment parameters: {missing}")
            return Response(
                {"error": "Missing required parameters", "missing": missing},
                status=400
            )

        # Extract and normalize data
        amount = data.get("total_amount")
        productinfo = data.get("productinfo")
        firstname = data.get("firstname")
        email = data.get("email")
        phone = data.get("phone")
        user_id = data.get("user_id")
        payment_page = (data.get("payment_page") or "").lower()
        payment_method = data.get("payment_method")
        payment_type = data.get("payment_type")
        payment_method_type = data.get("payment_method_type")
        payment_gateway = data.get("payment_gateway", "UPI")
        vpa = data.get("vpa")
        status_mapping = {}

        # ====================================================================
        # 2. GENERATE TRANSACTION ID
        # ====================================================================
        prefix = "EATWALLET" if payment_page == "eatoor_money" else "EATORD"
        txnid = f"{prefix}_{uuid.uuid4().hex[:12]}"
        logger.info(f"Generated txnid={txnid}")

        # ====================================================================
        # 3. HANDLE WALLET PAYMENT (NO PAYU CALL)
        # ====================================================================
        if payment_page == "food_order" and payment_method_type == "WALLET":
            try:
                order_result = order_create(data)
                logger.info("Creating order...")
                
                order = get_order_or_fail(order_result['order_id'])
                wallet, _ = Wallet.objects.get_or_create(user=request.user)
                payment_step_type = "validate"
                
                status_mapping['order_payment_status_code'] = 5
                status_mapping['order_status_code'] = 1
                status_mapping['payment_status_code'] = 5

                update_order_status(order, status_mapping, payment_step_type, payment_method, payment_type)
                update_cart_items(order)
                debit_wallet(wallet, amount, "order_payment", order)
                send_payment_notifications(order)
                
                return Response({
                    "status": "success",
                    "payment_page": payment_page,
                    "order_id": order_result.get("order_id"),
                    "order_number": order_result.get("order_number"),
                    "txnid": txnid,
                    "amount": amount,
                    "wallet_transaction_id": None,
                    "payu_response": None
                }, status=200)
            
            except Exception as e:
                logger.error(f"Wallet payment failed: {str(e)}")
                return Response(
                    {"error": "Wallet payment processing failed", "details": str(e)},
                    status=400
                )

        # ====================================================================
        # 4. CREATE ORDER (IF FOOD ORDER)
        # ====================================================================
        order_id = None
        order_number = None
        order_result = None

        if payment_page == "food_order":
            required_order_fields = [
                "user_id", "restaurant_id", "delivery_address_id", 
                "subtotal", "total_amount"
            ]
            missing_order = [f for f in required_order_fields if not data.get(f)]
            
            if missing_order:
                logger.warning(f"Missing order parameters: {missing_order}")
                return Response(
                    {"error": "Missing order parameters", "missing": missing_order},
                    status=400
                )
            
            order_result = order_create(data)
            
            if not order_result.get("success"):
                logger.error(f"Order creation failed: {order_result}")
                return Response(
                    {"error": "Failed to create order", "details": order_result.get("error")},
                    status=400
                )
            
            order_id = order_result["order_id"]
            order_number = order_result["order_number"]
            logger.info(f"Order created: order_id={order_id}, order_number={order_number}")

        # ====================================================================
        # 5. GENERATE PAYU HASH
        # ====================================================================
        hash_params = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "amount": str(amount),
            "productinfo": productinfo,
            "firstname": firstname,
            "email": email,
            "udf1": str(order_id) if order_id else str(user_id),
            "udf2": order_number if order_number else "WALLET_TOPUP",
            "udf3": str(user_id),
            "udf4": payment_method,
            "udf5": payment_page,
        }
        
        hashh = create_payment_generate_hash(hash_params, settings.PAYU_MERCHANT_SALT)

        # ====================================================================
        # 6. BUILD PAYU PARAMETERS
        # ====================================================================
        payu_params = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "amount": str(amount),
            "productinfo": productinfo,
            "firstname": firstname,
            "lastname": "",
            "email": email,
            "phone": str(phone),
            "surl": f"{settings.REACT_APP_BASE_URL}/api/payment/success/",
            "furl": f"{settings.REACT_APP_BASE_URL}/api/payment/failure/",
            "pg": "UPI",
            "txn_s2s_flow": "4",
            "hash": hashh,
            "udf1": str(order_id) if order_id else str(user_id),
            "udf2": order_number if order_number else "WALLET_TOPUP",
            "udf3": str(user_id),
            "udf4": payment_method,
            "udf5": payment_page,
        }

        # Handle UPI specific flows
        if payment_method_type == "VPA":
            payu_params["vpa"] = vpa
            payu_params["bankcode"] = "UPI"
            logger.info(f"Using VPA flow. txnid={txnid}, vpa={vpa}")
        else:
            payu_params["bankcode"] = "INTENT"
            logger.info(f"Using Intent flow. txnid={txnid}")

        logger.debug(f"PayU Params: {payu_params}")

        # ====================================================================
        # 7. CALL PAYU API
        # ====================================================================
        url = f"{settings.PAYU_BASE_URL}/_payment"
        logger.info(f"Sending request to PayU: {url}")

        try:
            response = requests.post(url, data=payu_params, timeout=30)
            logger.info(f"PayU Response Status: {response.status_code}")
            
            try:
                payu_response = response.json()
            except Exception:
                payu_response = {"raw_response": response.text}
                
        except requests.exceptions.Timeout:
            logger.exception("PayU timeout")
            return Response(
                {"error": "Payment gateway timeout"},
                status=504
            )
        except requests.exceptions.RequestException as e:
            logger.exception("PayU request failed")
            return Response(
                {"error": "Payment gateway error", "details": str(e)},
                status=502
            )

        # ====================================================================
        # 8. CREATE WALLET TRANSACTION (IF WALLET RECHARGE)
        # ====================================================================
        wallet_txn = None
        
        if payment_page == "eatoor_money":
            logger.info("Wallet recharge flow detected. Creating wallet transaction...")
            try:
                wallet_txn = add_money_success(
                    user=request.user,
                    amount=amount,
                    source="add_money",
                    note="Wallet top-up initiated",
                    status="pending",
                    txnid=txnid,
                    response_json=payu_response
                )
                logger.info(f"Wallet transaction created: {wallet_txn.id}")
            except Exception as e:
                logger.error(f"Failed to create wallet transaction: {str(e)}")
                # Continue flow even if wallet transaction fails

        # ====================================================================
        # 9. UPDATE ORDER WITH PAYMENT DETAILS (IF FOOD ORDER)
        # ====================================================================
        if payment_page == "food_order" and order_result:
            try:
                verify_payment_update(
                    payu_response,
                    data.get("payment_method"),
                    order_result["order_id"],
                    data.get("payment_status"),
                    txnid,
                    "initiate",
                    data.get("payment_type")
                )
            except Exception as e:
                logger.error(f"Failed to update order payment: {str(e)}")

        # ====================================================================
        # 10. RETURN SUCCESS RESPONSE
        # ====================================================================
        return Response({
            "status": "success",
            "payment_page": payment_page,
            "order_id": order_id,
            "order_number": order_number,
            "txnid": txnid,
            "amount": amount,
            "wallet_transaction_id": wallet_txn.id if wallet_txn else None,
            "payu_response": payu_response
        }, status=200)

    except Exception as e:
        logger.exception("Unexpected error in initiate_payment")
        return Response(
            {
                "error": "Something went wrong",
                "details": str(e) if settings.DEBUG else "Internal server error"
            },
            status=500
        )
    
@api_view(['GET'])
def verify_payment_payu(request):
    """
    Verify payment status with PayU
    """
    try:
        txnid = request.GET.get("txnid")
        payment_method = request.GET.get("payment_method")
        payment_page = request.GET.get("payment_page")

        logger.info(f"🔍 Verify Payment API called | txnid={txnid} | payment_method={payment_method} payment_page= {payment_page}")

        if not txnid:
            logger.warning(f"⚠️ Verify Payment Failed | Missing txnid")
            return Response({"error": "txnid required"}, status=400)

        logger.info(f"🔍 Starting payment verification for txnid: {txnid}")

        command = "verify_payment"

        # Step 1: Generate hash
        hash_payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": txnid,
            "command": command,
        }

        logger.debug(f"Generating verification hash for txnid: {txnid}")

        try:
            hashh = verify_payment_generate_hash(
                hash_payload,
                settings.PAYU_MERCHANT_SALT
            )
            logger.debug(f"Verification hash generated successfully")
        except Exception as hash_error:
            logger.error(f"Failed to generate verification hash: {str(hash_error)}")
            return Response({"error": "Failed to generate verification hash"}, status=500)

        # Step 2: Prepare request payload
        payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "command": command,
            "var1": txnid,
            "hash": hashh
        }

        url = f"{settings.PAYU_BASE_URL}/merchant/postservice?form=2"

        logger.info(f"Sending verification request to PayU | URL={url}")
        logger.debug(f"Request payload keys: {list(payload.keys())} | txnid={txnid}")

        # Step 3: Call PayU API with timeout
        try:
            response = requests.post(url, data=payload, timeout=10)
            logger.info(f"PayU verification response received | status_code={response.status_code}")
        except requests.exceptions.Timeout:
            logger.error(f"⏰ PayU verification timeout for txnid: {txnid}")
            return Response({"error": "Gateway timeout"}, status=504)
        except requests.exceptions.ConnectionError:
            logger.error(f"🔌 Connection error to PayU verification API")
            return Response({"error": "Cannot connect to payment gateway"}, status=502)
        except requests.exceptions.RequestException as req_error:
            logger.error(f"Request exception during verification: {str(req_error)}")
            return Response({"error": "Payment verification failed"}, status=502)

        # Step 4: Handle non-200 responses
        if response.status_code != 200:
            logger.error(f"PayU verification API returned non-200 | status_code={response.status_code} | response={response.text[:300]}")
            return Response({"error": "PayU API error"}, status=502)

        # Step 5: Safe JSON parsing
        try:
            response_data = response.json()
            logger.info(f"PayU verification response parsed successfully | Response keys: {list(response_data.keys())}")
            
            # Update payment status in database
            try:
                verify_data_response = verify_payment_update(response_data, payment_method)
                logger.info(f"Payment record updated successfully for txnid: {txnid}")
            except Exception as update_error:
                logger.error(f"Failed to update payment record: {str(update_error)}")
                # Continue execution even if update fails - we still return verification result
                
        except json.JSONDecodeError as json_error:
            logger.error(f"Invalid JSON from PayU | error={str(json_error)} | response={response.text[:300]}")
            return Response({"error": "Invalid response from payment gateway"}, status=502)

        # Step 6: Business validation
        payu_status = response_data.get("status")
        
        if payu_status != 1:
            logger.warning(f"Payment verification FAILED for txnid: {txnid} | payu_status={payu_status}")
            logger.warning(f"Response details: {response_data.get('message', 'No message')}")
            
            # Log specific failure reasons if available
            if response_data.get('error'):
                logger.warning(f"PayU error: {response_data.get('error')}")
            
            return Response({
                "status": "failed",
                "data": response_data,
                "verify_data_response": verify_data_response
            }, status=200)

        # Success case
        logger.info(f"✅ Payment verified SUCCESSFULLY for txnid: {txnid}")
        
        # Extract and log transaction details
        transaction_details = response_data.get('transaction_details', {})
        if txnid in transaction_details:
            tx_details = transaction_details[txnid]
            logger.info(f"Transaction details | status={tx_details.get('status')} | amount={tx_details.get('amount')} | mode={tx_details.get('mode')}")

        return Response({
            "status": "success",
            "data": response_data,
            "verify_data_response": verify_data_response
        }, status=200)

    except Exception as e:
        logger.exception(f"❌ Unexpected error during payment verification | txnid={request.GET.get('txnid', 'Unknown')} | error={str(e)}")
        return Response({"error": "Internal server error"}, status=500)

# Validate api start

@api_view(['GET'])
def validate_payment(request):
    """
    Verify payment status with PayU
    """
    # Extract parameters
    txnid = request.GET.get("txnid")
    payment_method = request.GET.get("payment_method")
    payment_page = request.GET.get("payment_page")

    # Validate required parameters
    if not txnid:
        logger.warning("⚠️ Verify Payment Failed | Missing txnid")
        return APIResponse.validation_error(
            message="txnid is required",
            errors={"txnid": "This field is required"},
            status_code=400
        )

    logger.info(f"🔍 Verify Payment API called | txnid={txnid} | payment_method={payment_method} | payment_page={payment_page}")

    try:
        # ============ HANDLE WALLET TOP-UP (eatoor_money) ============
        if payment_page == "eatoor_money":
            return _handle_wallet_verification(request, txnid)

        # ============ HANDLE REGULAR PAYMENT VERIFICATION ============
        return _handle_regular_payment_verification(request, txnid, payment_method)

    except Exception as e:
        logger.exception(f"❌ Unexpected error during payment verification | txnid={txnid} | error={str(e)}")
        return APIResponse.error(
            message="Internal server error",
            error_code="INTERNAL_ERROR",
            status_code=500
        )


def _handle_wallet_verification(request, txnid):
    """
    Handle wallet top-up verification for eatoor_money
    """
    logger.info(f"💰 Wallet top-up verification for txnid: {txnid}")
    
    # Check existing wallet transaction
    existing_transaction = _get_existing_wallet_transaction(txnid)
    
    if existing_transaction:
        # Return response based on existing status
        if existing_transaction.status == "success":
            logger.info(f"✅ Wallet transaction already successful for txnid: {txnid}")
            return APIResponse.success(
                message="Payment already verified and processed",
                data={
                    "transaction_id": txnid,
                    "payment_status": "success",
                    "wallet_balance": existing_transaction.balance_after,
                    "amount": existing_transaction.amount,
                    "payment_page": "eatoor_money"
                },
                status_code=200
            )
        
        elif existing_transaction.status == "failed":
            logger.warning(f"⚠️ Wallet transaction failed for txnid: {txnid}")
            return APIResponse.error(
                message="Payment failed",
                data={
                    "transaction_id": txnid,
                    "payment_status": "failed",
                    "payment_page": "eatoor_money"
                },
                status_code=200
            )
        
        # If pending, proceed with verification
        logger.info(f"⏳ Wallet transaction pending for txnid: {txnid}, proceeding with verification")
    
    # Verify with PayU
    response_data, error_response = _verify_with_payu(txnid)
    
    if error_response:
        return error_response
    
    if not response_data:
        return APIResponse.error(
            message="No response from payment gateway",
            error_code="GATEWAY_NO_RESPONSE",
            status_code=502
        )
    
    # Process wallet top-up
    return _process_wallet_topup(request, txnid, response_data)


def _handle_regular_payment_verification(request, txnid, payment_method):
    """
    Handle regular payment verification (not wallet top-up)
    """
    # Verify with PayU
    response_data, error_response = _verify_with_payu(txnid)
    
    if error_response:
        return error_response
    
    if not response_data:
        return APIResponse.error(
            message="No response from payment gateway",
            error_code="GATEWAY_NO_RESPONSE",
            status_code=502
        )
    
    # Extract transaction details and status
    transaction_details = response_data.get('transaction_details', {})
    tx_details = transaction_details.get(txnid, {})
    transaction_status = tx_details.get('status', '').lower()
    unmapped_status = tx_details.get('unmappedstatus', '').lower()
    payu_status = response_data.get("status")
    
    # Determine final status with comprehensive checking
    status_info = _determine_transaction_status(payu_status, transaction_status, unmapped_status, tx_details)
    
    try:

        order_id = get_order_id_by_razorpay_payment_id(txnid)
        payment_status = 5
        payment_step_type="validate"

        logger.info(f"Payment record updated befor verify_payment_update call txnid: {txnid}, order_id: {order_id} payment_status: {payment_status}")

        verify_data_response= verify_payment_update(response_data, payment_method, order_id, payment_status, txnid, payment_step_type, payment_type=3)
        
        logger.info(f"Payment record updated successfully for txnid: {txnid}")
    except Exception as update_error:
        logger.error(f"Failed to update payment record: {str(update_error)}")
    
    # Return response based on status
    if status_info['is_successful']:
        logger.info(f"✅ Payment verified SUCCESSFULLY for txnid: {txnid}")
        logger.info(f"Transaction details | status={transaction_status} | amount={tx_details.get('transaction_amount')} | mode={tx_details.get('mode')}")
        
        return APIResponse.success(
            message="Payment verified successfully",
            data={
                "transaction_id": txnid,
                "payment_status": "success",
                "amount": tx_details.get('transaction_amount'),
                "payment_mode": tx_details.get('mode'),
                "bank_ref_no": tx_details.get('bank_ref_num'),
                "verify_data_response": None
            },
            extra={
                "payu_response": response_data
            },
            status_code=200
        )
    
    elif status_info['is_pending']:
        logger.info(f"⏳ Payment pending for txnid: {txnid} | unmappedstatus: {unmapped_status}")
        return APIResponse.pending(
            message="Payment is still being processed. Please check again later.",
            data={
                "transaction_id": txnid,
                "payment_status": "pending",
                "unmapped_status": unmapped_status,
                "verify_data_response": verify_data_response
            },
            extra={
                "payu_response": response_data
            },
            status_code=202
        )
    
    elif status_info['is_cancelled']:
        logger.warning(f"⚠️ Payment cancelled for txnid: {txnid}")
        return APIResponse.error(
            message="Payment was cancelled",
            error_code="PAYMENT_CANCELLED",
            data={
                "transaction_id": txnid,
                "payment_status": "cancelled",
                "verify_data_response": verify_data_response
            },
            extra={
                "payu_response": response_data
            },
            status_code=200
        )
    
    elif status_info['is_abandoned']:
        logger.warning(f"⚠️ Payment abandoned for txnid: {txnid}")
        return APIResponse.error(
            message="Payment was abandoned by user",
            error_code="PAYMENT_ABANDONED",
            data={
                "transaction_id": txnid,
                "payment_status": "abandoned",
                "verify_data_response": verify_data_response
            },
            extra={
                "payu_response": response_data
            },
            status_code=200
        )
    
    else:
        # Failed or unknown status
        error_message = tx_details.get('error_Message', 'Payment verification failed')
        logger.warning(f"⚠️ Payment verification FAILED for txnid: {txnid} | status={transaction_status} | error={error_message}")
        
        return APIResponse.error(
            message=error_message or "Payment failed",
            error_code=tx_details.get('error_code', 'PAYMENT_FAILED'),
            data={
                "transaction_id": txnid,
                "payment_status": "failed",
                "error_message": error_message,
                "verify_data_response": verify_data_response
            },
            extra={
                "payu_response": response_data
            },
            status_code=200
        )


def _determine_transaction_status(payu_status, transaction_status, unmapped_status, tx_details):
    """
    Determine the final transaction status based on all available status indicators
    """
    # Check for success conditions
    is_successful = (
        payu_status == 1 and 
        transaction_status in ['success', 'completed', 'captured']
    )
    
    # Check for pending conditions
    is_pending = (
        transaction_status in ['pending', 'initiated', 'processing'] or
        unmapped_status in ['in progress', 'initiated', 'pending', 'processing'] or
        (payu_status == 0 and transaction_status == 'pending')  # PayU sometimes returns 0 for pending
    )
    
    # Check for cancelled conditions
    is_cancelled = (
        transaction_status in ['cancelled', 'cancel'] or
        unmapped_status in ['cancelled', 'cancel']
    )
    
    # Check for abandoned conditions
    is_abandoned = (
        transaction_status == 'abandoned' or
        unmapped_status == 'abandoned' or
        (payu_status == 0 and unmapped_status == 'user cancelled')
    )
    
    # Check for failed conditions
    is_failed = (
        transaction_status == 'failed' or
        unmapped_status == 'failed' or
        tx_details.get('error_code') is not None or
        (payu_status == 0 and not is_pending and not is_cancelled and not is_abandoned)
    )
    
    return {
        'is_successful': is_successful,
        'is_pending': is_pending,
        'is_cancelled': is_cancelled,
        'is_abandoned': is_abandoned,
        'is_failed': is_failed,
        'raw_status': transaction_status,
        'unmapped_status': unmapped_status
    }


def _verify_with_payu(txnid):
    """
    Verify payment with PayU API
    Returns: (response_data, error_response) or (None, error_response)
    """
    command = "verify_payment"
    
    # Step 1: Generate hash
    hash_payload = {
        "key": settings.PAYU_MERCHANT_KEY,
        "txnid": txnid,
        "command": command,
    }
    
    try:
        hashh = verify_payment_generate_hash(hash_payload, settings.PAYU_MERCHANT_SALT)
        logger.debug(f"Verification hash generated successfully for txnid: {txnid}")
    except Exception as hash_error:
        logger.error(f"Failed to generate verification hash: {str(hash_error)}")
        return None, APIResponse.error(
            message="Failed to generate verification hash",
            error_code="HASH_GENERATION_FAILED",
            status_code=500
        )
    
    # Step 2: Prepare request payload
    payload = {
        "key": settings.PAYU_MERCHANT_KEY,
        "command": command,
        "var1": txnid,
        "hash": hashh
    }
    
    url = f"{settings.PAYU_BASE_URL}/merchant/postservice?form=2"
    logger.info(f"Sending verification request to PayU | URL={url}")
    
    # Step 3: Call PayU API with timeout
    try:
        response = requests.post(url, data=payload, timeout=10)
        logger.info(f"PayU verification response received | status_code={response.status_code}")
    except requests.exceptions.Timeout:
        logger.error(f"⏰ PayU verification timeout for txnid: {txnid}")
        return None, APIResponse.error(
            message="Gateway timeout",
            error_code="GATEWAY_TIMEOUT",
            status_code=504
        )
    except requests.exceptions.ConnectionError:
        logger.error(f"🔌 Connection error to PayU verification API")
        return None, APIResponse.error(
            message="Cannot connect to payment gateway",
            error_code="CONNECTION_ERROR",
            status_code=502
        )
    except requests.exceptions.RequestException as req_error:
        logger.error(f"Request exception during verification: {str(req_error)}")
        return None, APIResponse.error(
            message="Payment verification failed",
            error_code="REQUEST_FAILED",
            status_code=502
        )
    
    # Step 4: Handle non-200 responses
    if response.status_code != 200:
        logger.error(f"PayU verification API returned non-200 | status_code={response.status_code} | response={response.text[:300]}")
        return None, APIResponse.error(
            message="PayU API error",
            error_code="PAYU_API_ERROR",
            status_code=502
        )
    
    # Step 5: Parse JSON
    try:
        response_data = response.json()
        
        # Step 6: Validate response structure
        if response_data.get('status') == 0:
            error_msg = response_data.get('msg', 'Unknown error')
            logger.error(f"PayU returned error status 0 | msg={error_msg}")
            return None, APIResponse.error(
                message=f"PayU error: {error_msg}",
                error_code="PAYU_ERROR",
                status_code=400
            )
        
        if 'transaction_details' not in response_data:
            logger.error(f"Missing 'transaction_details' in PayU response | Response: {response_data}")
            return None, APIResponse.error(
                message="Invalid response structure from payment gateway",
                error_code="INVALID_RESPONSE",
                status_code=502
            )
        
        if txnid not in response_data['transaction_details']:
            logger.error(f"Transaction {txnid} not found in PayU response")
            return None, APIResponse.error(
                message="Transaction not found",
                error_code="TRANSACTION_NOT_FOUND",
                status_code=404
            )
        
        # Step 7: Extract and log transaction details
        transaction = response_data['transaction_details'][txnid]
        transaction_status = transaction.get('status', 'unknown')
        unmapped_status = transaction.get('unmappedstatus', 'unknown')
        
        logger.info(f"PayU verification response parsed successfully")
        logger.info(f"Transaction {txnid} | status={transaction_status} | unmappedstatus={unmapped_status}")
        logger.info(f"Amount={transaction.get('amount')} | mode={transaction.get('mode')} | bank_ref={transaction.get('bank_ref_num')}")
        
        # Step 8: Log specific UPI status information
        if transaction.get('mode') == 'UPI':
            logger.info(f"UPI Payment | PG_TYPE={transaction.get('PG_TYPE')} | payment_source={transaction.get('payment_source')}")
        
        return response_data, None
        
    except json.JSONDecodeError as json_error:
        logger.error(f"Invalid JSON from PayU | error={str(json_error)} | response={response.text[:300]}")
        return None, APIResponse.error(
            message="Invalid response from payment gateway",
            error_code="INVALID_JSON",
            status_code=502
        )
    except KeyError as key_error:
        logger.error(f"Missing expected key in PayU response: {str(key_error)}")
        return None, APIResponse.error(
            message="Unexpected response structure from payment gateway",
            error_code="MISSING_KEY",
            status_code=502
        )
    except Exception as e:
        logger.error(f"Unexpected error while processing PayU response: {str(e)}")
        return None, APIResponse.error(
            message="Failed to process payment verification response",
            error_code="PROCESSING_ERROR",
            status_code=500
        )


def _get_existing_wallet_transaction(txnid):
    """
    Get existing wallet transaction if it exists
    """
    try:
        from api.models import WalletTransaction
        return WalletTransaction.objects.get(transaction_id=txnid)
    except Exception as e:
        logger.debug(f"No existing wallet transaction found for {txnid}: {str(e)}")
        return None


def _process_wallet_topup(request, txnid, response_data):
    """
    Process wallet top-up after successful PayU verification
    """
    # Extract transaction details
    transaction_details = response_data.get('transaction_details', {})
    tx_details = transaction_details.get(txnid, {})
    
    # Get transaction status
    payu_status = response_data.get("status")
    transaction_status = tx_details.get('status', '').lower()
    unmapped_status = tx_details.get('unmappedstatus', '').lower()
    
    # Determine if successful
    is_successful = (
        payu_status == 1 and 
        transaction_status in ['success', 'completed', 'captured']
    )
    
    # Check if pending
    is_pending = (
        transaction_status == 'pending' or
        unmapped_status in ['in progress', 'pending', 'processing'] or
        (payu_status == 0 and transaction_status == 'pending')
    )
    
    # Handle pending status
    if is_pending:
        logger.info(f"⏳ Wallet top-up pending for txnid: {txnid} | unmappedstatus: {unmapped_status}")
        
        # Update existing transaction to pending if it exists
        existing_transaction = _get_existing_wallet_transaction(txnid)
        if existing_transaction and existing_transaction.status == "pending":
            logger.info(f"Transaction already pending for {txnid}")
        elif not existing_transaction:
            user = _get_user_from_wallet_data(tx_details)
            if user:
                try:
                    from api.wallet.services import add_money_success
                    add_money_success(
                        user=user,
                        amount=Decimal(str(tx_details.get('amount', '0'))),
                        source="add_money",
                        note=f"Wallet top-up pending - {tx_details.get('mode', 'Unknown')}",
                        status="pending",
                        txnid=txnid,
                        response_json=response_data
                    )
                    logger.info(f"Created pending wallet transaction for {txnid}")
                except Exception as e:
                    logger.error(f"Error creating pending transaction: {str(e)}")
        
        return APIResponse.pending(
            message="Payment is being processed. Please check again after some time.",
            data={
                "transaction_id": txnid,
                "payment_status": "pending",
                "unmapped_status": unmapped_status,
                "payment_page": "eatoor_money"
            },
            extra={
                "payu_response": response_data
            },
            status_code=202
        )
    
    # Handle failed/successful based on is_successful
    if not is_successful:
        logger.warning(f"⚠️ PayU verification failed for wallet top-up: {txnid} | status={transaction_status}")
        _handle_failed_wallet_transaction(txnid, tx_details, response_data)
        return APIResponse.error(
            message=tx_details.get('error_Message', 'Payment verification failed'),
            error_code=tx_details.get('error_code', 'PAYMENT_FAILED'),
            data={
                "transaction_id": txnid,
                "payment_status": "failed",
                "payment_page": "eatoor_money",
                "error_code": tx_details.get('error_code')
            },
            extra={
                "payu_response": response_data
            },
            status_code=200
        )
    
    # Payment successful - process wallet top-up
    logger.info(f"✅ PayU verification successful for wallet top-up: {txnid}")
    
    # Extract wallet data
    wallet_data = _extract_wallet_data(tx_details)
    user = _get_user_from_wallet_data(tx_details)
    
    if not user:
        logger.warning(f"User not found for wallet top-up: {txnid}")
        return APIResponse.error(
            message="User not found",
            error_code="USER_NOT_FOUND",
            data={
                "transaction_id": txnid,
                "payment_status": "failed",
                "payment_page": "eatoor_money"
            },
            status_code=200
        )
    
    # Check if transaction already exists
    existing_transaction = _get_existing_wallet_transaction(txnid)
    
    try:
        from api.wallet.services import  add_money_success
        
        if existing_transaction:
            if existing_transaction.status == "pending":

                # Add money to wallet
                wallet_transaction = add_money_success(
                    user=user,
                    amount=Decimal(str(wallet_data.get('amount', '0'))),
                    source="add_money",
                    note=f"Wallet top-up via PayU - {wallet_data.get('mode', 'Unknown')}",
                    status="success",
                    txnid=txnid,
                    response_json=wallet_data
                )
                
                wallet_balance = wallet_transaction.balance_after
                amount = wallet_transaction.amount
                
                logger.info(f"✅ Wallet top-up completed for user: {user.email} | Amount: {amount}")
                return APIResponse.success(
                    message="Payment verified and wallet updated successfully",
                    data={
                        "transaction_id": txnid,
                        "payment_status": "success",
                        "wallet_balance": wallet_balance,
                        "amount": amount,
                        "payment_page": "eatoor_money"
                    },
                    status_code=200
                )
            
            elif existing_transaction.status == "success":
                # Already processed
                logger.info(f"ℹ️ Wallet transaction already successful: {txnid}")
                return APIResponse.success(
                    message="Transaction already processed successfully",
                    data={
                        "transaction_id": txnid,
                        "payment_status": "success",
                        "wallet_balance": existing_transaction.balance_after,
                        "amount": existing_transaction.amount,
                        "payment_page": "eatoor_money"
                    },
                    status_code=200
                )
            
            else:
                # Other status (failed, cancelled, etc.)
                logger.warning(f"⚠️ Wallet transaction has status: {existing_transaction.status} for {txnid}")
                return APIResponse.error(
                    message=f"Transaction is {existing_transaction.status}",
                    error_code=f"TRANSACTION_{existing_transaction.status.upper()}",
                    data={
                        "transaction_id": txnid,
                        "payment_status": existing_transaction.status,
                        "payment_page": "eatoor_money"
                    },
                    status_code=200
                )
        
        else:
            # Create new wallet transaction
            logger.info(f"🆕 Creating new wallet transaction for {txnid}")
            
            wallet_transaction = add_money_success(
                user=user,
                amount=Decimal(str(wallet_data.get('amount', '0'))),
                source="add_money",
                note=f"Wallet top-up via PayU - {wallet_data.get('mode', 'Unknown')}",
                status="success",
                txnid=txnid,
                response_json=wallet_data
            )
            
            wallet_balance = wallet_transaction.balance_after
            amount = wallet_transaction.amount
            
            logger.info(f"✅ Wallet top-up completed for user: {user.email} | Amount: {amount}")
            return APIResponse.success(
                message="Payment verified and wallet updated successfully",
                data={
                    "transaction_id": txnid,
                    "payment_status": "success",
                    "wallet_balance": wallet_balance,
                    "amount": amount,
                    "payment_page": "eatoor_money"
                },
                status_code=200
            )
        
    except Exception as e:
        logger.error(f"❌ Error processing wallet top-up: {str(e)}", exc_info=True)
        return APIResponse.error(
            message=f"Error processing wallet top-up: {str(e)}",
            error_code="PROCESSING_ERROR",
            data={
                "transaction_id": txnid,
                "payment_page": "eatoor_money"
            },
            status_code=500
        )


def _handle_failed_wallet_transaction(txnid, tx_details, response_data):
    """
    Handle failed wallet transaction
    """
    try:
        from api.models import WalletTransaction
        from api.wallet.services import update_wallet_transaction_status, add_money_success
        
        wallet_transaction = WalletTransaction.objects.get(transaction_id=txnid)

    except WalletTransaction.DoesNotExist:
        user = _get_user_from_wallet_data(tx_details)
        if user:
            add_money_success(
                user=user,
                amount=Decimal(str(tx_details.get('amount', '0'))),
                source="add_money",
                note="Failed wallet top-up via PayU",
                status="failed",
                txnid=txnid,
                response_json=response_data
            )
        else:
            logger.warning(f"Cannot create failed transaction: User not found for {txnid}")
    except Exception as e:
        logger.error(f"Error handling failed wallet transaction: {str(e)}")


def _extract_wallet_data(tx_details):
    """
    Extract wallet data from transaction details
    """
    return {
        "email": tx_details.get("email", ""),
        "phone": tx_details.get("phone", ""),
        "amount": tx_details.get("amt") or tx_details.get("transaction_amount", "0"),
        "mihpayid": tx_details.get("mihpayid", ""),
        "txnid": tx_details.get("txnid", ""),
        "firstname": tx_details.get("firstname", ""),
        "productinfo": tx_details.get("productinfo", ""),
        "mode": tx_details.get("mode", ""),
        "status": tx_details.get("status", ""),
        "bank_ref_num": tx_details.get("bank_ref_num", ""),
        "PG_TYPE": tx_details.get("PG_TYPE", ""),
        "addedon": tx_details.get("addedon", ""),
        "udf1": tx_details.get("udf1", ""),
        "udf2": tx_details.get("udf2", ""),
        "udf3": tx_details.get("udf3", ""),
        "udf4": tx_details.get("udf4", ""),
        "udf5": tx_details.get("udf5", ""),
        "bankcode": tx_details.get("bankcode", ""),
        "payment_source": tx_details.get("payment_source", ""),
        "error_code": tx_details.get("error_code", ""),
        "error_message": tx_details.get("error_Message", ""),
        "net_amount_debit": tx_details.get("net_amount_debit", "0"),
        "unmappedstatus": tx_details.get("unmappedstatus", ""),
    }


def _get_user_from_wallet_data(tx_details):
    """
    Get user from wallet data (email or udf1)
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    email = tx_details.get('email', '')
    udf1 = tx_details.get('udf1', '')
    
    if email:
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning(f"User not found with email: {email}")
    
    if udf1:
        try:
            return User.objects.get(id=udf1)
        except (User.DoesNotExist, ValueError):
            logger.warning(f"User not found with ID: {udf1}")
    
    return None

# Above give me payment intiate and verify api end


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

def mask_vpa(vpa):
    if not vpa:
        return None
    try:
        name, domain = vpa.split("@")
        return name[:3] + "***@" + domain
    except Exception:
        return vpa

@api_view(['GET'])
def payment_method_details(request):
    """
    Get available payment methods with static + user saved methods
    """
    request_id = str(uuid.uuid4())[:8]
    user_id = request.query_params.get('user_id')
    payment_page = request.query_params.get('payment_page')

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

        # ================= STATIC DATA ================= #

        upi_apps = [
            {
                "method_id": PAYMENT_METHOD_MAP["upi"],
                "id": "paytm",
                "name": "Paytm",
                "icon": "https://eatoorprod.s3.eu-north-1.amazonaws.com/logo/paymt_image.webp",
                "packageName": "net.one97.paytm",
                "scheme": "paytmmp://upi/pay?",
                "iosScheme": "paytmmp://upi/pay?",
                "anroidScheme": "paytmmp://pay?",
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
                "anroidScheme": "phonepe://pay?",
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
                "anroidScheme": "gpay://upi/pay?",
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
                "anroidScheme": "credpay://upi/pay?",
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
                "anroidScheme": "bhim://pay?",
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
                "anroidScheme": "upi://upi/pay?",
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
                "anroidScheme": "amazonpay://upi/pay?",
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
            "is_active": False,
            "icon": f"{BASE_ICON_URL}cod.png",
            "message": "Cash on Delivery available"
        }

        # ================= FILTER STATIC ================= #

        active_upi_apps = sorted(
            [app for app in upi_apps if app.get("is_active")],
            key=lambda x: x.get("priority", 999)
        )

        active_wallets = [
            w for w in wallets
            if w.get("is_active")
            and not (
                payment_page == "eatoor_money"
                and w.get("id") == "eatoor_money"
            )
        ]

        # ================= USER SAVED METHODS ================= #

        saved_upi = []
        saved_cards = []
        saved_wallets_db = []

        if user_id:
            logger.debug(f"[{request_id}] Fetching saved methods for user {user_id}")

            user_methods = UserPaymentMethod.objects.filter(
                user_id=user_id,
                is_active=True
            )

            logger.info(f"[{request_id}] Found {user_methods.count()} saved methods")

            for method in user_methods:
                payment_data = method.payment_data or {}

                # UPI
                if method.payment_type == "UPI":
                    vpa = payment_data.get("identifier")

                    saved_upi.append({
                        "id": method.id,
                        "method_id": PAYMENT_METHOD_MAP["upi"],
                        "type": "saved_upi",
                        "vpa": mask_vpa(vpa),
                        "raw_vpa": vpa,
                        "name": payment_data.get("payu_response", {}).get("payerAccountName"),
                        "provider": method.provider,
                        "is_default": method.is_default
                    })

                # Cards
                elif method.payment_type in ["CREDIT_CARD", "DEBIT_CARD"]:
                    saved_cards.append({
                        "id": method.id,
                        "method_id": PAYMENT_METHOD_MAP[
                            "credit_card" if method.payment_type == "CREDIT_CARD" else "debit_card"
                        ],
                        "type": method.payment_type.lower(),
                        "last4": payment_data.get("last4"),
                        "card_network": payment_data.get("network"),
                        "provider": method.provider,
                        "is_default": method.is_default
                    })

                # Wallet
                elif method.payment_type == "WALLET":
                    saved_wallets_db.append({
                        "id": method.id,
                        "method_id": PAYMENT_METHOD_MAP["wallet"],
                        "type": "saved_wallet",
                        "balance": payment_data.get("balance", 0),
                        "provider": method.provider,
                        "is_default": method.is_default
                    })

        # Sort default first
        saved_upi = sorted(saved_upi, key=lambda x: not x["is_default"])
        saved_cards = sorted(saved_cards, key=lambda x: not x["is_default"])

        # ================= BUILD RESPONSE ================= #

        data = {}

        if saved_upi:
            data["saved_upi"] = saved_upi

        if active_upi_apps:
            data["upi_apps"] = active_upi_apps

        if saved_cards:
            data["saved_cards"] = saved_cards

        all_wallets = active_wallets + saved_wallets_db
        if all_wallets:
            data["wallets"] = all_wallets

        if netbanking.get("is_active"):
            data["netbanking"] = netbanking

        if cards.get("is_active"):
            data["cards"] = cards

        if cod.get("is_active"):
            data["cod"] = cod

        response_data = {
            "success": True,
            "data": data
        }

        logger.info(f"[{request_id}] ✅ Payment methods loaded successfully")

        return Response(response_data)

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

        logger.info("VPA validation successful response: %s", json_response)

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