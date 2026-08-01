from datetime import datetime, timedelta
from decimal import Decimal
import hashlib
import logging
from anyio import current_time
from django.utils import timezone
from django.utils.timezone import now
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from api.emailer.email_notifications import send_order_status_email
from api.models import Cart, Coupon, Device, Order, OrderStatusLog, Payment, UserPaymentMethod
from api.notifications.notification_payload import track_order_function
from api.notifications.notification_send import send_order_received_notification, send_push_notification

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

# @transaction.atomic
# def verify_payment_update(response_data, payment_method, order_id, payment_status, txnid):
#     """
#     PayU Payment Verification Service - Updates payment and order records
    
#     Args:
#         response_data (dict): PayU verification response
#         payment_method (str): Payment method used (e.g., 'UPI', 'CARD')
#         order_id (int): Order ID to update
    
#     Returns:
#         dict: Result with success status and details
#     """
    
#     logger.info(f"[Order-{order_id}] 🔍 Starting payment verification update process")
#     logger.debug(f"[Order-{order_id}] Payment method: {payment_method}")
    
#     try:
#         # =========================
#         # ✅ Step 1: Fetch Order
#         # =========================
#         logger.debug(f"[Order-{order_id}] Fetching order with ID: {order_id}")
        
#         try:
#             order = Order.objects.select_for_update().get(id=order_id)
#             logger.info(f"[Order-{order_id}] ✅ Order found | Order number: {order.order_number} | Current status: {order.payment_status}")
#         except ObjectDoesNotExist:
#             logger.error(f"[Order-{order_id}] ❌ Order not found with ID: {order_id}")
#             return {"success": False, "error": "Order not found"}

#         # =========================
#         # ✅ Step 2: Extract Transaction
#         # =========================
#         logger.debug(f"[Order-{order_id}] Extracting transaction details from PayU response")
#         transaction_details = response_data.get("transaction_details", {})

#         if not transaction_details:
#             logger.error(f"[Order-{order_id}] ❌ No transaction data found in PayU response")
#             logger.debug(f"[Order-{order_id}] Response data keys: {list(response_data.keys())}")
#             return {"success": False, "error": "No transaction data found"}

#         # Get first transaction (dynamic key)
#         txn_key = txnid
#         txn = transaction_details[txn_key]
        
#         logger.info(f"[Order-{order_id}] 📊 Transaction details extracted | Transaction key: {txn_key}")
#         logger.debug(f"[Order-{order_id}] Transaction status: {txn.get('status')} | Unmapped status: {txn.get('unmappedstatus')}")

#         # =========================
#         # ✅ Step 3: Validate Payment Status
#         # =========================
#         payu_status = txn.get("status")
#         unmapped_status = txn.get("unmappedstatus")
        
#         if payu_status != "success" or unmapped_status != "captured":
#             logger.warning(f"[Order-{order_id}] ⚠️ Payment not successful | status={payu_status} | unmappedstatus={unmapped_status}")
#             return {
#                 "success": False,
#                 "error": "Payment not successful",
#                 "status": payu_status,
#                 "unmapped_status": unmapped_status
#             }
        
#         logger.info(f"[Order-{order_id}] ✅ Payment status validated successfully")

#         # =========================
#         # ✅ Step 4: Extract Fields
#         # =========================
#         txn_id = txn.get("txnid")
#         mihpayid = txn.get("mihpayid")
#         bank_ref = txn.get("bank_ref_num")
        
#         logger.info(f"[Order-{order_id}] 💰 Transaction ID: {txn_id} | PayU ID: {mihpayid}")

#         try:
#             payment_amount = float(txn.get("transaction_amount", 0))
#             logger.debug(f"[Order-{order_id}] Payment amount: {payment_amount}")
#         except (TypeError, ValueError) as e:
#             logger.error(f"[Order-{order_id}] ❌ Invalid payment amount format: {txn.get('transaction_amount')}")
#             payment_amount = 0.0
            
#         payment_mode = txn.get("mode", "UNKNOWN")  # UPI / CARD etc

#         try:
#             gateway_fee = float(txn.get("additional_charges", 0))
#             net_amount = float(txn.get("net_amount_debit", 0))
#             logger.debug(f"[Order-{order_id}] Gateway fee: {gateway_fee} | Net amount: {net_amount}")
#         except (TypeError, ValueError) as e:
#             logger.warning(f"[Order-{order_id}] ⚠️ Invalid fee/amount format: {str(e)}")
#             gateway_fee = 0.0
#             net_amount = payment_amount

#         app_name = txn.get("App_Name", "")
#         bankcode = txn.get("bankcode", "")
        
#         logger.debug(f"[Order-{order_id}] Payment mode: {payment_mode} | App: {app_name} | Bank code: {bankcode}")

