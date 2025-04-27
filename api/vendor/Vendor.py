from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.models import Cart, Order, OrderStatusLog, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress, OrderLiveLocation, Payment
from api.emailer.email_notifications import send_order_status_email
from decouple import config
from django.db.models import Sum, Count
from django.utils.dateparse import parse_date
from django.utils import timezone
        
# @method_decorator(csrf_exempt, name='dispatch')
# class GetVendorWiseCounts(APIView):

#     def post(self, request, *args, **kwargs):
#         try:
#             restaurant_id = request.data.get('restaurant_id')
#             date = request.data.get('date')

#             if not restaurant_id or not date:
#                 return Response({
#                     "status": "error",
#                     "message": "restaurant_id and date are required"
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             date_obj = parse_date(date)
#             if not date_obj:
#                 return Response({
#                     "status": "error",
#                     "message": "Invalid date format. Use YYYY-MM-DD."
#                 }, status=status.HTTP_400_BAD_REQUEST)

#             orders = Order.objects.filter(
#                 restaurant_id=restaurant_id,
#                 order_date__date=date_obj
#             )

#             total_orders = orders.count()
#             total_revenue = orders.aggregate(total=Sum('total_amount'))['total'] or 0
#             pending_orders = orders.filter(status=1).count()
#             delivered_orders = orders.filter(status=6).count()

#             return Response({
#                 "status": "success",
#                 "data": {
#                     "total_orders": total_orders,
#                     "total_revenue": float(total_revenue),
#                     "pending_orders": pending_orders,
#                     "delivered_orders": delivered_orders
#                 }
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({
#                 "status": "error",
#                 "message": str(e)
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class GetVendorWiseCounts(APIView):

    def post(self, request, *args, **kwargs):
        try:
            restaurant_id = request.data.get('restaurant_id')
            date = request.data.get('date')

            if not restaurant_id or not date:
                return Response({
                    "status": "error",
                    "message": "restaurant_id and date are required"
                }, status=status.HTTP_400_BAD_REQUEST)

            date_obj = parse_date(date)
            if not date_obj:
                return Response({
                    "status": "error",
                    "message": "Invalid date format. Use YYYY-MM-DD."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get all orders for the restaurant on the specified date
            orders = Order.objects.filter(
                restaurant_id=restaurant_id,
                order_date__date=date_obj
            )

            # Calculate various metrics
            total_orders = orders.count()
            
            # Revenue is sum of total_amount for all orders except refunded
            revenue = orders.exclude(status=8).aggregate(
                total=Sum('total_amount')
            )['total'] or 0
            
            # Expense calculation (this is a placeholder - you'll need to implement your actual expense logic)
            # Typically expenses might include:
            # - Cost of goods sold (from order items)
            # - Delivery costs
            # - Platform fees, etc.
            # You'll need to implement this based on your business logic
            expense = 0.00  # Replace with your actual expense calculation
            
            # Profit is revenue minus expense
            profit = float(revenue) - float(expense)
            
            # Status-based counts
            status_counts = {
                'delivered': orders.filter(status=6).count(),
                'canceled': orders.filter(status=7).count(),
                'refunded': orders.filter(status=8).count(),
                'pending': orders.filter(status=1).count(),
                'confirmed': orders.filter(status=2).count(),
                'preparing': orders.filter(status=3).count(),
                'ready': orders.filter(status=4).count(),
                'on_the_way': orders.filter(status=5).count(),
            }

            return Response({
                "status": "success",
                "data": {
                    "total_orders": total_orders,
                    "total_revenue": float(revenue),
                    "expense": float(expense),
                    "profit": float(profit),
                    "status_counts": status_counts,
                    # Additional breakdown if needed
                    "delivered_orders": status_counts['delivered'],
                    "canceled_orders": status_counts['canceled'],
                    "refunded_orders": status_counts['refunded'],
                    "pending_orders": status_counts['pending'],
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
