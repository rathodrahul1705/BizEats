import logging
import uuid
from decimal import Decimal
from datetime import timedelta
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from api.models import Settlement, SettlementOrder, Order

logger = logging.getLogger(__name__)


class SettlementService:
    COMMISSION_RATE = Decimal('0.10')  # 10%

    @staticmethod
    def get_current_weekly_period(reference_date=None):
        if reference_date is None:
            reference_date = timezone.now().date()
        start = reference_date - timedelta(days=reference_date.weekday())
        end = start + timedelta(days=6)
        return start, end

    @staticmethod
    def generate_settlement(restaurant_id, start_date, end_date, force=False):
        """
        Generate a settlement for a given restaurant and date range.
        Returns the created Settlement instance.
        Raises ValidationError with specific messages:
          - "Settlement already exists for this period."
          - "No completed orders found for this period."
        """
        logger.info(
            "Starting settlement generation for restaurant %s from %s to %s (force=%s)",
            restaurant_id, start_date, end_date, force
        )

        # Validate period
        if start_date.weekday() != 0:
            raise ValidationError("Start date must be a Monday.")
        if end_date.weekday() != 6:
            raise ValidationError("End date must be a Sunday.")
        if (end_date - start_date).days != 6:
            raise ValidationError("Period must be exactly 7 days (Monday to Sunday).")

        # Check for existing settlement
        existing = Settlement.objects.filter(
            restaurant_id=restaurant_id,
            start_date=start_date,
            end_date=end_date
        ).first()

        if existing:
            if force:
                with transaction.atomic():
                    existing.delete()
                logger.info("Deleted existing settlement %s due to force=True", existing.settlement_number)
            else:
                raise ValidationError("Settlement already exists for this period.")

        # Fetch completed orders not yet settled
        orders = Order.objects.filter(
            restaurant_id=restaurant_id,
            status=6,  # completed
            order_date__range=(start_date, end_date)
        ).select_related('restaurant')

        if not orders.exists():
            raise ValidationError("No completed orders found for this period.")

        logger.info("Found %d orders for settlement", orders.count())

        # Aggregates
        total_orders = orders.count()
        total_item_gross = Decimal('0.00')
        total_gross = Decimal('0.00')
        total_delivery = Decimal('0.00')
        total_tax = Decimal('0.00')
        total_commission = Decimal('0.00')
        total_payable = Decimal('0.00')
        settlement_orders = []

        for order in orders:
            subtotal = order.subtotal or Decimal('0.00')
            delivery = order.delivery_fee or Decimal('0.00')
            tax = order.tax or Decimal('0.00')
            total_amount = subtotal + delivery + tax

            commission = subtotal * SettlementService.COMMISSION_RATE
            payable = subtotal - commission

            total_item_gross += subtotal
            total_gross += total_amount
            total_delivery += delivery
            total_tax += tax
            total_commission += commission
            total_payable += payable

            settlement_orders.append(
                SettlementOrder(
                    settlement=None,
                    order=order,
                    item_gross_sales=subtotal,
                    gross_sales=total_amount,
                    delivery_charge=delivery,
                    taxes=tax,
                    commission=commission,
                    payable=payable
                )
            )

        adjustments = Decimal('0.00')

        logger.info(
            "Totals for restaurant %s: orders=%d, item_gross=%.2f, gross=%.2f, "
            "commission=%.2f, delivery=%.2f, tax=%.2f, payable=%.2f",
            restaurant_id, total_orders, total_item_gross, total_gross,
            total_commission, total_delivery, total_tax, total_payable
        )

        # Create settlement inside a transaction
        with transaction.atomic():
            settlement = Settlement.objects.create(
                settlement_number=SettlementService._generate_settlement_number(restaurant_id),
                restaurant_id=restaurant_id,
                start_date=start_date,
                end_date=end_date,
                payout_date=end_date + timedelta(days=1),   # <-- NEW: next Monday after the week
                total_orders=total_orders,
                item_gross_sales=total_item_gross,
                gross_sales=total_gross,
                commission=total_commission,
                delivery_charge=total_delivery,
                taxes=total_tax,
                adjustments=adjustments,
                payable_amount=total_payable,
            )

            # Assign settlement to each order and bulk create
            for so in settlement_orders:
                so.settlement = settlement
            SettlementOrder.objects.bulk_create(settlement_orders)

        logger.info(
            "Settlement %s created for restaurant %s with %d orders, payable %.2f, payout on %s",
            settlement.settlement_number, restaurant_id, total_orders, total_payable,
            settlement.payout_date
        )
        return settlement

    @staticmethod
    def _generate_settlement_number(restaurant_id):
        short_uuid = uuid.uuid4().hex[:8].upper()
        return f"SET-{restaurant_id}-{short_uuid}"