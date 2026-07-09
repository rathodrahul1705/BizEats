import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, timedelta, date
import pytz
from django.db.models import Sum, Q, Count, F, Value, DecimalField
from django.db.models.functions import Coalesce, TruncDate
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from decimal import Decimal

from api.models import (
    RestaurantMaster, Order, Payment, User,
    RestaurantMenu, RestaurantLocation, RestaurantOwnerDetail
)
from .serializers import (
    SettlementDashboardQuerySerializer,
    SettlementTransactionsQuerySerializer,
    SettlementExportBodySerializer,
    RestaurantBriefSerializer,
    SettlementSummarySerializer,
    SettlementCurrentCycleSerializer,
    SettlementTransactionSerializer,
    DayWiseSummarySerializer,
)

logger = logging.getLogger(__name__)

COMMISSION_RATE = Decimal('0.10')

# ---------- Helper: get restaurant data ----------
def get_restaurant_data(restaurant_id):
    logger.debug(f"Fetching restaurant data for ID: {restaurant_id}")
    try:
        restaurant = RestaurantMaster.objects.select_related(
            'restaurant_location', 'owner_details'
        ).get(restaurant_id=restaurant_id)
        logger.info(f"Restaurant found: {restaurant.restaurant_name} (ID: {restaurant_id})")
        return restaurant
    except RestaurantMaster.DoesNotExist:
        logger.warning(f"Restaurant with ID {restaurant_id} not found")
        return None

# ---------- Helper: map payment status ----------
PAYMENT_STATUS_MAP = {
    1: 'pending',      # Created
    2: 'processing',   # Attempted
    3: 'pending',      # Pending
    4: 'processing',   # Authorized
    5: 'paid',         # Captured
    6: 'failed',       # Failed
    7: 'failed',       # Refunded
    8: 'failed',       # Partially Refunded
}

def get_payment_status_display(payment_status):
    return PAYMENT_STATUS_MAP.get(payment_status, 'unknown')

# ---------- Helper: date range ----------
def get_date_range(filter_type, start_date=None, end_date=None, timezone_str='Asia/Kolkata'):
    logger.debug(f"Calculating date range: filter={filter_type}, start={start_date}, end={end_date}, tz={timezone_str}")
    tz = pytz.timezone(timezone_str)
    today = datetime.now(tz).date()
    
    if filter_type == 'this_week':
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif filter_type == 'last_week':
        start = today - timedelta(days=today.weekday() + 7)
        end = start + timedelta(days=6)
    elif filter_type == 'this_month':
        start = date(today.year, today.month, 1)
        if today.month == 12:
            end = date(today.year, 12, 31)
        else:
            end = date(today.year, today.month + 1, 1) - timedelta(days=1)
    elif filter_type == 'last_month':
        first_day_this_month = date(today.year, today.month, 1)
        last_day_last_month = first_day_this_month - timedelta(days=1)
        start = date(last_day_last_month.year, last_day_last_month.month, 1)
        end = last_day_last_month
    elif filter_type == 'custom':
        if start_date and end_date:
            start = start_date
            end = end_date
        else:
            logger.error("Custom filter requested but start_date/end_date missing")
            raise ValueError("Custom filter requires start_date and end_date")
    else:
        logger.error(f"Invalid filter type: {filter_type}")
        raise ValueError("Invalid filter type")
    
    start_dt = tz.localize(datetime.combine(start, datetime.min.time()))
    end_dt = tz.localize(datetime.combine(end, datetime.max.time()))
    logger.info(f"Date range computed: {start_dt} to {end_dt}")
    return start_dt, end_dt

