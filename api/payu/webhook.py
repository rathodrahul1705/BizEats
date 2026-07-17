import json
import logging
import hmac
import hashlib
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings

from api.payu.utils import verify_payment_generate_hash

logger = logging.getLogger(__name__)

# PayU IP addresses for production
PAYU_IPS = [
    '3.7.89.1',
    '3.7.89.2', 
    '3.7.89.3',      # Production DC IPs
    '52.140.8.88',
    '52.140.8.89',
    '52.140.8.64',   # Production DR IPs
]

# Test environment IPs (optional)
PAYU_TEST_IPS = [
    '180.179.174.1',
    '3.6.73.183',
    '3.6.83.44',
]


def verify_payu_ip(request):
    """Verify that the request is from PayU's IP range"""
    # Get the real IP (handling proxies)
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
    if not ip:
        ip = request.META.get('REMOTE_ADDR')
    
    if not ip:
        return False
    
    # Check if in production IPs
    if ip in PAYU_IPS:
        return True
    
    # Check if in test IPs (if DEBUG mode)
    if settings.DEBUG and ip in PAYU_TEST_IPS:
        return True
    
    logger.warning(f"Request from non-PayU IP: {ip}")
    return False

def verify_payu_hash(data, received_hash):
    """Verify PayU webhook signature"""
    try:
        # Get merchant salt from settings
        salt = getattr(settings, 'PAYU_MERCHANT_SALT', '')
        
        if not salt:
            logger.warning("PayU salt not configured for hash verification")
            return True  # Skip verification if not configured
        
        command = "verify_payment"

        # Step 1: Generate hash
        hash_payload = {
            "key": settings.PAYU_MERCHANT_KEY,
            "txnid": data['txnid'],
            "command": command,
        }
        
        # Generate hash
        generated_hash = verify_payment_generate_hash(hash_payload, salt)
        
        if generated_hash is None:
            return False
        
        # Compare
        is_valid = generated_hash == received_hash
        if not is_valid:
            logger.error(f"Hash verification failed for transaction: {data.get('txnid')}")
            logger.debug(f"Generated: {generated_hash}")
            logger.debug(f"Received: {received_hash}")
        
        return is_valid
        
    except Exception as e:
        logger.error(f"Hash verification error: {e}")
        return False