#         # =========================
#         # ✅ Step 5: Idempotent Payment Save
#         # =========================
#         logger.info(f"[Order-{order_id}] 💾 Saving/updating payment record for txn_id: {txn_id}")
        
#         try:
#             payment_obj, created = Payment.objects.update_or_create(
#                 razorpay_payment_id=txn_id,  # 🔥 Important for idempotency
#                 defaults={
#                     "order": order,
#                     "payment_gateway": 2,  # PayU
#                     "payment_method": payment_method,
#                     "payment_type": 2,  # online
#                     "status": payment_status,  # captured
#                     "amount": payment_amount,
#                     "currency": "INR",
#                     "gateway_fee": gateway_fee,
#                     "gateway_fee": gateway_fee,
#                     "raw_response": response_data,
#                     "razorpay_payment_id": txn_id,
#                     "captured_at": now(),
#                     "notes": (
#                         f"App: {app_name} | "
#                         f"Mode: {payment_mode} | "
#                         f"Bank: {bankcode}"
#                     ),
#                     "raw_response": txn
#                 }
#             )
            
#             if created:
#                 logger.info(f"[Order-{order_id}] ✅ New payment record created | Payment ID: {payment_obj.id}")
#             else:
#                 logger.info(f"[Order-{order_id}] 🔄 Existing payment record updated | Payment ID: {payment_obj.id}")
                
#         except Exception as db_error:
#             logger.error(f"[Order-{order_id}] ❌ Database error while saving payment: {str(db_error)}", exc_info=True)
#             return {"success": False, "error": f"Database error: {str(db_error)}"}

#         # =========================
#         # ✅ Step 6: Update Order
#         # =========================
#         logger.info(f"[Order-{order_id}] 📝 Updating order {order.order_number}")
        
#         try:
#             old_payment_status = order.payment_status
#             order.payment_method = payment_method
#             order.payment_status = 5  # Paid
#             order.save()
            
#             logger.info(f"[Order-{order_id}] ✅ Order updated | Payment status changed from {old_payment_status} to 5 | Payment method: {payment_method}")
#         except Exception as order_error:
#             logger.error(f"[Order-{order_id}] ❌ Error updating order: {str(order_error)}", exc_info=True)
#             # Note: Payment is already saved, but order update failed
#             # This should be investigated as it indicates inconsistency
#             return {"success": False, "error": f"Order update failed: {str(order_error)}"}

#         # =========================
#         # ✅ Final Response
#         # =========================
#         success_response = {
#             "success": True,
#             "message": "Payment verified successfully",
#             "data": {
#                 "order_id": order.id,
#                 "order_number": order.order_number,
#                 "txnid": txn_id,
#                 "payment_id": mihpayid,
#                 "amount": payment_amount,
#                 "method": payment_mode,
#                 "status": "captured"
#             }
#         }
        
#         logger.info(f"[Order-{order_id}] 🎉 Payment verification completed successfully | Order: {order.order_number} | Amount: {payment_amount}")
        
#         return success_response

#     except Exception as e:
#         logger.exception(f"[Order-{order_id}] ❌ Unexpected error in payment verification: {str(e)}")
#         return {
#             "success": False,
#             "error": str(e)
#         }

def order_create(data):
    """
    Create Order with proper logging and calculations
    """

    try:
        logger.info("Order creation started for user_id=%s", data.get("user_id"))

        with transaction.atomic():

            coupon_id = None
            discount_amount = Decimal('0.00')
            if data.get('code'):
                try:
                    coupon = Coupon.objects.get(code=data['code'])
                    coupon_id = coupon.id
                    discount_amount = data.get('discount_amount', Decimal('0.00'))
                    logger.info(f"Coupon applied: {coupon.code} (id={coupon.id})")
                except Coupon.DoesNotExist:
                    logger.warning(f"Invalid coupon: {data['code']}")

            # ✅ Calculate totals
            subtotal = Decimal(str(data.get('subtotal', 0)))
            tax = subtotal * Decimal('0.00')  # modify if tax logic needed
            delivery_fee = Decimal(str(data.get('delivery_fee', 0)))
            total = Decimal(str(data.get('total_amount', subtotal + delivery_fee + tax - discount_amount)))

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
                status=9,
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

