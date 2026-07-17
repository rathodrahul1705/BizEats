from decimal import Decimal
from api.models import Wallet, WalletTransaction
from decimal import Decimal
from django.db import transaction

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

@transaction.atomic
def add_money_success(
    user,
    amount,
    source="add_money",
    order=None,
    note="Wallet top-up initiated",
    status="pending",
    txnid=None,
    response_json=None
):
    """
    Create a wallet top-up transaction.
    If status='success', the wallet balance is credited.
    If status='pending', only the transaction is created.
    """

    amount = Decimal(str(amount))

    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")

    wallet, _ = Wallet.objects.get_or_create(user=user)

    balance_before = wallet.balance

    if status == "success":
        balance_after = balance_before + amount
    else:
        balance_after = balance_before

    wallet_transaction = WalletTransaction.objects.create(
        wallet=wallet,
        txn_type="credit",
        amount=amount,
        balance_before=balance_before,  
        balance_after=balance_after,
        txn_source=source,
        order=order,
        status=status,
        note=note,
        transaction_id=txnid,
        raw_response=response_json

    )

    if status == "success":
        wallet.balance = balance_after
        wallet.save(update_fields=["balance"])

    return wallet_transaction