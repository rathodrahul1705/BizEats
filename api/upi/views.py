# api/upi/views.py
import json
import uuid
import requests
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from datetime import datetime

# In-memory storage
upi_orders_storage = {}
upi_transactions_storage = {}

class UpiCashfreeService:
    def __init__(self):
        # Replace with your actual Cashfree credentials
        self.app_id = 'YOUR_CASHFREE_APP_ID'
        self.secret_key = 'YOUR_CASHFREE_SECRET_KEY'
        self.api_url = 'https://sandbox.cashfree.com/pg'
        
    def _get_headers(self):
        return {
            'x-api-version': '2022-09-01',
            'x-client-id': self.app_id,
            'x-client-secret': self.secret_key,
            'Content-Type': 'application/json',
        }
    
    def create_upi_order(self, order_data):
        """Create UPI order on Cashfree"""
        try:
            payload = {
                'order_id': order_data['order_id'],
                'order_amount': float(order_data['amount']),
                'order_currency': 'INR',
                'customer_details': {
                    'customer_id': order_data['customer_details']['customer_id'],
                    'customer_email': order_data['customer_details']['customer_email'],
                    'customer_phone': order_data['customer_details']['customer_phone'],
                    'customer_name': order_data['customer_details'].get('customer_name', 'Customer')
                },
                'order_meta': {
                    'return_url': f"yourapp://payment/callback?order_id={order_data['order_id']}"
                }
            }
            
            response = requests.post(
                f"{self.api_url}/orders",
                headers=self._get_headers(),
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                upi_orders_storage[order_data['order_id']] = {
                    'order_id': order_data['order_id'],
                    'payment_session_id': result.get('payment_session_id'),
                    'amount': order_data['amount'],
                    'status': 'ACTIVE',
                    'customer_details': order_data['customer_details'],
                    'created_at': str(datetime.now())
                }
                
                return {
                    'success': True,
                    'order_id': order_data['order_id'],
                    'payment_session_id': result.get('payment_session_id'),
                    'amount': order_data['amount']
                }
            else:
                return {'success': False, 'error': f"Cashfree error: {response.status_code}"}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def verify_upi_payment(self, order_id):
        """Verify UPI payment status"""
        try:
            response = requests.get(
                f"{self.api_url}/orders/{order_id}/payments",
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                payments = response.json()
                for payment in payments:
                    if payment.get('payment_status') == 'SUCCESS':
                        if order_id in upi_orders_storage:
                            upi_orders_storage[order_id]['status'] = 'PAID'
                        return {
                            'success': True,
                            'payment_status': 'SUCCESS',
                            'payment_id': payment.get('cf_payment_id'),
                            'amount': payment.get('payment_amount')
                        }
                return {'success': True, 'payment_status': 'PENDING'}
            return {'success': False, 'error': 'Verification failed'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

# Initialize service
upi_cashfree_service = UpiCashfreeService()

@csrf_exempt
def create_upi_order_api(request):
    """API endpoint to create UPI order"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validate required fields
            if 'amount' not in data or 'customer_details' not in data:
                return JsonResponse({
                    'success': False, 
                    'error': 'Missing required fields: amount or customer_details'
                }, status=400)
            
            customer = data['customer_details']
            if not all(k in customer for k in ['customer_id', 'customer_email', 'customer_phone']):
                return JsonResponse({
                    'success': False, 
                    'error': 'Missing customer details: customer_id, customer_email, customer_phone required'
                }, status=400)
            
            # Generate unique order ID
            order_id = f"UPI_ORDER_{uuid.uuid4().hex[:12].upper()}"
            
            # Create order
            result = upi_cashfree_service.create_upi_order({
                'order_id': order_id,
                'amount': data['amount'],
                'customer_details': customer,
                'order_note': data.get('order_note', '')
            })
            
            if result['success']:
                return JsonResponse({
                    'success': True,
                    'order_id': result['order_id'],
                    'payment_session_id': result['payment_session_id'],
                    'amount': result['amount']
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'error': result.get('error', 'Failed to create order')
                }, status=500)
                
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def verify_upi_payment_api(request):
    """API endpoint to verify UPI payment"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            order_id = data.get('order_id')
            
            if not order_id:
                return JsonResponse({
                    'success': False, 
                    'error': 'Order ID is required'
                }, status=400)
            
            result = upi_cashfree_service.verify_upi_payment(order_id)
            
            if result['success']:
                return JsonResponse({
                    'success': True,
                    'payment_status': result['payment_status'],
                    'payment_id': result.get('payment_id'),
                    'amount': result.get('amount')
                })
            else:
                return JsonResponse({
                    'success': False, 
                    'error': result.get('error', 'Verification failed')
                }, status=500)
                
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def get_upi_order_status_api(request, order_id):
    """API endpoint to get UPI order status"""
    if request.method == 'GET':
        order = upi_orders_storage.get(order_id)
        if order:
            return JsonResponse({
                'success': True,
                'order': order
            })
        return JsonResponse({
            'success': False, 
            'error': 'Order not found'
        }, status=404)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def upi_payment_webhook(request):
    """Webhook endpoint for Cashfree UPI payment updates"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            order_id = data.get('order_id')
            payment_status = data.get('payment_status')
            
            if order_id and payment_status == 'SUCCESS':
                if order_id in upi_orders_storage:
                    upi_orders_storage[order_id]['status'] = 'PAID'
                    
                    # Store transaction
                    transaction_id = f"UPI_TXN_{uuid.uuid4().hex[:12].upper()}"
                    upi_transactions_storage[transaction_id] = {
                        'transaction_id': transaction_id,
                        'order_id': order_id,
                        'payment_id': data.get('cf_payment_id'),
                        'amount': data.get('order_amount'),
                        'status': 'SUCCESS',
                        'webhook_data': data,
                        'created_at': str(datetime.now())
                    }
            
            return JsonResponse({'status': 'received'}, status=200)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)

def get_upi_installed_apps(request):
    """Helper endpoint to get installed UPI apps info"""
    # This is just a helper - actual detection happens on React Native side
    upi_apps = [
        {'name': 'Google Pay', 'package': 'com.google.android.apps.nbu.paisa.user'},
        {'name': 'PhonePe', 'package': 'com.phonepe.app'},
        {'name': 'Paytm', 'package': 'net.one97.paytm'},
        {'name': 'BHIM', 'package': 'in.org.npci.upiapp'},
        {'name': 'Amazon Pay', 'package': 'com.amazon.mShop.android.shopping'},
    ]
    return JsonResponse({
        'success': True,
        'apps': upi_apps
    })