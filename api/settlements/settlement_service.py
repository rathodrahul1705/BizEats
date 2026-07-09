from xml.dom import ValidationErr

from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from django.db.models import Sum, Q

from api.models import Settlement

class SettlementService:
    @staticmethod
    def generate_settlement(restaurant_id, start_date, end_date, force=False):
        """
        Generate a settlement for a given restaurant and date range.
        Returns the created Settlement instance.
        Raises ValidationError if settlement already exists or no orders found.
        """
        from .models import Settlement, SettlementOrder, Order  # avoid circular imports
        from datetime import date

        # 1. Validate date range
        if start_date > end_date:
            raise ValidationErr("Start date must be before end date.")

        # 2. Check if settlement already exists
        existing = Settlement.objects.filter(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date
        ).exists()
        if existing and not force:
            raise ValidationErr("Settlement already exists for this period.")

        # 3. Fetch completed orders not yet settled
        orders = Order.objects.filter(
            restaurant_id=restaurant_id,
            status=6,  # Completed
            settlementorder__isnull=True,
            order_date__range=(start_date, end_date)
        ).select_related('restaurant')

        if not orders.exists():
            raise ValidationErr("No completed orders found for this period.")

        # 4. Calculate totals
        total_orders = orders.count()
        gross_sales = orders.aggregate(total=Sum('order_total'))['total'] or Decimal('0.00')
        # Assuming commission is stored in order (e.g., order.commission) or computed from order total
        # Here we compute commission as per platform rules; we may have order-level commission field
        # For this example, we assume we have order.commission and order.delivery_charge
        commission_total = orders.aggregate(total=Sum('commission'))['total'] or Decimal('0.00')
        delivery_total = orders.aggregate(total=Sum('delivery_charge'))['total'] or Decimal('0.00')
        # Taxes might be part of order total or separate; we compute from order.tax_amount
        tax_total = orders.aggregate(total=Sum('tax_amount'))['total'] or Decimal('0.00')

        # Adjustments (if any) – we can add a placeholder; for now 0
        adjustments = Decimal('0.00')

        # Payable = Gross sales - commission - delivery charge? 
        # According to spec: Restaurant gets gross sales minus commission; delivery charge belongs to platform.
        # So payable = gross_sales - commission - delivery_charge (if platform keeps delivery)
        # But spec says: "If delivery belongs to the platform, don't add delivery to restaurant settlement."
        # So we subtract delivery_charge as well.
        payable = gross_sales - commission_total - delivery_total - tax_total + adjustments  # tax may be on customer, but we may need to decide
        # The spec example: Order 500, delivery 40, tax 25, commission 50 => restaurant gets 450? Actually they said: Subtotal 500 - Commission 50 = 450. They didn't subtract delivery and tax. So maybe delivery and tax are not part of restaurant payable? Let's follow spec: "If delivery belongs to the platform, don't add delivery to restaurant settlement." So restaurant does not get delivery fee. Similarly taxes may be on customer and not part of restaurant share. So payable = gross_sales - commission. Let's clarify: In the example, they did not subtract delivery or tax; they only subtracted commission. So we should compute payable = gross_sales - commission. However, we need to know the exact definition. To match the spec's example, we'll do: payable = gross_sales - commission.
        # But we also have delivery_charge field; we may store it but not deduct unless business logic says so.
        # Let's follow the spec's calculation: payable = gross_sales - commission.
        # But the spec also says "If delivery belongs to the platform, don't add delivery to restaurant settlement." So we exclude delivery.
        # We'll compute: payable = gross_sales - commission - adjustments (if any)
        # We'll keep tax separate; not deducted from restaurant.
        # So:
        payable = gross_sales - commission_total  # - delivery_charge? Let's assume commission covers all platform fees.
        # Actually the spec says: "Commission = 10% 300; Restaurant Payable = 2700" for 3000 gross. So yes, payable = gross - commission.
        # We'll ignore delivery and tax in payable.

        # 5. Generate settlement number
        settlement_number = SettlementService.generate_settlement_number(restaurant_id)

        # 6. Create settlement and order mappings within atomic transaction
        with transaction.atomic():
            settlement = Settlement.objects.create(
                settlement_number=settlement_number,
                restaurant_id=restaurant_id,
                start_date=start_date,
                end_date=end_date,
                total_orders=total_orders,
                gross_sales=gross_sales,
                commission=commission_total,
                delivery_charge=delivery_total,  # store for reference
                taxes=tax_total,
                adjustments=adjustments,
                payable_amount=payable,
                status=Settlement.Status.GENERATED
            )

            # Create SettlementOrder entries
            settlement_orders = []
            for order in orders:
                # For each order, we freeze its amounts
                # commission might be already computed in order; we'll use order.commission
                # But we need to compute payable per order = order.amount - order.commission (if any)
                order_payable = order.order_total - (order.commission or Decimal('0.00'))
                settlement_orders.append(
                    SettlementOrder(
                        settlement=settlement,
                        order=order,
                        order_amount=order.order_total,
                        commission=order.commission or Decimal('0.00'),
                        payable=order_payable
                    )
                )
            SettlementOrder.objects.bulk_create(settlement_orders)

        return settlement

    @staticmethod
    def generate_settlement_number(restaurant_id):
        # Format: SET-YYYYMMDD-XXXX (where XXXX is a sequence per restaurant)
        # Or use a simple increment: SET-<timestamp>-<restaurant_id>
        # We'll generate based on current date and a random/sequence suffix.
        from django.utils import timezone
        now = timezone.now()
        date_str = now.strftime('%Y%m%d')
        # Get latest settlement for this restaurant and increment
        latest = Settlement.objects.filter(restaurant_id=restaurant_id).order_by('-id').first()
        if latest:
            last_num = int(latest.settlement_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        return f"SET-{date_str}-{restaurant_id:04d}-{new_num:04d}"
        # Or simpler: f"SET-{date_str}-{restaurant_id:04d}-{new_num:04d}"