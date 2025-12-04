from decimal import Decimal
from api.models import WalletTransaction

def credit_wallet(wallet, amount, razorpay_payment_id=None, razorpay_order_id=None, source= None, order=None, note=""):
    amount = Decimal(str(amount))  # Convert to Decimal
    
    before = wallet.balance
    after = before + amount

    WalletTransaction.objects.create(
        wallet=wallet,
        txn_type="credit",
        amount=amount,
        balance_before=before,
        balance_after=after,
        txn_source=source,
        order=order,
        status="success",
        note=note,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id
    )

    wallet.balance = after
    wallet.save()
    return wallet


def debit_wallet(wallet, amount, source="order_payment", order=None, note=""):
    amount = Decimal(str(amount))  # Convert to Decimal

    if wallet.balance < amount:
        raise ValueError("Insufficient balance")

    before = wallet.balance
    after = before - amount

    WalletTransaction.objects.create(
        wallet=wallet,
        txn_type="debit",
        amount=amount,
        balance_before=before,
        balance_after=after,
        txn_source=source,
        order=order,
        status="success",
        note=note
    )

    wallet.balance = after
    wallet.save()
    return wallet