@csrf_exempt
@require_http_methods(["GET", "POST"])
def customer_payment_success(request):
    """
    PayU Webhook endpoint for payment events.
    Handles payment success, failure, refund, and dispute events.
    
    The webhook supports:
    - Form POST URL Encoded (payment success/failure)
    - JSON (refund/dispute)
    - GET (verification pings)
    - Nested JSON payload with event_payload
    """
    logger.info("=" * 80) 
    logger.info("Received PayU Webhook Event")
    logger.info("=" * 80)
    logger.info("Method: %s", request.method)
    logger.info("Content-Type: %s", request.content_type)
    
    # Log headers for debugging
    logger.info("Headers: %s", dict(request.headers))
    
    # Log IP information
    ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
    logger.info("Client IP: %s", ip)

    # Handle GET requests (verification pings from PayU)
    if request.method == 'GET':
        logger.info("GET request received - verification ping from PayU")
        return HttpResponse("OK", status=200)
    
    # Handle POST requests
    payment_data = {}
    event_type = None
    nested_payload = False
    
    # Check content type to determine how to parse
    content_type = request.content_type or ''
    
    if 'application/json' in content_type:
        # JSON payload (refund/dispute or new format)
        try:
            raw_data = json.loads(request.body.decode('utf-8'))
            logger.info("Raw JSON Data: %s", raw_data)
            
            # Check if this is the new nested format with event_payload
            if 'event_payload' in raw_data:
                # New format: extract event_payload
                payment_data = raw_data.get('event_payload', {})
                nested_payload = True
                
                # Determine event type from wrapper
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
                
                # Also check for refund/dispute in nested format
                if 'action' in payment_data and payment_data.get('action') == 'refund':
                    event_type = 'refund'
                elif 'event' in payment_data and payment_data.get('event') == 'dispute':
                    event_type = 'dispute'
                    
            else:
                # Old JSON format (refund/dispute)
                payment_data = raw_data
                
                # Determine event type from JSON
                if payment_data.get('action') == 'refund':
                    event_type = 'refund'
                elif payment_data.get('event') == 'dispute':
                    event_type = 'dispute'
                    
            logger.info("Payment Data: %s", payment_data)
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return HttpResponse("Bad Request", status=400)
            
    else:
        # Form URL Encoded (payment success/failure)
        # Try to get from request.POST first
        if request.POST:
            payment_data = request.POST.dict()
            logger.info("POST Form Data: %s", payment_data)
        else:
            # Parse from raw body
            try:
                from urllib.parse import parse_qs
                raw_body = request.body.decode('utf-8')
                parsed = parse_qs(raw_body)
                payment_data = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
                logger.info("Parsed form-urlencoded from raw body: %s", payment_data)
            except Exception as e:
                logger.warning(f"Could not parse raw body: {e}")
                payment_data = {}
        
        # Determine event type from form data
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
            'message': 'Payment status: ',
            'transaction_id': '',
            'payment_status': ''
        }, status=200)
    
    # Verify hash for payment events (optional but recommended)
    if event_type in ['payment_success', 'payment_failure']:
        received_hash = payment_data.get('hash', '')
        if received_hash:
            if not verify_payu_hash(payment_data, received_hash):
                logger.error(f"Hash verification failed for transaction {payment_data.get('txnid')}")
                # Still return 200 but log the error
                # You might want to reject the webhook here
                # return HttpResponse("Invalid Hash", status=400)
    
    # Process based on event type
    try:
        response_data = {
            'status': 'pending',
            'message': 'Payment status: ',
            'transaction_id': payment_data.get('txnid', ''),
            'payment_status': event_type or 'unknown'
        }
        
        if event_type == 'payment_success':
            handle_successful_payment(payment_data)
            response_data['status'] = 'success'
            response_data['message'] = 'Payment processed successfully'
            response_data['payment_status'] = 'success'
            
        elif event_type == 'payment_failure':
            handle_failed_payment(payment_data)
            response_data['status'] = 'failed'
            response_data['message'] = 'Payment failed'
            response_data['payment_status'] = 'failed'
            
        elif event_type == 'payment_pending':
            handle_pending_payment(payment_data)
            response_data['status'] = 'pending'
            response_data['message'] = 'Payment is pending'
            response_data['payment_status'] = 'pending'
            
        elif event_type == 'refund':
            handle_refund_payment(payment_data)
            response_data['status'] = 'refunded'
            response_data['message'] = 'Refund processed'
            response_data['payment_status'] = 'refunded'
            
        elif event_type == 'dispute':
            handle_dispute_payment(payment_data)
            response_data['status'] = 'dispute'
            response_data['message'] = 'Dispute registered'
            response_data['payment_status'] = 'dispute'
            
        else:
            # Try to determine from data if event_type not set
            if 'action' in payment_data and payment_data['action'] == 'refund':
                handle_refund_payment(payment_data)
                response_data['status'] = 'refunded'
                response_data['message'] = 'Refund processed'
                response_data['payment_status'] = 'refunded'
                
            elif 'event' in payment_data and payment_data['event'] == 'dispute':
                handle_dispute_payment(payment_data)
                response_data['status'] = 'dispute'
                response_data['message'] = 'Dispute registered'
                response_data['payment_status'] = 'dispute'
                
            elif 'status' in payment_data:
                if payment_data.get('status') == 'success':
                    handle_successful_payment(payment_data)
                    response_data['status'] = 'success'
                    response_data['message'] = 'Payment processed successfully'
                    response_data['payment_status'] = 'success'
                    
                elif payment_data.get('status') == 'failure':
                    handle_failed_payment(payment_data)
                    response_data['status'] = 'failed'
                    response_data['message'] = 'Payment failed'
                    response_data['payment_status'] = 'failed'
                    
                else:
                    logger.info(f"Unknown event type: {payment_data}")
                    response_data['message'] = f'Unknown event type: {payment_data.get("status", "unknown")}'
            else:
                logger.info(f"Unknown event type: {payment_data}")
                response_data['message'] = 'Unknown event type'
        
        # Return 200 OK with response data
        return JsonResponse(response_data, status=200)
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        # Still return 200 to prevent PayU from retrying
        return JsonResponse({
            'status': 'error',
            'message': f'Error processing webhook: {str(e)}',
            'transaction_id': payment_data.get('txnid', ''),
            'payment_status': 'error'
        }, status=200)