def upsert_user_payment_method(
    *,
    user_id,
    payment_type,
    provider=None,
    payment_identifier=None,
    payment_data=None,
    is_default=False,
):
    try:
        with transaction.atomic():

            logger.info(
                "Upserting payment method | user=%s | type=%s | provider=%s",
                user_id,
                payment_type,
                provider
            )

            # 🔹 Base queryset
            qs = UserPaymentMethod.objects.filter(
                user_id=user_id,
                payment_type=payment_type,
                provider=provider,
            )

            # 🔹 Identifier check (JSON search)
            if payment_identifier:
                qs = qs.filter(
                    payment_data__identifier=payment_identifier
                )

            existing_obj = qs.first()

            # 🔹 Handle default logic
            if is_default:
                UserPaymentMethod.objects.filter(
                    user_id=user_id,
                    is_default=True
                ).update(is_default=False)

            update_data = {
                "payment_data": payment_data or {},
                "is_active": True,
                "updated_at": timezone.now(),
            }

            if is_default:
                update_data["is_default"] = True

            # 🔹 UPDATE if exists
            if existing_obj:
                for key, value in update_data.items():
                    setattr(existing_obj, key, value)
                existing_obj.save()

                logger.info("Payment method updated | ID=%s", existing_obj.id)
                return existing_obj

            # 🔹 CREATE if not exists
            obj = UserPaymentMethod.objects.create(
                user_id=user_id,
                payment_type=payment_type,
                provider=provider,
                payment_data=payment_data or {},
                is_active=True,
                is_default=is_default,
            )

            logger.info("Payment method created | ID=%s", obj.id)
            return obj

    except Exception as e:
        logger.exception("Error in upsert_user_payment_method")
        raise e

def get_order_id_by_razorpay_payment_id(razorpay_payment_id):
    """
    Returns the order_id associated with the given Razorpay payment ID.
    """
    try:
        payment = Payment.objects.get(
            razorpay_payment_id=razorpay_payment_id
        )
        return payment.order_id  # If order is a ForeignKey, this returns its ID.
    except Payment.DoesNotExist:
        return None


def send_payment_notifications(order):
    """
    Send payment success notifications to restaurant and customer
    
    Args:
        order: Order object
        
    Returns:
        dict: Status of notifications sent
    """
    logger.info(f"[Order-{order.id}] 📨 Starting payment notifications")
    
    notification_status = {
        'restaurant_sent': False,
        'customer_sent': False,
        'email_sent': False,
        'track_order_success': False
    }
    
    try:
        # Send email notification
        try:
            send_order_status_email(order)
            notification_status['email_sent'] = True
            logger.info(f"[Order-{order.id}] ✅ Email notification sent")
        except Exception as e:
            logger.warning(f"[Order-{order.id}] Email sending failed: {e}")
        
        # Prepare push notification payload
        payload = {
            "user_id": order.user_id,
            "order_number": order.order_number
        }
        
        title = "Order Update"
        customer_body = "Your order has been placed successfully"
        order_no_for_push = order.order_number
        
        # Get track order details
        try:
            response_body = track_order_function(payload, None)
            if response_body.get('status') == "success":
                customer_body = response_body.get('body', customer_body)
                title = response_body.get('title', title)
                order_no_for_push = response_body.get('order_number', order_no_for_push)
                notification_status['track_order_success'] = True
        except Exception as e:
            logger.warning(f"[Order-{order.id}] Track order failed: {e}")
        
        # Get restaurant and customer devices
        restaurant_token = (
            Device.objects
            .filter(user_id=order.restaurant.user_id)
            .order_by('-id')
            .values_list('token', flat=True)
            .first()
        )
        
        customer_token = (
            Device.objects
            .filter(user_id=order.user_id)
            .order_by('-id')
            .values_list('token', flat=True)
            .first()
        )
        
        logger.debug(f"[Order-{order.id}] Restaurant token present: {bool(restaurant_token)}, Customer token present: {bool(customer_token)}")
        
        # Send restaurant notification
        if restaurant_token:
            try:
                send_order_received_notification(restaurant_token, order)
                notification_status['restaurant_sent'] = True
                logger.info(f"[Order-{order.id}] ✅ Restaurant notification sent")
            except Exception as e:
                logger.warning(f"[Order-{order.id}] Restaurant notification failed: {e}")
        else:
            logger.warning(f"[Order-{order.id}] No restaurant token found")
        
        # Send customer notification
        if customer_token:
            try:
                send_push_notification(
                    tokens=[customer_token],
                    title=title,
                    body=customer_body,
                    order_number=order_no_for_push,
                    data=None
                )
                notification_status['customer_sent'] = True
                logger.info(f"[Order-{order.id}] ✅ Customer notification sent")
            except Exception as e:
                logger.warning(f"[Order-{order.id}] Customer notification failed: {e}")
        else:
            logger.warning(f"[Order-{order.id}] No customer token found")
        
        # Mark notifications as sent if at least one succeeded
        if any([notification_status['restaurant_sent'], 
                notification_status['customer_sent'], 
                notification_status['email_sent']]):
            order.payment_notifications_sent = True
            order.save(update_fields=['payment_notifications_sent'])
            logger.info(f"[Order-{order.id}] 📝 Marked payment notifications as sent")
        
        return notification_status
        
    except Exception as e:
        logger.exception(f"[Order-{order.id}] ❌ Unexpected error in notification: {str(e)}")
        return notification_status


