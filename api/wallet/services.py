from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
import logging

from api.models import Wallet, WalletTransaction

logger = logging.getLogger(__name__)


def credit_wallet(wallet, amount, razorpay_payment_id=None, razorpay_order_id=None, 
                  source=None, order=None, note="", transaction_id=None, raw_response=None):
    """
    Credit wallet with given amount
    """
    amount = Decimal(str(amount))
    
    with transaction.atomic():
        before = wallet.balance
        after = before + amount
        
        wallet_transaction = WalletTransaction.objects.create(
            wallet=wallet,
            txn_type="credit",
            amount=amount,
            balance_before=before,
            balance_after=after,
            txn_source=source or "add_money",
            order=order,
            status="success",
            note=note,
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            transaction_id=transaction_id,
            raw_response=raw_response
        )
        
        wallet.balance = after
        wallet.save(update_fields=["balance", "updated_at"])
        
        logger.info(f"Wallet credited: {wallet.user.email} - Amount: {amount}, Balance: {after}")
        
        return wallet_transaction


def debit_wallet(wallet, amount, source="order_payment", order=None, note="", transaction_id=None):
    """
    Debit wallet with given amount
    """
    amount = Decimal(str(amount))
    
    if wallet.balance < amount:
        raise ValueError(f"Insufficient balance. Available: {wallet.balance}, Required: {amount}")
    
    with transaction.atomic():
        before = wallet.balance
        after = before - amount
        
        wallet_transaction = WalletTransaction.objects.create(
            wallet=wallet,
            txn_type="debit",
            amount=amount,
            balance_before=before,
            balance_after=after,
            txn_source=source,
            order=order,
            status="success",
            note=note,
            transaction_id=transaction_id
        )
        
        wallet.balance = after
        wallet.save(update_fields=["balance", "updated_at"])
        
        logger.info(f"Wallet debited: {wallet.user.email} - Amount: {amount}, Balance: {after}")
        
        return wallet_transaction


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
    Create or update a wallet top-up transaction.
    If status='success', the wallet balance is credited.
    If status='pending', only the transaction is created/updated.
    If status='failed', create/update a failed transaction record.
    
    Uses update_or_create based on transaction_id (txnid) to prevent duplicates.
    """
    
    amount = Decimal(str(amount))
    
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    
    # Get or create wallet
    wallet, created = Wallet.objects.get_or_create(
        user=user,
        defaults={
            'balance': Decimal('0.00'),
            'is_active': True
        }
    )
    
    # Get current balance
    balance_before = wallet.balance
    
    # Calculate balance after based on status
    if status == "success":
        balance_after = balance_before + amount
    elif status == "failed":
        balance_after = balance_before
    else:  # pending
        balance_after = balance_before
    
    # Use update_or_create based on transaction_id (txnid)
    wallet_transaction, created = WalletTransaction.objects.update_or_create(
        transaction_id=txnid,  # This is the unique identifier from PayU
        defaults={
            'wallet': wallet,
            'txn_type': "credit",
            'amount': amount,
            'balance_before': balance_before,
            'balance_after': balance_after,
            'txn_source': source,
            'order': order,
            'status': status,
            'note': note,
            'raw_response': response_json,
            'created_at': timezone.now()  # Update timestamp on update
        }
    )
    
    # If status is success, update wallet balance
    if status == "success":
        wallet.balance = balance_after
        wallet.save(update_fields=["balance", "updated_at"])
        logger.info(f"Wallet credited: {user.email} - Amount: {amount}, Balance: {balance_after}, TXN: {txnid}")
    elif status == "failed":
        logger.info(f"Wallet transaction failed: {user.email} - Amount: {amount}, TXN: {txnid}")
    else:
        logger.info(f"Wallet transaction pending: {user.email} - Amount: {amount}, TXN: {txnid}")
    
    logger.info(f"Wallet transaction {'created' if created else 'updated'} for {user.email} - Amount: {amount}, Status: {status}, ID: {txnid}")
    
    return wallet_transaction

def update_wallet_transaction_status(txnid, new_status, response_json=None):
    """
    Update the status of an existing wallet transaction.
    If updating to 'success', also update wallet balance.
    """
    try:
        with transaction.atomic():
            wallet_transaction = WalletTransaction.objects.get(transaction_id=txnid)
            
            # If already in success or failed state, don't update
            if wallet_transaction.status in ['success', 'failed']:
                logger.warning(f"Transaction {txnid} already in final state: {wallet_transaction.status}")
                return wallet_transaction
            
            # Update status
            wallet_transaction.status = new_status
            if response_json:
                wallet_transaction.raw_response = response_json
            
            # If updating to success, credit the wallet
            if new_status == "success" and wallet_transaction.txn_type == "credit":
                wallet = wallet_transaction.wallet
                # Calculate new balance
                balance_before = wallet.balance
                balance_after = balance_before + wallet_transaction.amount
                
                # Update transaction records
                wallet_transaction.balance_before = balance_before
                wallet_transaction.balance_after = balance_after
                
                # Update wallet balance
                wallet.balance = balance_after
                wallet.save(update_fields=["balance", "updated_at"])
                
                logger.info(f"Transaction {txnid} updated to success. Wallet credited: {wallet.user.email}")
            
            wallet_transaction.save()
            
            return wallet_transaction
            
    except WalletTransaction.DoesNotExist:
        logger.error(f"Transaction not found with ID: {txnid}")
        return None
    except Exception as e:
        logger.error(f"Error updating transaction {txnid}: {e}")
        raise

@transaction.atomic
def process_wallet_transaction(
    user,
    amount,
    txn_type="credit",
    source="add_money",
    order=None,
    note="",
    txnid=None,
    response_json=None,
    status="success"
):
    """
    Generic function to process any wallet transaction with update_or_create.
    Supports both credit and debit operations.
    """
    
    amount = Decimal(str(amount))
    
    if amount <= 0:
        raise ValueError("Amount must be greater than zero.")
    
    # Get or create wallet
    wallet, created = Wallet.objects.get_or_create(
        user=user,
        defaults={
            'balance': Decimal('0.00'),
            'is_active': True
        }
    )
    
    # Get current balance
    balance_before = wallet.balance
    
    # Calculate balance after based on transaction type and status
    if status == "success":
        if txn_type == "credit":
            balance_after = balance_before + amount
        elif txn_type == "debit":
            if balance_before < amount:
                raise ValueError(f"Insufficient balance. Available: {balance_before}, Required: {amount}")
            balance_after = balance_before - amount
        else:
            raise ValueError(f"Invalid transaction type: {txn_type}")
    else:
        balance_after = balance_before
    
    # Use update_or_create based on transaction_id (txnid)
    wallet_transaction, created = WalletTransaction.objects.update_or_create(
        transaction_id=txnid,
        defaults={
            'wallet': wallet,
            'txn_type': txn_type,
            'amount': amount,
            'balance_before': balance_before,
            'balance_after': balance_after,
            'txn_source': source,
            'order': order,
            'status': status,
            'note': note,
            'raw_response': response_json,
            'created_at': timezone.now()
        }
    )
    
    # If status is success, update wallet balance
    if status == "success":
        wallet.balance = balance_after
        wallet.save(update_fields=["balance", "updated_at"])
        logger.info(f"Wallet {txn_type} successful: {user.email} - Amount: {amount}, Balance: {balance_after}, TXN: {txnid}")
    else:
        logger.info(f"Wallet {txn_type} {status}: {user.email} - Amount: {amount}, TXN: {txnid}")
    
    return wallet_transaction

def get_wallet_transaction(txnid):
    """Get a wallet transaction by transaction_id"""
    try:
        return WalletTransaction.objects.get(transaction_id=txnid)
    except WalletTransaction.DoesNotExist:
        return None


def get_or_create_wallet_transaction(txnid, defaults=None):
    """
    Get or create a wallet transaction by transaction_id.
    Useful for checking if a transaction already exists before processing.
    """
    if defaults is None:
        defaults = {}
    
    transaction_obj, created = WalletTransaction.objects.get_or_create(
        transaction_id=txnid,
        defaults=defaults
    )
    
    return transaction_obj, created


def get_wallet_balance(user):
    """Get current wallet balance for a user"""
    try:
        wallet = Wallet.objects.get(user=user)
        return wallet.balance
    except Wallet.DoesNotExist:
        return Decimal('0.00')


def get_wallet_transactions(user, limit=10, status=None):
    """Get recent wallet transactions for a user, optionally filtered by status"""
    try:
        wallet = Wallet.objects.get(user=user)
        queryset = wallet.transactions.all()
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by('-created_at')[:limit]
    except Wallet.DoesNotExist:
        return []


def get_total_wallet_balance():
    """Get total balance across all wallets"""
    total = Wallet.objects.aggregate(total=models.Sum('balance'))['total']
    return total or Decimal('0.00')


def get_transaction_summary(user):
    """Get summary of wallet transactions for a user"""
    try:
        wallet = Wallet.objects.get(user=user)
        transactions = wallet.transactions.all()
        
        total_credit = transactions.filter(txn_type='credit', status='success').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_debit = transactions.filter(txn_type='debit', status='success').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        pending_transactions = transactions.filter(status='pending').count()
        failed_transactions = transactions.filter(status='failed').count()
        
        return {
            'balance': wallet.balance,
            'total_credit': total_credit,
            'total_debit': total_debit,
            'pending_count': pending_transactions,
            'failed_count': failed_transactions,
            'transaction_count': transactions.count()
        }
    except Wallet.DoesNotExist:
        return {
            'balance': Decimal('0.00'),
            'total_credit': Decimal('0.00'),
            'total_debit': Decimal('0.00'),
            'pending_count': 0,
            'failed_count': 0,
            'transaction_count': 0
        }


def delete_wallet_transaction(txnid):
    """
    Delete a wallet transaction by transaction_id.
    Use with caution - only for cleanup or rollback scenarios.
    """
    try:
        transaction_obj = WalletTransaction.objects.get(transaction_id=txnid)
        # If transaction was successful, reverse the balance
        if transaction_obj.status == 'success' and transaction_obj.txn_type == 'credit':
            wallet = transaction_obj.wallet
            wallet.balance -= transaction_obj.amount
            wallet.save(update_fields=["balance", "updated_at"])
        
        transaction_obj.delete()
        logger.info(f"Deleted transaction {txnid}")
        return True
    except WalletTransaction.DoesNotExist:
        logger.warning(f"Transaction {txnid} not found for deletion")
        return False
    except Exception as e:
        logger.error(f"Error deleting transaction {txnid}: {e}")
        return False