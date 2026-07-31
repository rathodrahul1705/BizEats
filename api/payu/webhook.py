from decimal import Decimal
import json
import logging
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from api.models import PaymentWebhookLog, Wallet, WalletTransaction
from api.wallet.services import add_money_success

logger = logging.getLogger(__name__)

User = get_user_model()

# PayU IP addresses for production
PAYU_IPS = [
    '3.7.89.1',
    '3.7.89.2', 
    '3.7.89.3',
    '52.140.8.88',
    '52.140.8.89',
    '52.140.8.64',
]

PAYU_TEST_IPS = [
    '180.179.174.1',
    '3.6.73.183',
    '3.6.83.44',
]


def verify_payu_ip(request):
    """Verify that the request is from PayU's IP range"""
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip:
        ip = request.META.get('REMOTE_ADDR')
    
    if not ip:
        return False
    
    if ip in PAYU_IPS:
        return True
    
    if settings.DEBUG and ip in PAYU_TEST_IPS:
        return True
    
    logger.warning(f"Request from non-PayU IP: {ip}")
    return False


def create_webhook_log(txnid, mihpayid, event_type, status, amount, email, phone, mode, payload, processed=False):
    """Helper function to create webhook log"""
    try:
        return PaymentWebhookLog.objects.create(
            txnid=txnid,
            mihpayid=mihpayid,
            event_type=event_type,
            status=status,
            amount=str(amount) if amount else "0",
            email=email,
            phone=phone,
            mode=mode,
            payload=payload,
            processed=processed
        )
    except Exception as e:
        logger.error(f"Error creating webhook log: {e}")
        return None


def determine_transaction_type(payment_data):
    """
    Determine transaction type based on UDF fields
    udf5: Main transaction type (eatoor_money, order_payment, etc.)
    udf2: Sub-type (WALLET_TOPUP, ORDER, etc.)
    """
    udf5 = payment_data.get('udf5', '')
    udf2 = payment_data.get('udf2', '')
    
    # Check udf5 first for primary type
    if udf5 == 'eatoor_money':
        return 'wallet_topup'
    elif udf5 == 'order_payment':
        return 'order_payment'
    elif udf5 == 'order_refund':
        return 'order_refund'
    elif udf5 == 'promo_credit':
        return 'promo_credit'
    else:
        # Fallback to udf2
        if udf2 == 'WALLET_TOPUP':
            return 'wallet_topup'
        elif udf2 == 'ORDER':
            return 'order_payment'
        else:
            return 'unknown'