@transaction.atomic
def verify_payment_update(response_data, payment_method, order_id, payment_status, txnid, payment_step_type, payment_type, function_type=None):
    """
    PayU Payment Verification Service - Updates payment and order records
    
    Args:
        response_data: PayU response data
        payment_method: Payment method (e.g., 'UPI', 'Net Banking')
        order_id: Order ID
        payment_status: Expected payment status
        txnid: PayU transaction ID
    """
    logger.info(f"[Order-{order_id}] 🔍 Starting payment verification update process function_type: {function_type}")
    
    try:
        # Step 1: Get and lock order
        order = get_order_or_fail(order_id)
        if not order:
            return {"success": False, "error": "Order not found"}
        
        # Step 2: Parse response based on format
        payment_info = parse_payment_response(response_data, txnid, payment_method, function_type)
        if not payment_info.get('success'):
            return payment_info
        
        # Step 3: Validate payment status
        validation_result = validate_payment_status(
            payment_info, payment_step_type, payment_status
        )
        if not validation_result.get('success'):
            return validation_result
                
        # Step 4: Map statuses to model choices
        status_mapping = map_payment_statuses(
            payment_info['payu_status'], 
            payment_info['unmapped_status'], 
            payment_step_type
        )
        
        
        # Step 5: Create/Update payment record
        payment = update_payment_record(
            order, payment_info, status_mapping, response_data, payment_step_type, payment_method, payment_type
        )
        if not payment:
            return {"success": False, "error": "Failed to save payment"}
        
        # Step 6: Update order with mapped statuses
        update_order_status(order, status_mapping, payment_step_type, payment_method, payment_type)
        
        # Step 7: Update cart items ONLY if payment is successful validation
        is_payment_successful = (
            payment_step_type.lower() == 'validate' and 
            status_mapping['payment_status_code'] == 5  # Captured
        )
        
        if is_payment_successful:
            update_cart_items(order)
            logger.info(f"[Order-{order.id}] ✅ Cart items updated after successful payment validation")
        else:
            logger.info(f"[Order-{order.id}] ⏳ Skipping cart update - Payment type: {payment_step_type}, Status: {status_mapping['payment_status_code']}")

        # Step 8: Send Notification to Users (with idempotency check)
        if is_payment_successful:
            # Check if notifications were already sent for this order
            if order.payment_notifications_sent:
                logger.info(f"[Order-{order.id}] ⏭️ Payment notifications already sent, skipping duplicate")
                return build_success_response(
                    order, payment_info, status_mapping, payment, payment_step_type
                )
            
            # Send notifications using the reusable function
            notification_status = send_payment_notifications(order)
            
            # Log notification results
            if notification_status['restaurant_sent'] or notification_status['customer_sent'] or notification_status['email_sent']:
                logger.info(f"[Order-{order.id}] ✅ Notifications sent successfully - Restaurant: {notification_status['restaurant_sent']}, Customer: {notification_status['customer_sent']}, Email: {notification_status['email_sent']}")
            else:
                logger.warning(f"[Order-{order.id}] ⚠️ No notifications were sent successfully")
        
        # Step 9: Return success response
        return build_success_response(
            order, payment_info, status_mapping, payment, payment_step_type
        )
    
        
    except Exception as e:
        logger.exception(f"[Order-{order_id}] ❌ Unexpected error: {str(e)}")
        return {"success": False, "error": str(e)}

# def get_order_or_fail(order_id):
#     """Fetch and lock order for update"""
#     try:
#         order = Order.objects.select_for_update().get(id=order_id)
#         logger.info(f"[Order-{order_id}] ✅ Order found | Status: {order.get_payment_status_display()}")
#         return order
#     except ObjectDoesNotExist:
#         logger.error(f"[Order-{order_id}] ❌ Order not found")
#         return None

def get_order_or_fail(order_id):
    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            logger.info(
                f"[Order-{order_id}] ✅ Order found | Status: {order.get_payment_status_display()}"
            )
            return order
    except ObjectDoesNotExist:
        logger.error(f"[Order-{order_id}] ❌ Order not found")
        return None


# def parse_payment_response(response_data, txnid, payment_method, function_type):
#     """
#     Parse PayU response and extract payment information
    
#     Handles both:
#     - Verification response format (transaction_details)
#     - Initiation response format (metaData)
#     """

#     print("response_data====",response_data)
#     if function_type == "event":
#         print("=====")
#     else:
#         # Check for verification response format (from PayU verification API)
#         transaction_details = response_data.get("transaction_details", {})
#         if transaction_details:
#             txn = transaction_details.get(txnid)
#             if not txn:
#                 logger.error(f"Transaction not found for txnid: {txnid}")
#                 return {"success": False, "error": f"Transaction not found: {txnid}"}
            
