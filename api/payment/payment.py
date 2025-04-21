import razorpay
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from api.models import Payment, Order
from django.utils.timezone import now

client = razorpay.Client(auth=(settings.RAZORPAY_API_KEY, settings.RAZORPAY_API_SECRET))

@api_view(['POST'])
def create_order(request):
    try:
        data = request.data
        amount = int(float(data['amount']) * 100)  # Convert to paise
        currency = data.get('currency', 'INR')
        
        order = client.order.create({
            'amount': amount,
            'currency': currency,
            'payment_capture': '1'  # Auto-capture payment
        })
        
        return Response({
            'id': order['id'],
            'amount': order['amount'],
            'currency': order['currency']
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)

def get_payment_method_code(razorpay_method, card_type=None):
    if razorpay_method == 'card':
        if card_type == 'credit':
            return 1  # Credit Card
        elif card_type == 'debit':
            return 2  # Debit Card (new code)
        elif card_type == 'prepaid':
            return 2  # Prepaid Card
        else:
            return 7
    elif razorpay_method == 'upi':
        return 3
    elif razorpay_method == 'netbanking':
        return 4
    elif razorpay_method == 'cash':
        return 5
    return None


@csrf_exempt
@api_view(['POST'])
def verify_payment(request):
    try:
        data = request.data
        params_dict = {
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature']
        }

        # Step 1: Verify Razorpay Signature
        client.utility.verify_payment_signature(params_dict)

        # Step 2: Fetch payment details from Razorpay
        payment_details = client.payment.fetch(data['razorpay_payment_id'])

        # Step 3: Get the related order
        order = Order.objects.get(id=data['eatoor_order_id'])

        # Step 4: Create or update the payment record
        payment_method_code = get_payment_method_code(payment_details.get('method'), payment_details.get('type', None))
        payment, created = Payment.objects.update_or_create(
            razorpay_payment_id=data['razorpay_payment_id'],
            defaults={
                'order': order,
                'payment_gateway': 1,  # Razorpay
                'payment_method': payment_method_code,
                'payment_type': data['payment_type'],
                'status': 5,  # Captured
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_signature': data['razorpay_signature'],
                'amount': data['amount'],
                'currency': payment_details.get('currency', 'INR'),
                'gateway_fee': float(payment_details.get('fee', 0)) / 100,
                'tax_on_fee': float(payment_details.get('tax', 0)) / 100,
                'captured_at': now(),
                'invoice_number': payment_details.get('invoice_id'),
                'notes': f"Restaurant: {data.get('restaurantName')}",
                'raw_response': payment_details
            }
        )

        order.payment_method = payment_method_code
        order.save()

        return Response({
            'status': 'Payment Successful',
            'payment_id': payment.id,
            'created': created,
            'eatoor_order_number': data.get('eatoor_order_number')
        })

    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

    except razorpay.errors.SignatureVerificationError:
        return Response({'error': 'Signature verification failed'}, status=400)

    except Exception as e:
        return Response({'error': str(e)}, status=400)
