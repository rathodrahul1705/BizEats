import logging
from sqlite3 import IntegrityError
from background_task import background
from django.utils import timezone
from api.delivery.porter_views import porter_track_booking
from api.emailer.email_notifications import send_order_status_email, send_settlement_status_notification
from api.models import Order, PorterOrder,Settlement
from api.order.track_order import generate_invoice_pdf
from celery import shared_task
from datetime import datetime, timedelta
from .models import RestaurantMaster
from api.settlements.settlement_service import SettlementService
from django.core.exceptions import ValidationError
import pytz

logger = logging.getLogger('background_tasks')

@background(schedule=300)  # run 60s from now
def update_order_statuses():
    now = timezone.now()
    logger.info(f"[Order Status Update] Task started at {now}")

    try:
        # Get orders that aren't cancelled and have eatoor_delivery_status=0
        preparing_orders = PorterOrder.objects.exclude(
            status__in=["cancelled"]
        ).filter(
            eatoor_delivery_status=0
        )

        logger.info(f"Found {preparing_orders.count()} PorterOrders to process.")
        if preparing_orders.count() > 0:
            for porter_order in preparing_orders:
                logger.info(f"Processing PorterOrder: {porter_order.order_number} (Booking ID: {porter_order.booking_id})")

                try:
                    track_order_response = porter_track_booking(porter_order.booking_id)
                    status = track_order_response.data['status']
                    logger.info(f"Porter API status for Booking ID {porter_order.booking_id}: {status}")

                    # Fetch corresponding Order
                    order = Order.objects.get(order_number=porter_order.order_number)

                    # Determine order status
                    order_status = None  # Default: Preparing
                    if status == "live":
                        order_status = 5  # On the Way
                    elif status == "ended":
                        order_status = 6  # Delivered
                                            
                    # Update order only if status changed
                    logger.info(f"Updating Order before{order.order_number} to status {order_status}")
                    if order_status is not None:
                        logger.info(f"Updating Order {order.order_number} to status {order_status}")

                        # Generate invoice if order is delivered
                        if order_status == 6:
                            invoice_path = generate_invoice_pdf(order)
                            order.invoice_path = f"order_invoices/{invoice_path['filename']}"
                            logger.info(f"Invoice generated at: {order.invoice_path}")

                        order.status = int(order_status)
                        order.save()
                        logger.info(f"Order {order.order_number} updated successfully.")

                        # Update PorterOrder's eatoor_delivery_status if order status is 1
                        if order_status == 6:
                            porter_order.eatoor_delivery_status = 1
                            porter_order.status = "ended"
                            porter_order.save()
                            logger.info(f"Updated PorterOrder {porter_order.order_number} eatoor_delivery_status to 1")
                            
                        # Send notification email
                        send_order_status_email(order)
                        logger.info(f"Order status email sent for Order {order.order_number}")
                    else:
                        logger.info(f"No status change for Order {order.order_number}. Skipping update.")

                except Exception as inner_ex:
                    logger.error(f"Failed to process PorterOrder {porter_order.order_number}: {str(inner_ex)}", exc_info=True)
        else:
            logger.error(f"No porter details found")
    except Exception as e:
        logger.error(f"Error in update_order_statuses task: {str(e)}", exc_info=True)

    # # Re-schedule the task again
    # logger.info("Rescheduling update_order_statuses task to run after 60 seconds.")
    # update_order_statuses(schedule=180)

@shared_task
def generate_weekly_settlements():
    """
    Celery task to generate weekly settlements for all restaurants.
    For each successfully created settlement, an invoice PDF is generated
    and attached to the settlement record.
    """
    logger.info("Starting weekly settlement generation task.")

    timezone_str = 'Asia/Kolkata'
    tz = pytz.timezone(timezone_str)
    today = datetime.now(tz).date()

    # Week: Monday to Sunday
    start_date = today - timedelta(days=today.weekday())
    end_date = start_date + timedelta(days=6)

    logger.info(f"Settlement period: {start_date} to {end_date}")

    # Use iterator to avoid loading all restaurants at once
    restaurants = RestaurantMaster.objects.all().iterator()

    for restaurant in restaurants:
        restaurant_id = restaurant.restaurant_id
        logger.info(f"Processing restaurant {restaurant_id}")

        try:
            # 1. Generate settlement
            settlement = SettlementService.generate_settlement(
                restaurant_id=restaurant_id,
                start_date=start_date,
                end_date=end_date,
                force=False
            )
            logger.info(
                "Settlement generated for restaurant %s: %s",
                restaurant_id, settlement.settlement_number
            )

            # 2. Generate and attach invoice PDF
            try:
                SettlementService.generate_invoice(settlement)
                logger.info(
                    "Invoice generated for settlement %s",
                    settlement.settlement_number
                )
            except Exception as invoice_error:
                # Log error but do not fail the whole task
                logger.error(
                    "Failed to generate invoice for settlement %s (restaurant %s): %s",
                    settlement.settlement_number, restaurant_id, str(invoice_error),
                    exc_info=True
                )

        except ValidationError as e:
            error_msg = str(e)
            if "already exists" in error_msg.lower():
                logger.info(
                    "Settlement already exists for restaurant %s, skipping.",
                    restaurant_id
                )
            elif "no completed orders" in error_msg.lower():
                logger.info(
                    "No orders for restaurant %s: %s",
                    restaurant_id, error_msg
                )
            else:
                logger.error(
                    "Unexpected ValidationError for restaurant %s: %s",
                    restaurant_id, error_msg
                )

        except IntegrityError as e:
            logger.info(
                "Settlement already exists for restaurant %s (concurrent creation), skipping.",
                restaurant_id
            )

        except Exception as e:
            logger.error(
                "Unexpected error for restaurant %s: %s",
                restaurant_id, e,
                exc_info=True
            )