@csrf_exempt
@require_http_methods(["GET", "POST"])
def customer_payment_success(request):
    """
    PayU Webhook endpoint for payment events.
    Handles payment success, failure, refund, and dispute events.
    """
    logger.info("=" * 80) 
    logger.info("Received PayU Webhook Event")
    logger.info("=" * 80)
    logger.info("Method: %s", request.method)
    logger.info("Content-Type: %s", request.content_type)
    
    logger.info("Headers: %s", dict(request.headers))
    
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
    logger.info("Client IP: %s", ip)

    # Handle GET requests (verification pings from PayU)
    if request.method == 'GET':
        logger.info("GET request received - verification ping from PayU")
        return HttpResponse("OK", status=200)
    
    # Handle POST requests
    payment_data = {}
    event_type = None
    raw_payload = {}
    
    content_type = request.content_type or ''
    
    if 'application/json' in content_type:
        try:
            raw_data = json.loads(request.body.decode('utf-8'))
            logger.info("Raw JSON Data: %s", raw_data)
            
            # Check if this is the new nested format with event_payload
            if 'event_payload' in raw_data:
                payment_data = raw_data.get('event_payload', {})
                event_type_wrapper = raw_data.get('event_type', '')
                status_wrapper = raw_data.get('status', '')
                
                if event_type_wrapper == 'payment':
                    if status_wrapper.lower() == 'success':
                        event_type = 'payment_success'
                    elif status_wrapper.lower() == 'failure':
                        event_type = 'payment_failure'
                    else:
                        event_type = 'payment_pending'
                
                logger.info(f"Extracted nested payload - Event: {event_type}, Status: {status_wrapper}")
                
                if 'action' in payment_data and payment_data.get('action') == 'refund':
                    event_type = 'refund'
                elif 'event' in payment_data and payment_data.get('event') == 'dispute':
                    event_type = 'dispute'
                    
                raw_payload = raw_data
            else:
                payment_data = raw_data
                raw_payload = raw_data
                
                if payment_data.get('action') == 'refund':
                    event_type = 'refund'
                elif payment_data.get('event') == 'dispute':
                    event_type = 'dispute'
                    
            logger.info("Payment Data: %s", payment_data)
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return HttpResponse("Bad Request", status=400)
            
    else:
        if request.POST:
            payment_data = request.POST.dict()
            logger.info("POST Form Data: %s", payment_data)
        else:
            try:
                from urllib.parse import parse_qs
                raw_body = request.body.decode('utf-8')
                parsed = parse_qs(raw_body)
                payment_data = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
                logger.info("Parsed form-urlencoded from raw body: %s", payment_data)
            except Exception as e:
                logger.warning(f"Could not parse raw body: {e}")
                payment_data = {}
        
        raw_payload = payment_data
        
        status = payment_data.get('status')
        unmappedstatus = payment_data.get('unmappedstatus')
        
        if status == 'success' and unmappedstatus in ['captured', 'auth']:
            event_type = 'payment_success'
        elif status == 'failure' or unmappedstatus in ['failed', 'dropped', 'bounced', 'userCancelled']:
            event_type = 'payment_failure'
        elif status == 'pending' or unmappedstatus in ['pending', 'initiated', 'in progress']:
            event_type = 'payment_pending'
    
    # If no data received
    if not payment_data:
        logger.warning("No payment data received")
        return JsonResponse({
            'status': 'pending',
            'message': 'No payment data received',
            'transaction_id': '',
            'payment_status': ''
        }, status=200)
    
    # Get the unique transaction ID
    txnid = payment_data.get('txnid') or payment_data.get('merchantTxnId')
    mihpayid = payment_data.get('mihpayid')
    
    if not txnid:
        logger.error("No transaction ID found in webhook data")
        return JsonResponse({
            'status': 'error',
            'message': 'Transaction ID missing',
            'payment_status': 'error'
        }, status=200)
    
    # Extract common fields
    amount = payment_data.get('amount') or payment_data.get('amt')
    email = payment_data.get('email')
    phone = payment_data.get('phone')
    mode = payment_data.get('mode') or payment_data.get('refund_mode')
    udf5 = payment_data.get('udf5', 'unknown')
    udf2 = payment_data.get('udf2', '')
    
    logger.info(f"Processing webhook for Transaction ID: {txnid}, UDF5: {udf5}, UDF2: {udf2}")
    
    # Determine transaction type
    txn_type = determine_transaction_type(payment_data)
    logger.info(f"Determined transaction type: {txn_type}")
    
    # Process based on event type
    try:
        response_data = {
            'status': 'pending',
            'message': 'Payment status: ',
            'transaction_id': txnid,
            'payment_status': event_type or 'unknown',
            'transaction_type': txn_type
        }
        
        # Create webhook log before processing
        webhook_log = create_webhook_log(
            txnid=txnid,
            mihpayid=mihpayid,
            event_type=event_type or 'unknown',
            status=payment_data.get('status', 'unknown'),
            amount=amount,
            email=email,
            phone=phone,
            mode=mode,
            payload=raw_payload,
            processed=False
        )
        
        if event_type == 'payment_success':
            handle_successful_payment(payment_data, txnid, txn_type, webhook_log)
            response_data['status'] = 'success'
            response_data['message'] = 'Payment processed successfully'
            response_data['payment_status'] = 'success'
            
        elif event_type == 'payment_failure':
            handle_failed_payment(payment_data, txnid, txn_type, webhook_log)
            response_data['status'] = 'failed'
            response_data['message'] = 'Payment failed'
            response_data['payment_status'] = 'failed'
            
        elif event_type == 'payment_pending':
            handle_pending_payment(payment_data, txnid, txn_type, webhook_log)
            response_data['status'] = 'pending'
            response_data['message'] = 'Payment is pending'
            response_data['payment_status'] = 'pending'
            
        elif event_type == 'refund':
            handle_refund_payment(payment_data, txnid, txn_type, webhook_log)
            response_data['status'] = 'refunded'
            response_data['message'] = 'Refund processed'
            response_data['payment_status'] = 'refunded'
            
        elif event_type == 'dispute':
            handle_dispute_payment(payment_data, txnid, txn_type, webhook_log)
            response_data['status'] = 'dispute'
            response_data['message'] = 'Dispute registered'
            response_data['payment_status'] = 'dispute'
            
        else:
            # Fallback handling
            if payment_data.get('status') == 'success':
                handle_successful_payment(payment_data, txnid, txn_type, webhook_log)
                response_data['status'] = 'success'
                response_data['message'] = 'Payment processed successfully'
                response_data['payment_status'] = 'success'
            elif payment_data.get('status') == 'failure':
                handle_failed_payment(payment_data, txnid, txn_type, webhook_log)
                response_data['status'] = 'failed'
                response_data['message'] = 'Payment failed'
                response_data['payment_status'] = 'failed'
            else:
                logger.info(f"Unknown event type: {payment_data}")
                response_data['message'] = 'Unknown event type'
        
        # Mark webhook log as processed
        if webhook_log:
            webhook_log.processed = True
            webhook_log.save()
        
        return JsonResponse(response_data, status=200)
        
    except Exception as e:
        logger.error(f"Error processing webhook for transaction {txnid}: {str(e)}", exc_info=True)
        
        # Update webhook log with error
        if webhook_log:
            webhook_log.payload = {
                **webhook_log.payload,
                'error': str(e),
                'error_timestamp': str(timezone.now())
            }
            webhook_log.save()
        
        return JsonResponse({
            'status': 'error',
            'message': f'Error processing webhook: {str(e)}',
            'transaction_id': txnid,
            'payment_status': 'error'
        }, status=200)


