import razorpay
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt

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
        
        # Verify payment signature
        client.utility.verify_payment_signature(params_dict)
        
        # Payment successful - save to database, etc.
        # Add your business logic here
        
        return Response({'status': 'Payment Successful'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)