def handle_successful_payment(data):
    """Handle successful payment webhook event"""
    logger.info("Processing successful payment")
    
    # Extract all relevant data
    txnid = data.get('txnid')
    mihpayid = data.get('mihpayid')
    amount = data.get('amount')
    net_amount_debit = data.get('net_amount_debit', amount)
    email = data.get('email')
    phone = data.get('phone')
    mode = data.get('mode')
    bank_ref_num = data.get('bank_ref_num')
    bank_ref_no = data.get('bank_ref_no', bank_ref_num)
    pg_type = data.get('PG_TYPE')
    unmappedstatus = data.get('unmappedstatus')
    addedon = data.get('addedon')
    
    # User defined fields
    udf1 = data.get('udf1')
    udf2 = data.get('udf2')
    udf3 = data.get('udf3')
    udf4 = data.get('udf4')
    udf5 = data.get('udf5')
    
    # Gateway specific fields
    field1 = data.get('field1')
    field2 = data.get('field2')
    field3 = data.get('field3')
    field4 = data.get('field4')
    field5 = data.get('field5')
    field6 = data.get('field6')
    field7 = data.get('field7')
    field8 = data.get('field8')
    field9 = data.get('field9')
    
    logger.info(f"Payment Successful - Transaction: {txnid}, PayU ID: {mihpayid}, "
                f"Amount: {amount}, Net: {net_amount_debit}, Mode: {mode}, "
                f"PG Type: {pg_type}, UDF1: {udf1}, UDF2: {udf2}, UDF5: {udf5}")
    
    # TODO: Update your database
    # try:
    #     transaction = Transaction.objects.get(transaction_id=txnid)
    #     transaction.status = 'completed'
    #     transaction.payu_payment_id = mihpayid
    #     transaction.payment_mode = mode
    #     transaction.amount = amount
    #     transaction.net_amount_debit = net_amount_debit
    #     transaction.bank_reference = bank_ref_num or bank_ref_no
    #     transaction.pg_type = pg_type
    #     transaction.payment_date = addedon
    #     transaction.completed_at = timezone.now()
    #     transaction.save()
    #     
    #     # Update user wallet/order based on udf2 (WALLET_TOPUP, ORDER, etc.)
    #     if udf2 == 'WALLET_TOPUP':
    #         # Handle wallet topup
    #         update_wallet_balance(transaction.user, amount)
    #     elif udf2 == 'ORDER':
    #         # Handle order payment
    #         update_order_status(transaction.order, 'paid')
    #     
    #     # Send confirmation
    #     send_payment_success_email(transaction)
    #     
    # except Transaction.DoesNotExist:
    #     logger.error(f"Transaction {txnid} not found")
    #     # Create a pending transaction record for manual review
    #     create_pending_transaction(data)


def handle_failed_payment(data):
    """Handle failed payment webhook event"""
    logger.info("Processing failed payment")
    
    txnid = data.get('txnid')
    mihpayid = data.get('mihpayid')
    error_code = data.get('error', 'E000')
    error_message = data.get('error_Message', 'Unknown error')
    unmappedstatus = data.get('unmappedstatus', 'failed')
    status = data.get('status', 'failure')
    
    # Gateway specific fields
    field7 = data.get('field7')
    field8 = data.get('field8')
    field9 = data.get('field9')
    
    logger.info(f"Payment Failed - Transaction: {txnid}, Error: {error_code} - {error_message}")
    logger.info(f"Failure details - Status: {status}, Unmapped: {unmappedstatus}, Field7: {field7}")
    
    # TODO: Update your database
    # try:
    #     transaction = Transaction.objects.get(transaction_id=txnid)
    #     transaction.status = 'failed'
    #     transaction.payu_payment_id = mihpayid
    #     transaction.failure_reason = error_message
    #     transaction.failure_code = error_code
    #     transaction.save()
    #     
    #     # Send failure notification
    #     send_payment_failure_email(transaction)
    #     
    # except Transaction.DoesNotExist:
    #     logger.error(f"Transaction {txnid} not found")