def handle_successful_payment(data, txnid, txn_type, webhook_log=None):
    """Handle successful payment webhook event using txnid"""
    logger.info(f"Processing successful payment for transaction: {txnid}, Type: {txn_type}")
    
    # Extract all relevant data
    mihpayid = data.get('mihpayid')
    amount = data.get('amount')
    net_amount_debit = data.get('net_amount_debit', amount)
    email = data.get('email')
    phone = data.get('phone')
    mode = data.get('mode')
    bank_ref_num = data.get('bank_ref_num')
    pg_type = data.get('PG_TYPE')
    unmappedstatus = data.get('unmappedstatus')
    addedon = data.get('addedon')
    
    # User defined fields
    udf1 = data.get('udf1')
    udf2 = data.get('udf2')
    udf3 = data.get('udf3')
    udf4 = data.get('udf4')
    udf5 = data.get('udf5')
    
    logger.info(f"Payment Successful - Transaction: {txnid}, PayU ID: {mihpayid}, "
                f"Amount: {amount}, Net: {net_amount_debit}, Mode: {mode}, "
                f"PG Type: {pg_type}, UDF5: {udf5}, UDF2: {udf2}")
    
    try:
        # Handle different transaction types
        if txn_type == 'wallet_topup':
            handle_wallet_topup(data, txnid, webhook_log)
        elif txn_type == 'order_payment':
            handle_order_payment(data, txnid, webhook_log)
        elif txn_type == 'order_refund':
            handle_order_refund(data, txnid, webhook_log)
        elif txn_type == 'promo_credit':
            handle_promo_credit(data, txnid, webhook_log)
        else:
            # Fallback: Try to determine from udf2
            if udf2 == 'WALLET_TOPUP':
                handle_wallet_topup(data, txnid, webhook_log)
            elif udf2 == 'ORDER':
                handle_order_payment(data, txnid, webhook_log)
            else:
                logger.warning(f"Unknown transaction type for {txnid}: UDF5={udf5}, UDF2={udf2}")
                # Default to wallet topup for backward compatibility
                handle_wallet_topup(data, txnid, webhook_log)
        
    except Exception as e:
        logger.error(f"Error updating transaction {txnid}: {e}")
        raise