#             return {
#                 "success": True,
#                 "payu_status": txn.get("status", ""),
#                 "unmapped_status": txn.get("unmappedstatus", ""),
#                 "txn_id": txn.get("txnid", ""),
#                 "mihpayid": txn.get("mihpayid", ""),
#                 "bank_ref": txn.get("bank_ref_num", ""),
#                 "amount": float(txn.get("transaction_amount", 0)),
#                 "payment_mode": txn.get("mode", "UNKNOWN"),
#                 "gateway_fee": float(txn.get("additional_charges", 0)),
#                 "net_amount": float(txn.get("net_amount_debit", 0)),
#                 "app_name": txn.get("App_Name", ""),
#                 "bankcode": txn.get("bankcode", ""),
#                 "is_initiation": False
#             }
        
#         # Check for initiation response format (from PayU create payment API)
#         meta_data = response_data.get("metaData", {})
#         if meta_data:
#             return {
#                 "success": True,
#                 "payu_status": meta_data.get("txnStatus", "pending"),
#                 "unmapped_status": meta_data.get("unmappedStatus", "pending"),
#                 "txn_id": meta_data.get("txnId", txnid),
#                 "mihpayid": meta_data.get("referenceId", ""),
#                 "amount": 0,
#                 "payment_mode": payment_method,
#                 "gateway_fee": 0,
#                 "net_amount": 0,
#                 "app_name": "",
#                 "bankcode": "",
#                 "is_initiation": True
#             }
    
#     return {"success": False, "error": "Unknown response format"}

def parse_payment_response(response_data, txnid, payment_method, function_type):
    """
    Parse PayU response and extract payment information.

    Handles:
    - event              -> PayU callback/webhook
    - verification API   -> transaction_details
    - initiation API     -> metaData
    """

    logger.debug("function_type=%s", function_type)

    # ------------------------------------------------------------------
    # PayU Success/Failure Callback (event)
    # ------------------------------------------------------------------
    if function_type == "event":
        return {
            "success": True,
            "payu_status": response_data.get("status", ""),
            "unmapped_status": response_data.get("unmappedstatus", ""),
            "txn_id": response_data.get("txnid", txnid),
            "mihpayid": response_data.get("mihpayid", ""),
            "bank_ref": response_data.get(
                "bank_ref_num"
            ) or response_data.get("bank_ref_no", ""),
            "amount": float(response_data.get("amount", 0)),
            "payment_mode": response_data.get(
                "mode", payment_method
            ),
            "gateway_fee": float(response_data.get("additional_charges", 0)),
            "net_amount": float(response_data.get("net_amount_debit", 0)),
            "app_name": response_data.get("App_Name", ""),
            "bankcode": response_data.get("bankcode", ""),
            "pg_type": response_data.get("PG_TYPE", ""),
            "payment_source": response_data.get("payment_source", ""),
            "error": response_data.get("error", ""),
            "error_message": response_data.get("error_Message", ""),
            "bank_response": response_data.get("field7", ""),
            "callback_status": response_data.get("field9", ""),
            "upi_vpa": response_data.get("field3", ""),
            "utr": response_data.get("field2", ""),
            "addedon": response_data.get("addedon", ""),
            "is_initiation": False,
            "is_event": True,
        }

    # ------------------------------------------------------------------
    # Verification Response
    # ------------------------------------------------------------------
    transaction_details = response_data.get("transaction_details", {})
    if transaction_details:
        txn = transaction_details.get(txnid)
        if not txn:
            logger.error("Transaction not found for txnid: %s", txnid)
            return {"success": False, "error": f"Transaction not found: {txnid}"}

        return {
            "success": True,
            "payu_status": txn.get("status", ""),
            "unmapped_status": txn.get("unmappedstatus", ""),
            "txn_id": txn.get("txnid", ""),
            "mihpayid": txn.get("mihpayid", ""),
            "bank_ref": txn.get("bank_ref_num", ""),
            "amount": float(txn.get("transaction_amount", 0)),
            "payment_mode": txn.get("mode", "UNKNOWN"),
            "gateway_fee": float(txn.get("additional_charges", 0)),
            "net_amount": float(txn.get("net_amount_debit", 0)),
            "app_name": txn.get("App_Name", ""),
            "bankcode": txn.get("bankcode", ""),
            "is_initiation": False,
            "is_event": False,
        }

    # ------------------------------------------------------------------
    # Payment Initiation Response
    # ------------------------------------------------------------------
    meta_data = response_data.get("metaData", {})
    if meta_data:
        return {
            "success": True,
            "payu_status": meta_data.get("txnStatus", "pending"),
            "unmapped_status": meta_data.get("unmappedStatus", "pending"),
            "txn_id": meta_data.get("txnId", txnid),
            "mihpayid": meta_data.get("referenceId", ""),
            "amount": 0,
            "payment_mode": payment_method,
            "gateway_fee": 0,
            "net_amount": 0,
            "app_name": "",
            "bankcode": "",
            "is_initiation": True,
            "is_event": False,
        }

    return {"success": False, "error": "Unknown response format"}