# ---------- Helper: compute settlement summary ----------
def compute_summary(orders_queryset):
    logger.debug("Computing summary for orders queryset")
    total_orders = orders_queryset.count()
    
    agg = orders_queryset.aggregate(
        item_gross_sale=Coalesce(Sum('subtotal'), Value(0.00, output_field=DecimalField())),
        gross_sale=Coalesce(Sum('total_amount'), Value(0.00, output_field=DecimalField())),
        total_delivery_fee=Coalesce(Sum('delivery_fee'), Value(0.00, output_field=DecimalField())),
        total_tax=Coalesce(Sum('tax'), Value(0.00, output_field=DecimalField())),
    )
    item_gross_sale = agg['item_gross_sale'] or Decimal('0.00')
    gross_sale = agg['gross_sale'] or Decimal('0.00')
    total_delivery_fee = agg['total_delivery_fee'] or Decimal('0.00')
    total_tax = agg['total_tax'] or Decimal('0.00')
    
    eatoor_commission = item_gross_sale * COMMISSION_RATE
    restaurant_net_pay = item_gross_sale - eatoor_commission
    
    summary = {
        'total_orders': total_orders,
        'item_gross_sale': round(item_gross_sale, 2),
        'gross_sale': round(gross_sale, 2),
        'total_delivery_fee': round(total_delivery_fee, 2),
        'total_tax': round(total_tax, 2),
        'eatoor_commission': round(eatoor_commission, 2),
        'restaurant_net_pay': round(restaurant_net_pay, 2),
    }
    logger.debug(f"Summary computed: {summary}")
    return summary

# ---------- Helper: build transaction dict ----------
def order_to_transaction(order, commission_rate=COMMISSION_RATE):
    logger.debug(f"Building transaction for order ID: {order.id}")
    payment = order.payments.first()
    payment_method_display = ''
    payment_status_str = 'pending'
    if payment:
        payment_method_display = payment.get_payment_method_display() if payment.payment_method else ''
        payment_status_str = get_payment_status_display(payment.status)
        logger.debug(f"Order {order.id} payment status: {payment_status_str}, method: {payment_method_display}")
    
    if order.is_takeaway:
        order_type = 'takeaway'
    elif order.delivery_address:
        order_type = 'delivery'
    else:
        order_type = 'dine_in'
    
    item_gross_sale = order.subtotal or Decimal('0.00')
    gross_sale = order.total_amount or Decimal('0.00')
    eatoor_commission = item_gross_sale * commission_rate
    restaurant_net_pay = item_gross_sale - eatoor_commission
    discount = order.coupon_discount or Decimal('0.00')
    tax = order.tax or Decimal('0.00')
    delivery_fee = order.delivery_fee or Decimal('0.00')
    
    transaction = {
        'id': str(order.id),
        'date': order.order_date.date(),
        'order_id': order.order_number or f'ORD-{order.id}',
        'customer': order.user.full_name if order.user else 'Guest',
        'order_type': order_type,
        'payment_method': payment_method_display,
        'items_count': order.quantity or 1,
        'item_gross_sale': round(item_gross_sale, 2),
        'gross_sale': round(gross_sale, 2),
        'discount': round(discount, 2),
        'tax': round(tax, 2),
        'delivery_fee': round(delivery_fee, 2),
        'eatoor_commission': round(eatoor_commission, 2),
        'restaurant_net_pay': round(restaurant_net_pay, 2),
        'status': payment_status_str,
    }
    logger.debug(f"Transaction built: {transaction['order_id']}")
    return transaction

# ---------- Helper: get orders for restaurant ----------
def get_orders_for_restaurant(restaurant_id, start_dt, end_dt):
    logger.debug(f"Fetching orders for restaurant {restaurant_id} from {start_dt} to {end_dt}")
    orders = Order.objects.filter(
        restaurant_id=restaurant_id,
        status=6,  # completed orders
        order_date__gte=start_dt,
        order_date__lte=end_dt
    )
    count = orders.count()
    logger.info(f"Retrieved {count} orders for restaurant {restaurant_id}")
    return orders

