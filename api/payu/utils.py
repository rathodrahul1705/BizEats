from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import logging
from anyio import current_time
from django.utils.timezone import now
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from api.models import Order, OrderStatusLog, Payment

# ✅ Logger setup
logger = logging.getLogger(__name__)


def create_payment_generate_hash(params, salt):
    """
    Generate hash for PayU payment initiation
    
    Args:
        params (dict): Payment parameters including key, txnid, amount, etc.
        salt (str): PayU merchant salt
    
    Returns:
        str: SHA-512 hash
    """
    request_id = params.get('txnid', 'unknown')[:8]
    
    try:
        logger.debug(f"[{request_id}] 🔐 Generating payment hash with params: key={params.get('key', '')[:6]}...")
        
        # Extract parameters or use empty string if not provided
        key = params['key']
        txnid = params['txnid']
        amount = params['amount']
        productinfo = params['productinfo']
        firstname = params['firstname']
        email = params['email']
        udf1 = params.get('udf1', '')
        udf2 = params.get('udf2', '')
        udf3 = params.get('udf3', '')
        udf4 = params.get('udf4', '')
        udf5 = params.get('udf5', '')
        
        # Construct hash string with exact parameter sequence
        hash_string = f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|{udf1}|{udf2}|{udf3}|{udf4}|{udf5}||||||{salt}"
        
        logger.debug(f"[{request_id}] Hash string constructed (first 100 chars): {hash_string[:100]}...")
        
        # Generate SHA-512 hash
        hash_value = hashlib.sha512(hash_string.encode('utf-8')).hexdigest()
        
        logger.info(f"[{request_id}] ✅ Payment hash generated successfully for txnid: {txnid}")
        
        return hash_value
        
    except KeyError as e:
        logger.error(f"[{request_id}] ❌ Missing required parameter for hash generation: {str(e)}")
        raise ValueError(f"Missing required parameter: {str(e)}")
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Error generating payment hash: {str(e)}", exc_info=True)
        raise


def verify_payment_generate_hash(params, salt):
    """
    Generate hash for PayU payment verification
    
    Args:
        params (dict): Verification parameters including key, txnid, command
        salt (str): PayU merchant salt
    
    Returns:
        str: SHA-512 hash
    """
    request_id = params.get('txnid', 'unknown')[:8]
    
    try:
        logger.debug(f"[{request_id}] 🔐 Generating verification hash")
        
        # Extract parameters or use empty string if not provided
        key = params['key']
        txnid = params['txnid']
        command = params['command']
        
        hash_string = f"{key}|{command}|{txnid}|{salt}"
        
        logger.debug(f"[{request_id}] Verification hash string: {hash_string[:50]}...")
        
        hash_value = hashlib.sha512(hash_string.encode('utf-8')).hexdigest()
        
        logger.info(f"[{request_id}] ✅ Verification hash generated successfully for txnid: {txnid}")
        
        return hash_value
        
    except KeyError as e:
        logger.error(f"[{request_id}] ❌ Missing required parameter for verification hash: {str(e)}")
        raise ValueError(f"Missing required parameter: {str(e)}")
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Error generating verification hash: {str(e)}", exc_info=True)
        raise