def handle_pending_payment(data):
    """Handle pending payment webhook event"""
    logger.info("Processing pending payment")
    
    txnid = data.get('txnid')
    unmappedstatus = data.get('unmappedstatus', 'pending')
    status = data.get('status', 'pending')
    
    logger.info(f"Payment Pending - Transaction: {txnid}, Status: {status}, Unmapped: {unmappedstatus}")
    
    # TODO: Update your database
    # try:
    #     transaction = Transaction.objects.get(transaction_id=txnid)
    #     transaction.status = 'pending'
    #     transaction.save()
    # except Transaction.DoesNotExist:
    #     logger.error(f"Transaction {txnid} not found")


def handle_refund_payment(data):
    """Handle refund webhook event (JSON)"""
    logger.info("Processing refund event")
    
    merchant_txn_id = data.get('merchantTxnId')
    mihpayid = data.get('mihpayid')
    request_id = data.get('request_id')  # PayU refund ID
    token = data.get('token')  # Merchant refund ID
    amount = data.get('amt')
    status = data.get('status')  # success or failure
    bank_ref_num = data.get('bank_ref_num')
    bank_arn = data.get('bank_arn')
    remark = data.get('remark')
    refund_mode = data.get('refund_mode')
    action = data.get('action')
    
    logger.info(f"Refund - Transaction: {merchant_txn_id}, PayU ID: {mihpayid}, "
                f"Refund ID: {request_id}, Amount: {amount}, Status: {status}")
    
    # TODO: Update your database
    # try:
    #     refund = Refund.objects.get(merchant_refund_id=token)
    #     refund.payu_refund_id = request_id
    #     refund.status = status
    #     refund.bank_reference = bank_ref_num or bank_arn
    #     refund.completed_at = timezone.now()
    #     refund.save()
    #     
    #     # If refund successful, reverse the transaction
    #     if status == 'success':
    #         transaction = Transaction.objects.get(transaction_id=merchant_txn_id)
    #         transaction.status = 'refunded'
    #         transaction.save()
    #         reverse_payment(transaction, amount)
    #         
    #     # Send notification
    #     send_refund_notification(refund)
    #     
    # except Refund.DoesNotExist:
    #     logger.error(f"Refund {token} not found")
    #     # Create a pending refund record


def handle_dispute_payment(data):
    """Handle dispute webhook event (JSON)"""
    logger.info("Processing dispute event")
    
    cb_id = data.get('cb_id')  # Chargeback ID
    txn_id = data.get('txn_id')  # PayU transaction ID
    cb_type = data.get('cb_type')
    cb_amount = data.get('cb_amount')
    cb_status = data.get('cb_status')
    reason_code = data.get('reason_code')
    created_at = data.get('created_at')
    updated_at = data.get('updated_at')
    due_date = data.get('due_date')
    mid = data.get('mid')
    
    logger.info(f"Dispute - Chargeback ID: {cb_id}, Transaction: {txn_id}, "
                f"Amount: {cb_amount}, Status: {cb_status}, Reason: {reason_code}")
    
    # TODO: Create/Update dispute record in your database
    # try:
    #     dispute, created = Dispute.objects.update_or_create(
    #         chargeback_id=cb_id,
    #         defaults={
    #             'transaction_id': txn_id,
    #             'type': cb_type,
    #             'amount': cb_amount,
    #             'status': cb_status,
    #             'reason_code': reason_code,
    #             'created_at': created_at,
    #             'updated_at': updated_at,
    #             'due_date': due_date,
    #         }
    #     )
    #     
    #     # Notify admin team about new disputes
    #     if created:
    #         send_dispute_alert(dispute)
    #         
    #     # If dispute is closed, update transaction status
    #     if cb_status in ['Closed Customer Favour', 'Closed in Merchant Favour']:
    #         transaction = Transaction.objects.get(transaction_id=txn_id)
    #         transaction.dispute_status = cb_status
    #         transaction.save()
    #         
    # except Exception as e:
    #     logger.error(f"Error processing dispute: {e}")