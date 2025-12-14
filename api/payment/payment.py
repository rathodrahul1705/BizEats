import razorpay
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from api.models import Payment, Order
from django.utils.timezone import now
import logging
import json

logger = logging.getLogger(__name__)
client = razorpay.Client(auth=(settings.RAZORPAY_API_KEY, settings.RAZORPAY_API_SECRET))

@api_view(['POST'])
def create_order(request):
    try:
        # Parse and validate input data
        try:
            data = json.loads(request.body) if isinstance(request.body, bytes) else request.data
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON data'}, status=400)

        # Validate required fields
        if 'amount' not in data:
            return Response({'error': 'Amount is required'}, status=400)

        try:
            amount = int(data['amount'])
            if amount <= 0:
                return Response({'error': 'Amount must be positive'}, status=400)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount format'}, status=400)

        # Minimum amount validation (100 paise = ₹1)
        if amount < 100:
            return Response({'error': 'Minimum amount is ₹1 (100 paise)'}, status=400)

        # Currency validation
        currency = data.get('currency', 'INR').upper()
        if currency != 'INR':
            return Response({'error': 'Only INR currency is supported'}, status=400)

        # Prepare order data
        order_data = {
            'amount': amount,
            'currency': currency,
            'payment_capture': '1',  # Auto-capture payment
            'notes': {
                'platform': 'Eatoor',
                'user_id': data.get('notes', {}).get('userId', ''),
                'restaurant_id': data.get('notes', {}).get('restaurantId', ''),
                'coupon_code': data.get('notes', {}).get('couponCode', '')
            }
        }

        # Add receipt if provided
        if 'receipt' in data:
            order_data['receipt'] = data['receipt']

        # Create Razorpay order
        try:
            order = client.order.create(order_data)
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Razorpay order creation failed: {str(e)}")
            return Response({'error': 'Payment gateway error'}, status=502)
        except Exception as e:
            logger.error(f"Order creation failed: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)

        # Prepare response
        response_data = {
            'status': 'success',
            'data': {
                'id': order['id'],
                'entity': order.get('entity', 'order'),
                'amount': order['amount'],
                'amount_paid': order.get('amount_paid', 0),
                'amount_due': order.get('amount_due', order['amount']),
                'currency': order['currency'],
                'receipt': order.get('receipt'),
                'offer_id': order.get('offer_id'),
                'status': order.get('status', 'created'),
                'attempts': order.get('attempts', 0),
                'created_at': order.get('created_at'),
                'key': settings.RAZORPAY_API_KEY
            }
        }

        return Response(response_data)

    except Exception as e:
        logger.error(f"Unexpected error in create_order: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)

def get_payment_method_code(razorpay_method, card_type=None):
    """
    Maps Razorpay payment method to internal payment method codes
    """
    method_mapping = {
        'card': {
            'credit': 1,   # Credit Card
            'debit': 2,    # Debit Card
            'prepaid': 2,  # Prepaid Card
            None: 7        # Unknown Card
        },
        'upi': 3,
        'netbanking': 4,
        'wallet': 6,
        'emi': 8,
        'cash': 5,
        'paylater': 9
    }
    
    if razorpay_method in method_mapping:
        if razorpay_method == 'card':
            return method_mapping['card'].get(card_type, 7)
        return method_mapping[razorpay_method]
    return 9  # Other/Unknown

@csrf_exempt
@api_view(['POST'])
def verify_payment(request):
    try:
        # Parse input data
        try:
            data = json.loads(request.body) if isinstance(request.body, bytes) else request.data
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON data'}, status=400)

        # Validate required fields
        required_fields = [
            'razorpay_order_id', 
            'razorpay_payment_id', 
            'razorpay_signature',
            'eatoor_order_id',
            'amount'
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return Response({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)

        # Verify payment signature
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature']
            })

        except razorpay.errors.SignatureVerificationError as e:
            logger.error(f"Signature verification failed: {str(e)}")
            return Response({'error': 'Invalid payment signature'}, status=400)
        except Exception as e:
            logger.error(f"Signature verification error: {str(e)}")
            return Response({'error': 'Payment verification failed'}, status=400)

        # Fetch payment details from Razorpay
        try:
            payment_details = client.payment.fetch(data['razorpay_payment_id'])
        except razorpay.errors.BadRequestError as e:
            logger.error(f"Payment fetch failed: {str(e)}")
            return Response({'error': 'Payment verification failed'}, status=400)

        # Validate payment status
        if payment_details['status'] != 'captured':
            return Response({
                'error': f"Payment not captured. Status: {payment_details['status']}"
            }, status=400)

        # Validate payment amount
        # if int(payment_details['amount']) != int(data['amount']):
        #     return Response({
        #         'error': f"Payment amount mismatch. Expected: {data['amount']}, Actual: {payment_details['amount']}"
        #     }, status=400)

        # Get the related order
        try:
            order = Order.objects.get(id=data['eatoor_order_id'])
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)
        
        # Get payment method details
        method = payment_details.get('method')
        card_type = payment_details.get('card', {}).get('type') if method == 'card' else None
        payment_method_code = get_payment_method_code(method, card_type)

        # Create payment record
        payment_data = {
            'order': order,
            'payment_gateway': 1,  # Razorpay
            'payment_method': payment_method_code,
            'payment_type': data.get('payment_type', 2),  # Default to online
            'status': 5,  # Captured
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature'],
            'amount': float(payment_details['amount']) / 100,  # Convert to rupees
            'currency': payment_details.get('currency', 'INR'),
            'gateway_fee': float(payment_details.get('fee', 0)) / 100,
            'tax_on_fee': float(payment_details.get('tax', 0)) / 100,
            'captured_at': now(),
            'invoice_number': payment_details.get('invoice_id'),
            'notes': (
                f"Restaurant: {data.get('restaurantName', 'Unknown')} | "
                f"Coupon: {data.get('couponCode', 'None')} | "
                f"Method: {method} | "
                f"Card: {card_type if card_type else 'N/A'}"
            ),
            'raw_response': payment_details
        }

        try:
            payment, created = Payment.objects.update_or_create(
                razorpay_payment_id=data['razorpay_payment_id'],
                defaults=payment_data
            )
        except Exception as e:
            logger.error(f"Payment record creation failed: {str(e)}")
            return Response({'error': 'Failed to create payment record'}, status=500)

        # Update order status
        try:
            order.payment_method = payment_method_code
            order.payment_status = 5  # Mark as paid
            order.save()
        except Exception as e:
            logger.error(f"Order update failed: {str(e)}")
            return Response({'error': 'Failed to update order status'}, status=500)

        return Response({
            'status': 'success',
            'payment_id': payment.id,
            'order_status': order.status,
            'eatoor_order_number': order.order_number,
            'payment_method': method,
            'payment_status': 'captured',
            'amount_paid': float(payment_details['amount']) / 100
        })

    except Exception as e:
        logger.error(f"Unexpected error in verify_payment: {str(e)}")
        return Response({'error': 'Internal server error'}, status=500)