def handle_wallet_topup(data, txnid, webhook_log=None):
    """Handle wallet top-up transaction"""
    logger.info(f"Processing wallet top-up for transaction: {txnid}")
    
    try:
        email = data.get('email')
        amount = Decimal(str(data.get('amount', '0')))
        mihpayid = data.get('mihpayid')
        phone = data.get('phone')
        mode = data.get('mode')
        udf1 = data.get('udf1')  # User ID or wallet ID
        udf3 = data.get('udf3')  # Additional data
        udf4 = data.get('udf4')  # Payment mode
        
        # Get user from email or udf1
        user = None
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                logger.warning(f"User not found with email: {email}")
        
        if not user and udf1:
            try:
                user = User.objects.get(id=udf1)
            except (User.DoesNotExist, ValueError):
                logger.warning(f"User not found with ID: {udf1}")
        
        if not user:
            logger.error(f"Cannot find user for wallet top-up {txnid}")
            return
        
        # Create wallet transaction using the service
        transaction = add_money_success(
            user=user,
            amount=amount,
            source="add_money",
            note=f"Wallet top-up via PayU - {mode}",
            status="success",
            txnid=txnid,
            response_json=data
        )
        
        # Update webhook log with wallet transaction reference
        if webhook_log:
            webhook_log.payload = {
                **webhook_log.payload,
                'wallet_transaction_id': str(transaction.id),
                'wallet_id': str(transaction.wallet.id)
            }
            webhook_log.save()
        
        logger.info(f"Successfully processed wallet top-up {txnid} for user {user.email}")
        
    except Exception as e:
        logger.error(f"Error processing wallet top-up {txnid}: {e}")
        raise


def handle_order_payment(data, txnid, webhook_log=None):
    """Handle order payment transaction"""
    logger.info(f"Processing order payment for transaction: {txnid}")
    
    try:
        # TODO: Implement order payment logic
        # Get order ID from udf fields
        order_id = data.get('udf1') or data.get('udf3')
        
        logger.info(f"Order payment - Transaction: {txnid}, Order ID: {order_id}")
        
        # Update order status to paid
        # Order.objects.filter(id=order_id).update(status='paid')
        
        pass
        
    except Exception as e:
        logger.error(f"Error processing order payment {txnid}: {e}")
        raise


def handle_order_refund(data, txnid, webhook_log=None):
    """Handle order refund transaction"""
    logger.info(f"Processing order refund for transaction: {txnid}")
    
    try:
        # TODO: Implement order refund logic
        order_id = data.get('udf1') or data.get('udf3')
        amount = data.get('amount')
        
        logger.info(f"Order refund - Transaction: {txnid}, Order ID: {order_id}, Amount: {amount}")
        
        # Update order status to refunded
        # Order.objects.filter(id=order_id).update(status='refunded')
        
        pass
        
    except Exception as e:
        logger.error(f"Error processing order refund {txnid}: {e}")
        raise


def handle_promo_credit(data, txnid, webhook_log=None):
    """Handle promo credit transaction"""
    logger.info(f"Processing promo credit for transaction: {txnid}")
    
    try:
        # TODO: Implement promo credit logic
        email = data.get('email')
        amount = data.get('amount')
        promo_code = data.get('udf1')
        
        logger.info(f"Promo credit - Transaction: {txnid}, Email: {email}, Promo: {promo_code}, Amount: {amount}")
        
        # Apply promo credit to user's wallet
        # user = User.objects.get(email=email)
        # credit_wallet(user.wallet, amount, source="promo_credit", note=f"Promo credit: {promo_code}")
        
        pass
        
    except Exception as e:
        logger.error(f"Error processing promo credit {txnid}: {e}")
        raise


