import hashlib
from django.utils.timezone import now
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from api.models import Order, Payment


def create_payment_generate_hash(params, salt):
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
    
    # Generate SHA-512 hash
    return hashlib.sha512(hash_string.encode('utf-8')).hexdigest()


def verify_payment_generate_hash(params, salt):
    # Extract parameters or use empty string if not provided
    key = params['key']
    txnid = params['txnid']
    command = params['command']
    
    hash_string = f"{key}|{command}|{txnid}|{salt}"
    return hashlib.sha512(hash_string.encode('utf-8')).hexdigest()

@transaction.atomic
def verify_payment_update(response_data, payment_method, order_id):
    """
    PayU Payment Verification Service
    """

    try:
        # =========================
        # ✅ Step 1: Fetch Order
        # =========================
        try:
            order = Order.objects.select_for_update().get(id=order_id)
        except ObjectDoesNotExist:
            return {"success": False, "error": "Order not found"}

        # =========================
        # ✅ Step 2: Extract Transaction
        # =========================
        transaction_details = response_data.get("transaction_details", {})

        if not transaction_details:
            return {"success": False, "error": "No transaction data found"}

        # Get first transaction (dynamic key)
        txn_key = list(transaction_details.keys())[0]
        txn = transaction_details[txn_key]

        # =========================
        # ✅ Step 3: Validate Payment Status
        # =========================
        if txn.get("status") != "success" or txn.get("unmappedstatus") != "captured":
            return {
                "success": False,
                "error": "Payment not successful",
                "status": txn.get("status")
            }

        # =========================
        # ✅ Step 4: Extract Fields
        # =========================
        txn_id = txn.get("txnid")
        mihpayid = txn.get("mihpayid")
        bank_ref = txn.get("bank_ref_num")

        payment_amount = float(txn.get("transaction_amount", 0))
        payment_mode = txn.get("mode", "UNKNOWN")  # UPI / CARD etc

        gateway_fee = float(txn.get("additional_charges", 0))
        net_amount = float(txn.get("net_amount_debit", 0))

        app_name = txn.get("App_Name", "")
        bankcode = txn.get("bankcode", "")

        # =========================
        # ✅ Step 5: Idempotent Payment Save
        # =========================
        payment_obj, created = Payment.objects.update_or_create(
            txn_id=txn_id,  # 🔥 Important for idempotency
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

        # =========================
        # ✅ Step 6: Update Order
        # =========================
        order.payment_method = payment_method
        order.payment_status = 5  # Paid
        order.save()

        # =========================
        # ✅ Final Response
        # =========================
        return {
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

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }    