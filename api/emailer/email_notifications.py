from django.core.mail import send_mail
from django.conf import settings
from api.models import Cart, Order, RestaurantMenu, User
from decimal import Decimal

def send_order_status_email(order):
    user = User.objects.filter(id=order.user_id).first()
    cart_items = Cart.objects.filter(order_number=order.order_number)
    subtotal = Decimal(0)
    item_rows = ""

    for item in cart_items:
        menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
        price = menu_item.item_price if menu_item else Decimal(0)
        item_total = price * item.quantity
        subtotal += item_total

        item_rows += f"""
            <tr>
                <td>{menu_item.item_name if menu_item else "Unknown"}</td>
                <td>{item.quantity}</td>
                <td>₹{price}</td>
                <td>₹{item_total}</td>
            </tr>
        """

    customer_email = user.email
    customer_name = user.full_name
    restaurant_name = order.restaurant.restaurant_name
    order_number = order.order_number
    status_display = order.get_status_display()
    estimated_delivery = order.delivery_date.strftime("%Y-%m-%d %H:%M:%S") if order.delivery_date else "Not available"

    subject = f"Your order #{order_number} is now {status_display}"

    html_message = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
                color: #333;
            }}
            .email-container {{
                background-color: #ffffff;
                border-radius: 8px;
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                border-top: 6px solid #e65c00;
            }}
            .header {{
                background-color: #e65c00;
                color: white;
                padding: 16px 20px;
                border-radius: 6px 6px 0 0;
                text-align: center;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
            }}
            .logo-highlight {{
                color: #fff;
                background-color: #e65c00;
            }}
            h2, h3 {{
                color: #e65c00;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th, td {{
                border-bottom: 1px solid #ddd;
                padding: 10px;
                text-align: left;
            }}
            th {{
                background-color: #f2f2f2;
            }}
            .total {{
                font-weight: bold;
                font-size: 16px;
                text-align: right;
                color: #e65c00;
                margin-top: 10px;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 14px;
                color: #999;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">
                    <span class="logo-highlight">Biz</span><span style="color: #fff;">Eats</span>
                </div>
            </div>

            <p>Hello {customer_name},</p>
            <p>Your food order <strong>#{order_number}</strong> has been updated to the status: <strong>{status_display}</strong>.</p>
            <p><strong>Estimated Delivery:</strong> {estimated_delivery}</p>

            <h3>Order Summary</h3>
            <table>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
                {item_rows}
            </table>

            <p class="total">Subtotal: ₹{subtotal}</p>
            <p class="total">Total: ₹{subtotal}</p>

            <p>Thank you for ordering with us!</p>
            <p>— The {restaurant_name} Team</p>

            <div class="footer">
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

    send_mail(
        subject,
        message="This is an HTML-only email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[customer_email],
        html_message=html_message,
        fail_silently=False,
    )