def validate_payment_status(payment_info, payment_step_type, expected_status):
    """Validate payment status based on payment type"""
    
    payu_status = payment_info['payu_status']
    unmapped_status = payment_info['unmapped_status']
    
    # Initiate: any status is acceptable as it's just the initiation step
    if payment_step_type.lower() == 'initiate':
        if payu_status == "pending":
            logger.info(f"⏳ Payment initiated - waiting for completion")
        else:
            logger.info(f"ℹ️ Initiation response received with status: {payu_status}")
        return {"success": True}
    
    # Validate: should be captured
    if payment_step_type.lower() == 'validate':
        if unmapped_status.lower() != "captured":
            logger.warning(f"⚠️ Payment validation failed | Status: {payu_status}, Unmapped: {unmapped_status}")
            return {
                "success": False,
                "error": f"Payment not successful. Expected: {expected_status}, Got: {payu_status}",
                "status": payu_status,
                "unmapped_status": unmapped_status
            }
        logger.info(f"✅ Payment validation successful | Status: {payu_status}")
        return {"success": True}
    
    return {"success": True}


def map_payment_statuses(payu_status, unmapped_status, payment_step_type):
    """
    Map PayU status to internal status codes for both Payment and Order models
    
    Payment.PAYMENT_STATUS_CHOICES:
        1: 'Created'
        2: 'Attempted'
        3: 'Pending'
        4: 'Authorized'
        5: 'Captured'
        6: 'Failed'
        7: 'Refunded'
        8: 'Partially Refunded'
    
    Order.PAYMENT_STATUS_CHOICES:
        1: 'in progress'
        2: 'Pending'
        3: 'Refunded'
        4: 'Failed'
        5: 'Completed'
    
    Order.ORDER_STATUS_CHOICES:
        1: 'Pending'
        2: 'Confirmed'
        3: 'Preparing'
        4: 'Ready for Delivery/Pickup'
        5: 'On the Way'
        6: 'Delivered'
        7: 'Cancelled'
        8: 'Refunded'
        9: 'In Progress'
    """
    
    # Map PayU statuses to Payment model status codes
    PAYMENT_STATUS_MAP = {
        ("success", "captured"): 5,           # Captured
        ("success", "authorized"): 4,         # Authorized
        ("success", "pending"): 3,            # Pending
        ("success", "refunded"): 7,           # Refunded
        ("success", "partial_refund"): 8,     # Partially Refunded
        ("pending", "pending"): 3,            # Pending
        ("failure", "failed"): 6,             # Failed
        ("failed", "failed"): 6,              # Failed
        ("failure", "cancelled"): 6,          # Failed (treated as failed)
        ("failed", "cancelled"): 6,           # Failed (treated as failed)
        ("success", "initiated"): 3,          # Pending (initiated)
    }
    
    # Get base status
    status_key = (payu_status.lower(), unmapped_status.lower())
    payment_status_code = PAYMENT_STATUS_MAP.get(status_key, 1)  # Default: Created
    
    # Handle special cases
    if payu_status.lower() == "pending":
        if unmapped_status.lower() == "pending":
            payment_status_code = 3  # Pending
        else:
            payment_status_code = 2  # Attempted
    
    if payu_status.lower() in ["failure", "failed"]:
        if unmapped_status.lower() in ["failed", "cancelled"]:
            payment_status_code = 6  # Failed
        else:
            payment_status_code = 2  # Attempted
    
    # Initiate payment should be pending
    if payment_step_type.lower() == 'initiate':
        payment_status_code = 3  # Pending
    
    # Map Payment status to Order payment status
    # Order.PAYMENT_STATUS_CHOICES
    ORDER_PAYMENT_STATUS_MAP = {
        5: 5,  # Captured -> Completed
        4: 2,  # Authorized -> Pending
        3: 2,  # Pending -> Pending
        2: 1,  # Attempted -> In Progress
        6: 4,  # Failed -> Failed
        7: 3,  # Refunded -> Refunded
        8: 3,  # Partially Refunded -> Refunded
        1: 1,  # Created -> In Progress
    }
    
    # Map Payment status to Order status
    # Order.ORDER_STATUS_CHOICES
    ORDER_STATUS_MAP = {
        5: 1,  # Captured -> Confirmed
        4: 1,  # Authorized -> Pending
        3: 1,  # Pending -> Pending
        2: 9,  # Attempted -> In Progress
        6: 7,  # Failed -> Cancelled
        7: 8,  # Refunded -> Refunded
        8: 8,  # Partially Refunded -> Refunded
        1: 9,  # Created -> In Progress
    }
    
    order_payment_status_code = ORDER_PAYMENT_STATUS_MAP.get(payment_status_code, 1)
    order_status_code = ORDER_STATUS_MAP.get(payment_status_code, 1)
    
    # Initiate payment keeps order pending
    if payment_step_type.lower() == 'initiate':
        order_status_code = 1  # Pending
        order_payment_status_code = 2  # Pending
    
    return {
        'payment_status_code': payment_status_code,
        'order_payment_status_code': order_payment_status_code,
        'order_status_code': order_status_code,
        'is_successful': payment_status_code == 5
    }


def get_payment_type_code(payment_step_type):
    """
    Map payment type string to model choices
    
    Order.PAYMENT_TYPE:
        1: 'online'
        2: 'cod'
    
    Payment.payment_type also uses same choices
    """
    PAYMENT_TYPE_MAPPING = {
        'validate': 1,   # Online payment validation/verification
        'initiate': 1,   # Online payment initiation
        'online': 1,     # Online payment
        'cod': 2,        # Cash on Delivery
    }
    return PAYMENT_TYPE_MAPPING.get(payment_step_type.lower(), 1)


def get_payment_method_code(payment_method):
    """
    Map payment method string to model choices
    
    Order.PAYMENT_METHOD_CHOICES:
        1: 'Credit Card'
        2: 'Debit Card'
        3: 'UPI'
        4: 'Net Banking'
        5: 'Cash on Delivery'
        6: 'Eatoor Money'
    """
    PAYMENT_METHOD_MAPPING = {
        'credit_card': 1,
        'debit_card': 2,
        'upi': 3,
        'net_banking': 4,
        'cod': 5,
        'eatoor_money': 6,
        'CC': 1,
        'DC': 2,
        'UPI': 3,
        'NB': 4,
    }
    # Try to map, if not found default to UPI or try to infer
    method_lower = payment_method.lower().replace(' ', '_')
    if method_lower in PAYMENT_METHOD_MAPPING:
        return PAYMENT_METHOD_MAPPING[method_lower]
    
    # Handle common PayU payment modes
    payu_method_mapping = {
        'creditcard': 1,
        'debitcard': 2,
        'upi': 3,
        'netbanking': 4,
        'cod': 5,
        'wallet': 6,
        'card': 1,  # Default to credit card if just 'card'
    }
    if payment_method.lower() in payu_method_mapping:
        return payu_method_mapping[payment_method.lower()]
    
    # Default to UPI if unknown
    logger.warning(f"Unknown payment method: {payment_method}, defaulting to UPI")
    return 3

def update_payment_record(order, payment_info, status_mapping, response_data, payment_step_type, payment_method, payment_type):
    """Create or update payment record with mapped statuses"""
    
    # Prepare transaction data for raw_response
    txn = {
        "status": payment_info['payu_status'],
        "unmappedstatus": payment_info['unmapped_status'],
        "txnid": payment_info['txn_id'],
        "mihpayid": payment_info['mihpayid'],
        "transaction_amount": payment_info['amount'],
        "mode": payment_info['payment_mode'],
        "additional_charges": payment_info['gateway_fee'],
        "net_amount_debit": payment_info['net_amount'],
        "App_Name": payment_info['app_name'],
        "bankcode": payment_info['bankcode']
    }
    
    # Build notes
    notes = (
        f"Payment Type: {payment_step_type} | "
        f"App: {payment_info['app_name']} | "
        f"Mode: {payment_info['payment_mode']} | "
        f"Bank: {payment_info['bankcode']} | "
        f"PayU ID: {payment_info['mihpayid']} | "
        f"PayU Status: {payment_info['payu_status']}/{payment_info['unmapped_status']}"
    )
    
    # Prepare default values for payment record
    defaults = {
        "order": order,
        "payment_gateway": 1,
        "payment_type": payment_type,
        "payment_method": payment_method,
        "status": status_mapping['payment_status_code'],
        "amount": payment_info['amount'],
        "currency": "INR",
        "gateway_fee": payment_info['gateway_fee'] if payment_info['gateway_fee'] > 0 else None,
        "razorpay_payment_id": payment_info['txn_id'],  # Using this field for PayU txn id
        "razorpay_order_id": order.order_number,  # Using order number as reference
        "notes": notes,
        "raw_response": txn if not payment_info['is_initiation'] else response_data,
        "captured_at": now() if status_mapping['payment_status_code'] == 5 else None
    }
    
    try:
        # Try to update existing payment or create new one
        payment, created = Payment.objects.update_or_create(
            razorpay_payment_id=payment_info['txn_id'],
            defaults=defaults
        )
        
        logger.info(
            f"[Order-{order.id}] {'✅ New' if created else '🔄 Existing'} payment record | "
            f"ID: {payment.id} | Payment Type: {payment_step_type} | "
            f"Status: {status_mapping['payment_status_code']} | "
            f"Amount: {payment_info['amount']}"
        )
        return payment
        
    except Exception as e:
        logger.error(f"[Order-{order.id}] ❌ Failed to save payment: {str(e)}")
        return None