@transaction.atomic
def verify_payment_update(response_data, payment_method, order_id):
    """
    PayU Payment Verification Service - Updates payment and order records
    
    Args:
        response_data (dict): PayU verification response
        payment_method (str): Payment method used (e.g., 'UPI', 'CARD')
        order_id (int): Order ID to update
    
    Returns:
        dict: Result with success status and details
    """
    request_id = str(order_id) if order_id else 'unknown'
    
    logger.info(f"[Order-{request_id}] 🔍 Starting payment verification update process")
    logger.debug(f"[Order-{request_id}] Payment method: {payment_method}")
    
    try:
        # =========================
        # ✅ Step 1: Fetch Order
        # =========================
        logger.debug(f"[Order-{request_id}] Fetching order with ID: {order_id}")
        
        try:
            order = Order.objects.select_for_update().get(id=order_id)
            logger.info(f"[Order-{request_id}] ✅ Order found | Order number: {order.order_number} | Current status: {order.payment_status}")
        except ObjectDoesNotExist:
            logger.error(f"[Order-{request_id}] ❌ Order not found with ID: {order_id}")
            return {"success": False, "error": "Order not found"}

        # =========================
        # ✅ Step 2: Extract Transaction
        # =========================
        logger.debug(f"[Order-{request_id}] Extracting transaction details from PayU response")
        transaction_details = response_data.get("transaction_details", {})

        if not transaction_details:
            logger.error(f"[Order-{request_id}] ❌ No transaction data found in PayU response")
            logger.debug(f"[Order-{request_id}] Response data keys: {list(response_data.keys())}")
            return {"success": False, "error": "No transaction data found"}

        # Get first transaction (dynamic key)
        txn_key = list(transaction_details.keys())[0]
        txn = transaction_details[txn_key]
        
        logger.info(f"[Order-{request_id}] 📊 Transaction details extracted | Transaction key: {txn_key}")
        logger.debug(f"[Order-{request_id}] Transaction status: {txn.get('status')} | Unmapped status: {txn.get('unmappedstatus')}")

        # =========================
        # ✅ Step 3: Validate Payment Status
        # =========================
        payment_status = txn.get("status")
        unmapped_status = txn.get("unmappedstatus")
        
        if payment_status != "success" or unmapped_status != "captured":
            logger.warning(f"[Order-{request_id}] ⚠️ Payment not successful | status={payment_status} | unmappedstatus={unmapped_status}")
            return {
                "success": False,
                "error": "Payment not successful",
                "status": payment_status,
                "unmapped_status": unmapped_status
            }
        
        logger.info(f"[Order-{request_id}] ✅ Payment status validated successfully")

        # =========================
        # ✅ Step 4: Extract Fields
        # =========================
        txn_id = txn.get("txnid")
        mihpayid = txn.get("mihpayid")
        bank_ref = txn.get("bank_ref_num")
        
        logger.info(f"[Order-{request_id}] 💰 Transaction ID: {txn_id} | PayU ID: {mihpayid}")

        try:
            payment_amount = float(txn.get("transaction_amount", 0))
            logger.debug(f"[Order-{request_id}] Payment amount: {payment_amount}")
        except (TypeError, ValueError) as e:
            logger.error(f"[Order-{request_id}] ❌ Invalid payment amount format: {txn.get('transaction_amount')}")
            payment_amount = 0.0
            
        payment_mode = txn.get("mode", "UNKNOWN")  # UPI / CARD etc

        try:
            gateway_fee = float(txn.get("additional_charges", 0))
            net_amount = float(txn.get("net_amount_debit", 0))
            logger.debug(f"[Order-{request_id}] Gateway fee: {gateway_fee} | Net amount: {net_amount}")
        except (TypeError, ValueError) as e:
            logger.warning(f"[Order-{request_id}] ⚠️ Invalid fee/amount format: {str(e)}")
            gateway_fee = 0.0
            net_amount = payment_amount

        app_name = txn.get("App_Name", "")
        bankcode = txn.get("bankcode", "")
        
        logger.debug(f"[Order-{request_id}] Payment mode: {payment_mode} | App: {app_name} | Bank code: {bankcode}")

        # =========================
        # ✅ Step 5: Idempotent Payment Save
        # =========================
        logger.info(f"[Order-{request_id}] 💾 Saving/updating payment record for txn_id: {txn_id}")
        
        try:
            payment_obj, created = Payment.objects.update_or_create(
                razorpay_payment_id=txn_id,  # 🔥 Important for idempotency
                defaults={
                    "order": order,
                    "payment_gateway": 2,  # PayU
                    "payment_method": payment_method,
                    "payment_type": 2,  # online
                    "status": 5,  # captured
                    "transaction_id": mihpayid,
                    "bank_reference": bank_ref,
                    "amount": payment_amount,
                    "currency": "INR",
                    "gateway_fee": gateway_fee,
                    "net_amount": net_amount,
                    "captured_at": now(),
                    "notes": (
                        f"App: {app_name} | "
                        f"Mode: {payment_mode} | "
                        f"Bank: {bankcode}"
                    ),
                    "raw_response": txn
                }
            )
            
            if created:
                logger.info(f"[Order-{request_id}] ✅ New payment record created | Payment ID: {payment_obj.id}")
            else:
                logger.info(f"[Order-{request_id}] 🔄 Existing payment record updated | Payment ID: {payment_obj.id}")
                
        except Exception as db_error:
            logger.error(f"[Order-{request_id}] ❌ Database error while saving payment: {str(db_error)}", exc_info=True)
            return {"success": False, "error": f"Database error: {str(db_error)}"}

        # =========================
        # ✅ Step 6: Update Order
        # =========================
        logger.info(f"[Order-{request_id}] 📝 Updating order {order.order_number}")
        
        try:
            old_payment_status = order.payment_status
            order.payment_method = payment_method
            order.payment_status = 5  # Paid
            order.save()
            
            logger.info(f"[Order-{request_id}] ✅ Order updated | Payment status changed from {old_payment_status} to 5 | Payment method: {payment_method}")
        except Exception as order_error:
            logger.error(f"[Order-{request_id}] ❌ Error updating order: {str(order_error)}", exc_info=True)
            # Note: Payment is already saved, but order update failed
            # This should be investigated as it indicates inconsistency
            return {"success": False, "error": f"Order update failed: {str(order_error)}"}

        # =========================
        # ✅ Final Response
        # =========================
        success_response = {
            "success": True,
            "message": "Payment verified successfully",
            "data": {
                "order_id": order.id,
                "order_number": order.order_number,
                "txnid": txn_id,
                "payment_id": mihpayid,
                "amount": payment_amount,
                "method": payment_mode,
                "status": "captured"
            }
        }
        
        logger.info(f"[Order-{request_id}] 🎉 Payment verification completed successfully | Order: {order.order_number} | Amount: {payment_amount}")
        
        return success_response

    except Exception as e:
        logger.exception(f"[Order-{request_id}] ❌ Unexpected error in payment verification: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def order_create(data):
    """
    Create Order with proper logging and calculations
    """

    try:
        logger.info("Order creation started for user_id=%s", data.get("user_id"))

        with transaction.atomic():

            # ✅ Calculate totals
            subtotal = Decimal(str(data.get('subtotal', 0)))
            tax = subtotal * Decimal('0.00')  # modify if tax logic needed
            delivery_fee = Decimal(str(data.get('delivery_fee', 0)))
            total = Decimal(str(data.get('total_amount', subtotal + delivery_fee + tax)))

            logger.info(
                "Order totals calculated | subtotal=%s | tax=%s | delivery_fee=%s | total=%s",
                subtotal, tax, delivery_fee, total
            )

            # ✅ Time calculations
            current_time = datetime.now()
            future_time = current_time + timedelta(minutes=45)

            # ✅ Create Order
            order = Order.objects.create(
                coupon_id=data.get('coupon_id'),
                coupon_discount=data.get('discount_amount', 0),
                user_id=data.get('user_id'),
                restaurant_id=data.get('restaurant_id'),
                order_number=generate_order_number(),
                status=1,  # Pending
                payment_status=data.get('payment_status'),
                payment_method=data.get('payment_method'),
                payment_type=data.get('payment_type'),
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                tax=tax,
                delivery_date=future_time,
                quantity= data.get('quantity'),
                total_amount=total,
                delivery_address_id=data.get('delivery_address_id'),
                special_instructions=data.get('special_instructions'),
                is_takeaway=data.get('is_takeaway', False),
                preparation_time=20
            )

            logger.info(
                "Order created successfully | OrderID=%s | OrderNo=%s | UserID=%s",
                order.id, order.order_number, data.get("user_id")
            )

            # ✅ Create Order Status Log
            OrderStatusLog.objects.create(
                order=order,
                status=1,
                notes="Order Created successfully"
            )

            logger.info(
                "OrderStatusLog created | OrderNo=%s | Status=Placed",
                order.order_number
            )

            return {
                "success": True,
                "order_id": order.id,
                "order_number": order.order_number
            }

    except Exception as e:
        logger.exception(
            "Order creation failed for user_id=%s | error=%s",
            data.get("user_id"), str(e)
        )
        return {"success": False, "error": "Failed to create order"}
    

def generate_order_number():
    from django.utils.timezone import now, timedelta
    """Generate unique order number"""
    today_str = now().strftime('%Y%m%d')
    last_order = Order.objects.filter(
        order_number__startswith=f'ORD{today_str}-'
    ).order_by('-order_number').first()

    if last_order:
        last_seq = int(last_order.order_number.split('-')[-1])
        new_seq = last_seq + 1
    else:
        new_seq = 1

    order_no = f'ORD{today_str}-{new_seq:04d}'
    logger.info("Generated order number: %s", order_no)
    return order_no