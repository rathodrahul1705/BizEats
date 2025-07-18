import logging
from background_task import background
from django.utils import timezone
from api.delivery.porter_views import porter_track_booking
from api.emailer.email_notifications import send_order_status_email
from api.models import Order, PorterOrder
from api.order.track_order import generate_invoice_pdf

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

                        # Update PorterOrder's eatoor_delivery_status if order status is 1 (Preparing)
                        if order_status == 1:
                            porter_order.eatoor_delivery_status = 1
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