def update_order_status(order, status_mapping, payment_step_type, payment_method, payment_type):
    """Update order with mapped statuses"""
    
    old_payment_status = order.payment_status
    old_order_status = order.status
    
    # Update order fields
    order.payment_method = payment_method
    order.payment_type = payment_type
    order.payment_status = status_mapping['order_payment_status_code']
    
    # Set timestamps based on status
    if payment_step_type.lower() == 'validate' and status_mapping['payment_status_code'] == 5:
        order.status = status_mapping['order_status_code']
        order.paid_at = now()
        logger.info(f"[Order-{order.id}] ✅ Order marked as COMPLETED (Payment Captured)")
    elif payment_step_type.lower() == 'initiate':
        logger.info(f"[Order-{order.id}] ⏳ Order marked as PENDING - Payment initiated")
    elif status_mapping['payment_status_code'] == 6:
        order.failed_at = now()
        logger.info(f"[Order-{order.id}] ❌ Order marked as FAILED")
    
    order.save()
    
    # Log status changes
    payment_status_display = dict(Order.PAYMENT_STATUS_CHOICES).get(order.payment_status, 'Unknown')
    order_status_display = dict(Order.ORDER_STATUS_CHOICES).get(order.status, 'Unknown')
    
    logger.info(
        f"[Order-{order.id}] ✅ Order updated | "
        f"Payment Status: {old_payment_status} -> {order.payment_status} ({payment_status_display}) | "
        f"Order Status: {old_order_status} -> {order.status} ({order_status_display}) | "
    )


def update_cart_items(order):
    """
    Update cart items to completed status
    
    This should only be called when payment is successfully validated.
    Cart items with cart_status in [1, 2, 3, 4] are considered active.
    """
    try:
        # Import Cart model (assuming it exists)
        # You may need to adjust the model name and fields
        from api.models import Cart  # Adjust import based on your project structure
        
        updated_count = Cart.objects.filter(
            user_id=order.user_id,
            restaurant_id=order.restaurant_id,
            cart_status__in=[1, 2, 3, 4],  # Active cart statuses
            order_number__isnull=True
        ).update(
            cart_status=5,  # Completed
            order_number=order.order_number
        )
        
        logger.info(f"[Order-{order.id}] ✅ Updated {updated_count} cart items to status=5 (Completed)")
        
        # Optional: Verify all items were updated
        if updated_count == 0:
            logger.warning(f"[Order-{order.id}] ⚠️ No cart items found to update for order {order.order_number}")
            
        return updated_count
        
    except ImportError:
        logger.warning(f"[Order-{order.id}] ⚠️ Cart model not found, skipping cart update")
        return 0
    except Exception as e:
        logger.error(f"[Order-{order.id}] ❌ Error updating cart items: {str(e)}")
        # Don't raise exception - cart update failure shouldn't break the payment flow
        return 0


def build_success_response(order, payment_info, status_mapping, payment, payment_step_type):
    """Build success response with all relevant data"""
    
    # Determine if cart was updated
    cart_updated = (
        payment_step_type.lower() == 'validate' and 
        status_mapping['payment_status_code'] == 5
    )
    
    # Success messages based on payment type
    success_messages = {
        'validate': "Payment verified successfully",
        'initiate': "Payment initiated successfully",
    }
    message = success_messages.get(payment_step_type.lower(), "Payment processed successfully")
    
    # Add cart update info to message
    if cart_updated:
        message += " and cart updated"
    
    return {
        "success": True,
        "message": message,
        "data": {
            "order_id": order.id,
            "order_number": order.order_number,
            "txnid": payment_info['txn_id'],
            "payment_id": payment_info['mihpayid'],
            "amount": float(payment_info['amount']),
            "payment_method": payment.get_payment_method_display,
            "payment_type": payment.get_payment_type_display(),
            "payu_status": payment_info['payu_status'],
            "unmapped_status": payment_info['unmapped_status'],
            "is_initial_response": payment_info['is_initiation'],
            "cart_updated": cart_updated,
            "payment_created": payment.created_at == payment.updated_at if payment else False,
            "payment_id": payment.id if payment else None,
        }
    }


# Helper function to get payment status display (for logging/response)
def get_payment_status_display(status_code):
    """Get human-readable payment status"""
    status_map = {
        1: 'Created',
        2: 'Attempted',
        3: 'Pending',
        4: 'Authorized',
        5: 'Captured',
        6: 'Failed',
        7: 'Refunded',
        8: 'Partially Refunded',
    }
    return status_map.get(status_code, 'Unknown')


# Helper function to get order payment status display
def get_order_payment_status_display(status_code):
    """Get human-readable order payment status"""
    status_map = {
        1: 'In Progress',
        2: 'Pending',
        3: 'Refunded',
        4: 'Failed',
        5: 'Completed',
    }
    return status_map.get(status_code, 'Unknown')