# ---------- Dashboard View ----------
class SettlementDashboardView(APIView):
    def get(self, request):
        logger.info("SettlementDashboardView GET called")
        query_serializer = SettlementDashboardQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        data = query_serializer.validated_data
        logger.debug(f"Dashboard query params: {data}")

        restaurant = get_restaurant_data(data['restaurant_id'])
        if not restaurant:
            logger.warning(f"Restaurant not found: {data['restaurant_id']}")
            return Response({'success': False, 'error': 'Restaurant not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            start_dt, end_dt = get_date_range(
                data['filter'],
                data.get('start_date'),
                data.get('end_date'),
                data.get('timezone', 'Asia/Kolkata')
            )
        except ValueError as e:
            logger.error(f"Date range error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        tz = pytz.timezone(data.get('timezone', 'Asia/Kolkata'))
        today = datetime.now(tz).date()
        cycle_start = today - timedelta(days=today.weekday())
        cycle_end = cycle_start + timedelta(days=6)
        cycle_orders = Order.objects.filter(
            restaurant_id=restaurant.restaurant_id,
            order_date__gte=tz.localize(datetime.combine(cycle_start, datetime.min.time())),
            order_date__lte=tz.localize(datetime.combine(cycle_end, datetime.max.time())),
            status=6
        )
        cycle_summary = compute_summary(cycle_orders)
        progress_percent = int(((today - cycle_start).days + 1) / 7 * 100) if today <= cycle_end else 100

        current_cycle = {
            'cycle_start_date': cycle_start,
            'cycle_end_date': cycle_end,
            'payout_date': cycle_end + timedelta(days=1),
            'status': 'processing',
            'orders': cycle_summary['total_orders'],
            'item_gross_sale': cycle_summary['item_gross_sale'],
            'gross_sale': cycle_summary['gross_sale'],
            'eatoor_commission': cycle_summary['eatoor_commission'],
            'restaurant_net_pay': cycle_summary['restaurant_net_pay'],
            'progress_percent': progress_percent,
        }

        # Pass request context to serializer to build absolute image URLs
        restaurant_data = RestaurantBriefSerializer(restaurant, context={'request': request}).data

        response_data = {
            'success': True,
            'data': {
                'restaurant': restaurant_data,
                'current_cycle': current_cycle,
            }
        }
        logger.info(f"Dashboard response sent for restaurant {restaurant.restaurant_id}")
        return Response(response_data, status=status.HTTP_200_OK)

# ---------- Transactions View (day-wise aggregation) ----------
class SettlementTransactionsView(APIView):
    def get(self, request):
        logger.info("SettlementTransactionsView GET called")
        query_serializer = SettlementTransactionsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        data = query_serializer.validated_data
        logger.debug(f"Transactions query params: {data}")

        restaurant = get_restaurant_data(data['restaurant_id'])
        if not restaurant:
            logger.warning(f"Restaurant not found: {data['restaurant_id']}")
            return Response({'success': False, 'error': 'Restaurant not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            start_dt, end_dt = get_date_range(
                data['filter'],
                data.get('start_date'),
                data.get('end_date'),
                data.get('timezone', 'Asia/Kolkata')
            )
        except ValueError as e:
            logger.error(f"Date range error: {e}")
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        orders_qs = get_orders_for_restaurant(restaurant.restaurant_id, start_dt, end_dt)

        # Filter by payment status if provided
        if data.get('status'):
            status_map_reverse = {v: k for k, v in PAYMENT_STATUS_MAP.items()}
            target_status_ints = [k for k, v in PAYMENT_STATUS_MAP.items() if v == data['status']]
            if target_status_ints:
                orders_qs = orders_qs.filter(
                    payments__status__in=target_status_ints
                ).distinct()
                logger.debug(f"Filtered by status '{data['status']}', matching ints: {target_status_ints}")
            else:
                logger.warning(f"Invalid status filter: {data['status']}, returning empty")
                orders_qs = orders_qs.none()

        # Compute overall totals
        totals = compute_summary(orders_qs)

        # Aggregate by day
        day_summary_qs = (
            orders_qs
            .annotate(day=TruncDate('order_date'))
            .values('day')
            .annotate(
                total_orders=Count('id'),
                item_gross_sale=Coalesce(Sum('subtotal'), Value(0.00, output_field=DecimalField())),
                gross_sale=Coalesce(Sum('total_amount'), Value(0.00, output_field=DecimalField())),
                total_delivery_fee=Coalesce(Sum('delivery_fee'), Value(0.00, output_field=DecimalField())),
                total_tax=Coalesce(Sum('tax'), Value(0.00, output_field=DecimalField())),
            )
            .order_by('day')
        )

        day_list = []
        for item in day_summary_qs:
            item_gross = item['item_gross_sale'] or Decimal('0.00')
            gross = item['gross_sale'] or Decimal('0.00')
            commission = item_gross * COMMISSION_RATE
            net = item_gross - commission
            day_list.append({
                'date': item['day'],
                'total_orders': item['total_orders'],
                'item_gross_sale': round(item_gross, 2),
                'gross_sale': round(gross, 2),
                'total_delivery_fee': round(item['total_delivery_fee'] or 0, 2),
                'tax': round(item['total_tax'] or 0, 2),
                'eatoor_commission': round(commission, 2),
                'restaurant_net_pay': round(net, 2),
                'average_order_value': round(gross / item['total_orders'], 2) if item['total_orders'] > 0 else 0,
            })

        # Sorting
        sort_by = data.get('sort_by', 'date')
        sort_order = data.get('sort_order', 'desc')
        reverse = (sort_order == 'desc')
        field_map = {
            'date': 'date',
            'total_orders': 'total_orders',
            'gross_sale': 'gross_sale',
            'restaurant_net_pay': 'restaurant_net_pay',
        }
        sort_key = field_map.get(sort_by, 'date')
        day_list.sort(key=lambda x: x[sort_key], reverse=reverse)

        # Pagination
        page = data.get('page', 1)
        page_size = data.get('page_size', 20)
        paginator = Paginator(day_list, page_size)
        total_items = len(day_list)
        total_pages = paginator.num_pages

        try:
            paginated_days = paginator.page(page)
        except PageNotAnInteger:
            paginated_days = paginator.page(1)
        except EmptyPage:
            paginated_days = paginator.page(paginator.num_pages)

        # Pass request context to serializer
        restaurant_data = RestaurantBriefSerializer(restaurant, context={'request': request}).data

        response_data = {
            'success': True,
            'data': {
                'restaurant': restaurant_data,
                'items': DayWiseSummarySerializer(paginated_days.object_list, many=True).data,
                'totals': totals,
                'pagination': {
                    'page': paginated_days.number,
                    'page_size': page_size,
                    'total_items': total_items,
                    'total_pages': total_pages,
                }
            }
        }
        logger.info(f"Transactions response sent for restaurant {restaurant.restaurant_id}")
        return Response(response_data, status=status.HTTP_200_OK)

# ---------- Export View ----------
class SettlementExportView(APIView):
    def post(self, request):
        logger.info("SettlementExportView POST called")
        serializer = SettlementExportBodySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        logger.debug(f"Export request data: {data}")

        restaurant = get_restaurant_data(data['restaurant_id'])
        if not restaurant:
            logger.warning(f"Restaurant not found: {data['restaurant_id']}")
            return Response({'success': False, 'error': 'Restaurant not found'}, status=status.HTTP_404_NOT_FOUND)

        # In a real implementation, generate the file and return its URL
        file_url = "https://storage.example.com/settlements/report_12345.xlsx"
        expires_at = (datetime.now() + timedelta(hours=1)).isoformat() + 'Z'
        logger.info(f"Export file generated: {file_url}, expires at {expires_at}")

        return Response({
            'success': True,
            'data': {
                'file_url': file_url,
                'expires_at': expires_at,
            }
        }, status=status.HTTP_200_OK)

# ---------- Transaction Detail View ----------
class SettlementTransactionDetailView(APIView):
    def get(self, request, transaction_id):
        logger.info(f"SettlementTransactionDetailView GET called for transaction_id: {transaction_id}")
        try:
            order = Order.objects.select_related('user', 'restaurant').get(id=transaction_id)
            logger.debug(f"Order found: {order.id}")
        except Order.DoesNotExist:
            logger.warning(f"Transaction (order) with id {transaction_id} not found")
            return Response({'success': False, 'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

        txn = order_to_transaction(order)
        # Pass request context to serializer
        restaurant_data = RestaurantBriefSerializer(order.restaurant, context={'request': request}).data
        txn['restaurant'] = restaurant_data
        logger.info(f"Transaction detail sent for order {transaction_id}")

        return Response({
            'success': True,
            'data': txn,
        }, status=status.HTTP_200_OK)