def handle_failed_payment(data, txnid, txn_type, webhook_log=None):
    """Handle failed payment webhook event using txnid"""
    logger.info(f"Processing failed payment for transaction: {txnid}, Type: {txn_type}")
    
    mihpayid = data.get('mihpayid')
    error_code = data.get('error', 'E000')
    error_message = data.get('error_Message', 'Unknown error')
    unmappedstatus = data.get('unmappedstatus', 'failed')
    status = data.get('status', 'failure')
    
    logger.info(f"Payment Failed - Transaction: {txnid}, Error: {error_code} - {error_message}")
    logger.info(f"Failure details - Status: {status}, Unmapped: {unmappedstatus}")
    
    try:
        # If it was a wallet top-up, create a failed transaction record
        if txn_type == 'wallet_topup':
            email = data.get('email')
            amount = Decimal(str(data.get('amount', '0')))
            
            user = None
            if email:
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    logger.warning(f"User not found with email: {email}")
            
            if user:
                # Create failed wallet transaction
                from api.wallet.services import add_money_success
                add_money_success(
                    user=user,
                    amount=amount,
                    source="add_money",
                    note=f"Failed wallet top-up: {error_message}",
                    status="failed",
                    txnid=txnid,
                    response_json=data
                )
                
                logger.info(f"Created failed wallet transaction record for {txnid}")
        
        # Update webhook log
        if webhook_log:
            webhook_log.payload = {
                **webhook_log.payload,
                'failure_reason': error_message,
                'failure_code': error_code
            }
            webhook_log.save()
        
    except Exception as e:
        logger.error(f"Error processing failed payment {txnid}: {e}")
        raise


def handle_pending_payment(data, txnid, txn_type, webhook_log=None):
    """Handle pending payment webhook event using txnid"""
    logger.info(f"Processing pending payment for transaction: {txnid}, Type: {txn_type}")
    
    unmappedstatus = data.get('unmappedstatus', 'pending')
    status = data.get('status', 'pending')
    
    logger.info(f"Payment Pending - Transaction: {txnid}, Status: {status}, Unmapped: {unmappedstatus}")
    
    try:
        # Create pending transaction record if wallet top-up
        if txn_type == 'wallet_topup':
            email = data.get('email')
            amount = Decimal(str(data.get('amount', '0')))
            
            user = None
            if email:
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    logger.warning(f"User not found with email: {email}")
            
            if user:
                from api.wallet.services import add_money_success
                add_money_success(
                    user=user,
                    amount=amount,
                    source="add_money",
                    note="Wallet top-up pending",
                    status="pending",
                    txnid=txnid,
                    response_json=data
                )
                
                logger.info(f"Created pending wallet transaction record for {txnid}")
        
    except Exception as e:
        logger.error(f"Error processing pending payment {txnid}: {e}")
        raise


def handle_refund_payment(data, txnid, txn_type, webhook_log=None):
    """Handle refund webhook event (JSON) using txnid"""
    logger.info(f"Processing refund event for transaction: {txnid}, Type: {txn_type}")
    
    mihpayid = data.get('mihpayid')
    request_id = data.get('request_id')
    token = data.get('token')
    amount = data.get('amt')
    status = data.get('status')
    bank_ref_num = data.get('bank_ref_num')
    bank_arn = data.get('bank_arn')
    remark = data.get('remark')
    refund_mode = data.get('refund_mode')
    
    logger.info(f"Refund - Transaction: {txnid}, PayU ID: {mihpayid}, "
                f"Refund ID: {request_id}, Amount: {amount}, Status: {status}")
    
    try:
        # TODO: Implement refund logic based on transaction type
        if txn_type == 'order_payment':
            # Handle order refund
            pass
        elif txn_type == 'wallet_topup':
            # Handle wallet refund - reverse the wallet transaction
            pass
        
    except Exception as e:
        logger.error(f"Error processing refund for transaction {txnid}: {e}")
        raise


def handle_dispute_payment(data, txnid, txn_type, webhook_log=None):
    """Handle dispute webhook event (JSON) using txnid"""
    logger.info(f"Processing dispute event for transaction: {txnid}, Type: {txn_type}")
    
    cb_id = data.get('cb_id')
    txn_id = data.get('txn_id')
    cb_type = data.get('cb_type')
    cb_amount = data.get('cb_amount')
    cb_status = data.get('cb_status')
    reason_code = data.get('reason_code')
    
    logger.info(f"Dispute - Chargeback ID: {cb_id}, Transaction: {txnid}, "
                f"Amount: {cb_amount}, Status: {cb_status}, Reason: {reason_code}")
    
    try:
        # TODO: Implement dispute handling
        pass
        
    except Exception as e:
        logger.error(f"Error processing dispute for transaction {txnid}: {e}")
        raise