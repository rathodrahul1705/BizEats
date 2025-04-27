from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics, permissions
from api.models import Cart, Order, OrderStatusLog, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress, OrderLiveLocation, Payment
from api.emailer.email_notifications import send_order_status_email
from decouple import config
from django.db.models import Sum, Count, F, FloatField
from django.utils.dateparse import parse_date
from datetime import timedelta
from django.utils.timezone import now


        
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

            total_orders = orders.count()

            # Exclude canceled (7) and refunded (8) orders for revenue
            revenue_orders = orders.exclude(status__in=[7, 8])

            revenue = revenue_orders.aggregate(
                total=Sum('total_amount')
            )['total'] or 0

            # Get all order_numbers from revenue_orders
            order_numbers = revenue_orders.values_list('order_number', flat=True)

            # Get related cart entries for those orders
            carts = Cart.objects.filter(order_number__in=order_numbers)

            # Calculate expense: Sum of (item_price)
            expense = carts.aggregate(
                total=Sum(
                    F('item_price'),
                    output_field=FloatField()
                )
            )['total'] or 0

            profit = float(revenue) - float(expense)

            # Status-wise counts
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

            current_month_start = date_obj.replace(day=1)  # Only set 'day' to 1
            next_month_start = (current_month_start + timedelta(days=32)).replace(day=1)
            current_month_end = next_month_start - timedelta(seconds=1)


            # Get all orders for the current month
            current_month_orders = Order.objects.filter(
                restaurant_id=restaurant_id,
                order_date__range=[current_month_start, current_month_end]
            )

            # Exclude canceled (7) and refunded (8) orders for current month revenue
            current_month_revenue_orders = current_month_orders.exclude(status__in=[7, 8])
            current_month_revenue = current_month_revenue_orders.aggregate(
                total=Sum('total_amount')
            )['total'] or 0

            # Get order numbers for the current month revenue orders
            current_month_order_numbers = current_month_revenue_orders.values_list('order_number', flat=True)

            # Get carts for the current month
            current_month_carts = Cart.objects.filter(order_number__in=current_month_order_numbers)

            # Calculate current month expense: Sum of (item_price)
            current_month_expense = current_month_carts.aggregate(
                total=Sum(
                    F('item_price'),
                    output_field=FloatField()
                )
            )['total'] or 0

            current_month_profit = float(current_month_revenue) - float(current_month_expense)

            return Response({
                "status": "success",
                "data": {
                    "total_orders": total_orders,
                    "total_revenue": float(revenue),
                    "expense": float(expense),
                    "profit": float(profit),
                    "status_counts": status_counts,
                    "delivered_orders": status_counts['delivered'],
                    "canceled_orders": status_counts['canceled'],
                    "refunded_orders": status_counts['refunded'],
                    "pending_orders": status_counts['pending'],
                    # Current month data
                    "current_month_revenue": float(current_month_revenue),
                    "current_month_expense": float(current_month_expense),
                    "current_month_profit": float(current_month_profit),
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
