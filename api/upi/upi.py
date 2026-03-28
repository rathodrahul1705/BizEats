import json
import uuid
import hashlib
import hmac
from datetime import datetime
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# In-memory storage
transactions_store = {}

# Paytm Utility Functions
def generate_checksum(params, merchant_key):
    """Generate checksum for Paytm"""
    sorted_params = sorted(params.items())
    param_string = "|".join(str(value) for key, value in sorted_params)
    checksum = hmac.new(
        merchant_key.encode('utf-8'),
        param_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return checksum

def verify_checksum(params, merchant_key, received_checksum):
    """Verify checksum from Paytm response"""
    sorted_params = sorted(params.items())
    param_string = "|".join(str(value) for key, value in sorted_params)
    calculated_checksum = hmac.new(
        merchant_key.encode('utf-8'),
        param_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return calculated_checksum == received_checksum

def get_paytm_url():
    """Get Paytm URL based on environment"""
    if settings.DEBUG:
        return 'https://securegw-stage.paytm.in/order/process/'
    return 'https://securegw.paytm.in/order/process/'

@csrf_exempt
def create_transaction(request):
    """API endpoint to create a transaction and get Paytm parameters"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        # Parse request data
        data = json.loads(request.body)
        amount = data.get('amount')
        email = data.get('email')
        mobile = data.get('mobile', '')
        
        # Validate inputs
        if not amount or not email:
            return JsonResponse({'error': 'Amount and email are required'}, status=400)
        
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except:
            return JsonResponse({'error': 'Invalid amount'}, status=400)
        
        # Generate unique order ID
        order_id = f"PAYTM{int(datetime.now().timestamp())}{uuid.uuid4().hex[:8].upper()}"
        
        # Store transaction in memory
        transactions_store[order_id] = {
            'order_id': order_id,
            'amount': amount,
            'email': email,
            'mobile': mobile,
            'status': 'pending',
            'paytm_txn_id': None,
            'bank_txn_id': None,
            'response_code': None,
            'response_msg': None,
            'created_at': datetime.now().isoformat(),
            'checksum': None
        }
        
        # Prepare Paytm parameters
        paytm_params = {
            'MID': settings.PAYTM_MERCHANT_ID,
            'ORDER_ID': order_id,
            'CUST_ID': email,
            'TXN_AMOUNT': str(amount),
            'CHANNEL_ID': settings.PAYTM_CHANNEL_ID,
            'WEBSITE': settings.PAYTM_WEBSITE,
            'INDUSTRY_TYPE_ID': settings.PAYTM_INDUSTRY_TYPE_ID,
            'CALLBACK_URL': request.build_absolute_uri('/api/payment/callback/'),
        }
        
        # Generate checksum
        checksum = generate_checksum(paytm_params, settings.PAYTM_SECRET_KEY)
        transactions_store[order_id]['checksum'] = checksum
        
        # Add checksum to parameters
        paytm_params['CHECKSUMHASH'] = checksum
        
        return JsonResponse({
            'success': True,
            'order_id': order_id,
            'amount': str(amount),
            'email': email,
            'paytm_params': paytm_params,
            'paytm_url': get_paytm_url()
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def payment_callback(request):
    """Callback endpoint for Paytm to send payment response - JSON only"""
    if request.method == 'POST':
        # Get response data from Paytm
        response_data = request.POST.dict()
        paytm_checksum = response_data.get('CHECKSUMHASH', '')
        
        # Remove checksum for verification
        paytm_params = {k: v for k, v in response_data.items() if k != 'CHECKSUMHASH'}
        
        # Verify checksum
        is_valid = verify_checksum(
            paytm_params,
            settings.PAYTM_SECRET_KEY,
            paytm_checksum
        )
        
        # Get transaction from memory
        order_id = response_data.get('ORDERID')
        transaction = transactions_store.get(order_id)
        
        if transaction:
            if is_valid:
                # Update transaction data
                transaction['response_code'] = response_data.get('RESPCODE')
                transaction['response_msg'] = response_data.get('RESPMSG')
                transaction['paytm_txn_id'] = response_data.get('TXNID')
                transaction['bank_txn_id'] = response_data.get('BANKTXNID')
                
                # Update transaction status
                if response_data.get('STATUS') == 'TXN_SUCCESS':
                    transaction['status'] = 'success'
                else:
                    transaction['status'] = 'failed'
            
            # Return JSON response for mobile app
            return JsonResponse({
                'success': True,
                'checksum_valid': is_valid,
                'transaction': {
                    'order_id': transaction['order_id'],
                    'amount': str(transaction['amount']),
                    'status': transaction['status'],
                    'email': transaction['email'],
                    'mobile': transaction.get('mobile', ''),
                    'paytm_txn_id': transaction.get('paytm_txn_id'),
                    'response_msg': transaction.get('response_msg'),
                    'response_code': transaction.get('response_code'),
                    'bank_txn_id': transaction.get('bank_txn_id'),
                    'created_at': transaction['created_at']
                },
                'payment_response': {
                    'STATUS': response_data.get('STATUS'),
                    'RESPCODE': response_data.get('RESPCODE'),
                    'RESPMSG': response_data.get('RESPMSG'),
                    'TXNID': response_data.get('TXNID'),
                    'TXNAMOUNT': response_data.get('TXNAMOUNT'),
                    'CURRENCY': response_data.get('CURRENCY', 'INR'),
                    'TXNDATE': response_data.get('TXNDATE'),
                    'BANKTXNID': response_data.get('BANKTXNID'),
                    'PAYMENTMODE': response_data.get('PAYMENTMODE'),
                    'GATEWAYNAME': response_data.get('GATEWAYNAME'),
                    'BANKNAME': response_data.get('BANKNAME')
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Transaction not found',
                'order_id': order_id
            }, status=404)
    
    return JsonResponse({'error': 'Invalid request method'}, status=400)

def transaction_status(request, order_id):
    """API endpoint to check transaction status"""
    transaction = transactions_store.get(order_id)
    
    if transaction:
        return JsonResponse({
            'success': True,
            'transaction': {
                'order_id': transaction['order_id'],
                'amount': str(transaction['amount']),
                'status': transaction['status'],
                'email': transaction['email'],
                'mobile': transaction.get('mobile', ''),
                'paytm_txn_id': transaction.get('paytm_txn_id'),
                'response_msg': transaction.get('response_msg'),
                'response_code': transaction.get('response_code'),
                'created_at': transaction['created_at']
            }
        })
    else:
        return JsonResponse({
            'success': False,
            'error': 'Transaction not found'
        }, status=404)

def get_all_transactions(request):
    """Optional: API endpoint to get all transactions (for debugging)"""
    return JsonResponse({
        'success': True,
        'count': len(transactions_store),
        'transactions': list(transactions_store.values())
    })