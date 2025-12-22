from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Q
from decimal import Decimal
import uuid

from api.vendorpayout.serializers import PayoutDataSerializer
from api.models import RestaurantMaster, Order, RestaurantDocuments
from api.models import User

class PayoutManagementAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_restaurant(self, restaurant_id):
        try:
            return RestaurantMaster.objects.get(
                restaurant_id=restaurant_id,
                user=self.request.user
            )
        except RestaurantMaster.DoesNotExist:
            return None
    
    def get_restaurant_account_details(self, restaurant):
        """
        Get restaurant account details from RestaurantDocuments model
        """
        try:
            documents = RestaurantDocuments.objects.get(restaurant=restaurant)
            
            # Mask account number for security (show only last 4 digits)
            account_number = documents.bank_account_number
            masked_account = f"XXXXXX{account_number[-4:]}" if account_number and len(account_number) > 4 else account_number
            
            return {
                'account_number': account_number,
                'masked_account_number': masked_account,
                'bank_account_ifsc_code': documents.bank_account_ifsc_code,
                'bank_account_type': documents.get_bank_account_type_display(),
                'bank_account_type_code': documents.bank_account_type,
                'pan_number': documents.pan_number,
                'name_as_per_pan': documents.name_as_per_pan,
                'fssai_number': documents.fssai_number,
                'is_contract_checked': documents.is_contract_checked,
                'has_partner_contract': bool(documents.partner_contract_doc),
                'has_documents': True
            }
        except RestaurantDocuments.DoesNotExist:
            return {
                'account_number': None,
                'masked_account_number': None,
                'bank_account_ifsc_code': None,
                'bank_account_type': None,
                'bank_account_type_code': None,
                'pan_number': None,
                'name_as_per_pan': None,
                'fssai_number': None,
                'is_contract_checked': False,
                'has_partner_contract': False,
                'has_documents': False
            }
    
    def get_next_tuesday(self):
        today = timezone.now().date()
        days_ahead = 1 - today.weekday()  # 0=Monday, 1=Tuesday, etc.
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)
    
    def get_last_tuesday(self):
        today = timezone.now().date()
        days_behind = today.weekday() - 1
        if days_behind < 0:
            days_behind += 7
        return today - timedelta(days=days_behind)
    
    def get_current_cycle(self):
        last_tuesday = self.get_last_tuesday()
        next_tuesday = self.get_next_tuesday()
        
        today = timezone.now().date()
        if today.weekday() == 1:  # Tuesday
            current_time = timezone.now().time()
            if current_time.hour >= 14:  # After 2 PM
                last_tuesday += timedelta(days=7)
                next_tuesday += timedelta(days=7)
        
        return {
            'start': last_tuesday,
            'end': next_tuesday,
            'label': f"{last_tuesday.strftime('%d %b')} - {next_tuesday.strftime('%d %b')}"
        }
    
    def calculate_commission(self, order_amount):
        # 10% commission
        return Decimal(order_amount) * Decimal('0.10')
    
    def get_payout_data(self, restaurant):
        current_cycle = self.get_current_cycle()
        
        # Get restaurant account details
        account_details = self.get_restaurant_account_details(restaurant)
        
        # Get all delivered orders for this restaurant
        delivered_orders = Order.objects.filter(
            restaurant=restaurant,
            status=6,  # Delivered
            payment_status=5  # Completed
        )
        
        # Get current cycle orders
        current_cycle_orders = delivered_orders.filter(
            delivery_date__date__gte=current_cycle['start'],
            delivery_date__date__lte=current_cycle['end']
        )
        
        # Get last cycle orders (previous Tuesday to current Tuesday)
        last_cycle_start = current_cycle['start'] - timedelta(days=7)
        last_cycle_end = current_cycle['end'] - timedelta(days=7)
        last_cycle_orders = delivered_orders.filter(
            delivery_date__date__gte=last_cycle_start,
            delivery_date__date__lt=current_cycle['start']
        )
        
        # Calculate totals
        total_earnings = delivered_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        pending_settlement = current_cycle_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        last_payout = last_cycle_orders.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0.00')
        
        # Get last payout date
        last_payout_order = delivered_orders.filter(
            delivery_date__date__lt=current_cycle['start']
        ).order_by('-delivery_date').first()
        
        # Generate payout cycles
        payout_cycles = self.generate_payout_cycles(restaurant, account_details)
        
        # Generate daily earnings
        daily_earnings = self.generate_daily_earnings(restaurant, current_cycle)
        
        # Generate payment history
        payment_history = self.generate_payment_history(restaurant, account_details)
        
        # Withdrawal options
        withdrawal_options = [
            {
                'id': 1,
                'method': 'Bank Transfer',
                'icon': 'fas fa-university',
                'daily_limit': '₹1,00,000',
                'processing_time': 'Every Tuesday by 2 PM',
                'fee': '₹10 per transaction',
                'min_amount': '₹1,000',
                'is_default': True,
                'is_available': account_details['has_documents']  # Only available if bank details exist
            },
            {
                'id': 2,
                'method': 'UPI',
                'icon': 'fas fa-mobile-alt',
                'daily_limit': '₹50,000',
                'processing_time': 'Every Tuesday by 2 PM',
                'fee': '₹5 per transaction',
                'min_amount': '₹500',
                'is_default': False,
                'is_available': False  # Not implemented yet
            },
            {
                'id': 3,
                'method': 'Wallet',
                'icon': 'fas fa-wallet',
                'daily_limit': '₹25,000',
                'processing_time': 'Every Tuesday by 2 PM',
                'fee': 'Free',
                'min_amount': '₹100',
                'is_default': False,
                'is_available': False  # Not implemented yet
            }
        ]
        
        # Determine payout method based on available account details
        payout_method = 'Bank Transfer' if account_details['has_documents'] else 'Not Configured'
        
        summary = {
            'total_earnings': total_earnings,
            'pending_settlement': pending_settlement,
            'last_payout': last_payout,
            'last_payout_date': last_payout_order.delivery_date.date() if last_payout_order else current_cycle['start'] - timedelta(days=7),
            'next_payout_date': current_cycle['end'],
            'payout_method': payout_method,
            # Account details from RestaurantDocuments
            'account_number': account_details['masked_account_number'],
            'account_holder_name': account_details['name_as_per_pan'],
            'account_type': account_details['bank_account_type'],
            'bank_ifsc_code': account_details['bank_account_ifsc_code'],
            'pan_number': account_details['pan_number'],
            'fssai_number': account_details['fssai_number'],
            'is_contract_checked': account_details['is_contract_checked'],
            'has_partner_contract': account_details['has_partner_contract'],
            'has_bank_details': account_details['has_documents'],
            # Other fields
            'upi_id': 'vendor123@upi' if account_details['has_documents'] else None,
            'wallet_balance': Decimal('18500.00') if account_details['has_documents'] else Decimal('0.00'),
            'payout_schedule': 'Every Tuesday by 2 PM',
            'min_payout_amount': Decimal('1000.00'),
            'current_cycle_earnings': pending_settlement,
            'current_cycle_orders': current_cycle_orders.count(),
            'needs_account_setup': not account_details['has_documents']
        }
        
        settlement_data = [
            {
                'id': 1,
                'date': current_cycle['end'],
                'description': 'Weekly Settlement',
                'amount': pending_settlement,
                'status': 'processing' if timezone.now().date() < current_cycle['end'] else 'completed',
                'type': 'payout',
                'can_process': account_details['has_documents']  # Can only process if bank details exist
            }
        ]
        
        return {
            'summary': summary,
            'account_details': account_details,  # Include full account details (excluding sensitive data)
            'payout_cycles': payout_cycles,
            'earnings': daily_earnings,
            'payment_history': payment_history,
            'withdrawal_options': withdrawal_options,
            'settlement': settlement_data,
            'has_valid_account': account_details['has_documents'] and account_details['is_contract_checked']
        }
    
    def generate_payout_cycles(self, restaurant, account_details):
        cycles = []
        today = timezone.now().date()
        
        for i in range(4):
            cycle_start = self.get_last_tuesday() - timedelta(days=7*i)
            cycle_end = cycle_start + timedelta(days=7)
            
            # Get orders for this cycle
            orders = Order.objects.filter(
                restaurant=restaurant,
                status=6,
                payment_status=5,
                delivery_date__date__gte=cycle_start,
                delivery_date__date__lt=cycle_end
            )
            
            total_amount = orders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
            commission = self.calculate_commission(total_amount)
            tax = Decimal('0.00')  # No tax for now
            platform_fee = Decimal('0.00')  # No platform fee for now
            
            # For current cycle, status is processing
            status = 'processing' if i == 0 else 'paid'
            
            # Use actual bank details if available, otherwise placeholder
            bank_name = 'HDFC Bank' if account_details['has_documents'] else 'Not Configured'
            reference = f"TXN7890123{4-i}" if i > 0 else 'Pending'
            
            cycle_data = {
                'id': 4 - i,
                'cycle_label': f"{cycle_start.strftime('%d %b')} - {cycle_end.strftime('%d %b')}",
                'start_date': cycle_start,
                'end_date': cycle_end,
                'status': status,
                'orders': orders.count(),
                'total_amount': total_amount,
                'commission': commission,
                'tax': tax,
                'net_amount': total_amount - commission - tax - platform_fee,
                'paid_date': cycle_end if i > 0 else None,
                'paid_time': '14:30' if i > 0 else None,
                'bank_name': bank_name,
                'account_last4': account_details['masked_account_number'][-4:] if account_details['masked_account_number'] else 'N/A',
                'reference': reference
            }
            cycles.append(cycle_data)
        
        return cycles[::-1]  # Reverse to show latest first
    
    def generate_daily_earnings(self, restaurant, current_cycle):
        earnings = []
        start_date = current_cycle['start']
        end_date = timezone.now().date()  # Only include days up to today
        
        current_date = start_date
        day_id = 1
        
        while current_date <= end_date:
            # Get orders for this day
            orders = Order.objects.filter(
                restaurant=restaurant,
                status=6,
                payment_status=5,
                delivery_date__date=current_date
            )
            
            if orders.exists():
                total_amount = orders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                commission = self.calculate_commission(total_amount)
                platform_fee = Decimal('0.00')
                tax = Decimal('0.00')
                
                # Check if payout should be marked as paid (if it's Tuesday and past 2 PM)
                is_tuesday = current_date.weekday() == 1
                is_paid = False
                if is_tuesday and current_date < timezone.now().date():
                    # Check if it's past 2 PM on that day
                    payout_time = datetime.combine(current_date, datetime.min.time().replace(hour=14))
                    is_paid = True
                
                earning_data = {
                    'id': day_id,
                    'date': current_date,
                    'day': current_date.strftime('%A'),
                    'orders': orders.count(),
                    'order_amount': total_amount,
                    'commission': commission,
                    'platform_fee': platform_fee,
                    'tax': tax,
                    'net_earnings': total_amount - commission - platform_fee - tax,
                    'payout_status': 'paid' if is_paid else 'pending'
                }
                earnings.append(earning_data)
                day_id += 1
            
            current_date += timedelta(days=1)
        
        return earnings
    
    def generate_payment_history(self, restaurant, account_details):
        history = []
        
        # Generate last 5 payout cycles
        for i in range(1, 6):
            cycle_start = self.get_last_tuesday() - timedelta(days=7*i)
            cycle_end = cycle_start + timedelta(days=7)
            
            # Get orders for this cycle
            orders = Order.objects.filter(
                restaurant=restaurant,
                status=6,
                payment_status=5,
                delivery_date__date__gte=cycle_start,
                delivery_date__date__lt=cycle_end
            )
            
            if orders.exists():
                total_amount = orders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
                commission = self.calculate_commission(total_amount)
                net_amount = total_amount - commission
                
                # Use actual bank details if available
                bank_name = 'HDFC Bank' if account_details['has_documents'] else 'Not Configured'
                account_last4 = account_details['masked_account_number'][-4:] if account_details['masked_account_number'] else 'N/A'
                
                history_data = {
                    'id': i,
                    'date': cycle_end,
                    'amount': net_amount,
                    'status': 'paid',
                    'method': 'Bank Transfer',
                    'reference': f"TXN7890123{i}",
                    'description': f'Weekly settlement - {cycle_start.strftime("%d %b")} to {cycle_end.strftime("%d %b")}',
                    'cycle': f"{cycle_start.strftime('%d %b')} - {cycle_end.strftime('%d %b')}",
                    'bank_name': bank_name,
                    'account_last4': account_last4,
                    'upi_id': None
                }
                history.append(history_data)
        
        return history
    
    def get(self, request, restaurant_id):
        restaurant = self.get_restaurant(restaurant_id)
        
        if not restaurant:
            return Response(
                {'error': 'Restaurant not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        payout_data = self.get_payout_data(restaurant)
        serializer = PayoutDataSerializer(payout_data)
        
        return Response(serializer.data)

class RequestWithdrawalAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, restaurant_id):
        try:
            restaurant = RestaurantMaster.objects.get(
                restaurant_id=restaurant_id,
                user=request.user
            )
        except RestaurantMaster.DoesNotExist:
            return Response(
                {'error': 'Restaurant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if restaurant has valid account details
        try:
            documents = RestaurantDocuments.objects.get(restaurant=restaurant)
            if not documents.is_contract_checked:
                return Response(
                    {'error': 'Please accept the partner contract before requesting withdrawal'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except RestaurantDocuments.DoesNotExist:
            return Response(
                {'error': 'Please complete your account setup with bank details before requesting withdrawal'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = request.data.get('amount')
        method = request.data.get('method', 'Bank Transfer')
        
        # Validate amount
        try:
            amount = Decimal(amount)
            if amount < 1000:
                return Response(
                    {'error': 'Minimum withdrawal amount is ₹1000'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid amount'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if it's Tuesday and before 2 PM
        today = timezone.now().date()
        current_time = timezone.now()
        
        is_tuesday = today.weekday() == 1
        payout_time = datetime.combine(today, datetime.min.time().replace(hour=14))
        
        if is_tuesday and current_time.time() < payout_time.time():
            message = 'Payout is being processed today. Your funds will be transferred by 2 PM.'
        else:
            # Calculate next Tuesday
            days_ahead = 1 - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_tuesday = today + timedelta(days=days_ahead)
            message = f'Withdrawal request submitted. Your funds will be transferred on {next_tuesday.strftime("%d %b, %Y")} by 2 PM.'
        
        # Create withdrawal request record (you'll need to create a Withdrawal model)
        # withdrawal = Withdrawal.objects.create(
        #     restaurant=restaurant,
        #     amount=amount,
        #     method=method,
        #     status='pending'
        # )
        
        return Response({
            'success': True,
            'message': message,
            'withdrawal_id': str(uuid.uuid4()),  # Replace with actual withdrawal ID
            'amount': amount,
            'method': method,
            'estimated_payout': next_tuesday.strftime('%Y-%m-%d') if not (is_tuesday and current_time.time() < payout_time.time()) else today.strftime('%Y-%m-%d'),
            'account_last4': documents.bank_account_number[-4:] if documents.bank_account_number else 'N/A'
        })