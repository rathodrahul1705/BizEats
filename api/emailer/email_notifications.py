from django.core.mail import send_mail, EmailMessage
from django.conf import settings
from api.models import Cart, Order, RestaurantMenu, User, UserDeliveryAddress
from decimal import Decimal
from decouple import config

def send_order_status_email(order):
    user = User.objects.filter(id=order.user_id).first()
    cart_items = Cart.objects.filter(order_number=order.order_number)
    delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()

    address_string = ""
    if delivery_address:
        address_parts = [
            delivery_address.street_address,
            delivery_address.city,
            delivery_address.state,
            delivery_address.zip_code,
            delivery_address.country
        ]
        address_string = ", ".join([part for part in address_parts if part])

    item_rows = ""
    subtotal = Decimal(0)

    for item in cart_items:
        menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
        price = menu_item.item_price if menu_item else Decimal(0)
        item_total = price * item.quantity
        subtotal += item_total

        item_rows += f"""
            <tr>
                <td style="padding: 10px 0;">{item.quantity} x {menu_item.item_name if menu_item else "Unknown"}</td>
                <td style="padding: 10px 0; text-align: right;">₹{item_total:.2f}</td>
            </tr>
        """

    handling_fee = Decimal("0.00")
    delivery_fee = Decimal("0.00")
    grand_total = subtotal + handling_fee + delivery_fee

    subject = f"Order #{order.order_number} has been {order.get_status_display()}"
    restaurant_name = order.restaurant.restaurant_name
    order_status = order.get_status_display().lower()
    order_number = order.order_number

    html_message = f"""
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                background-color: #fff;
                max-width: 650px;
                margin: 30px auto;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
                border-top: 6px solid #ff6600;
            }}
            .header {{
                text-align: center;
                font-size: 24px;
                font-weight: bold;
                color: #ff6600;
                margin-bottom: 10px;
            }}
            .sub-header {{
                text-align: center;
                font-size: 15px;
                color: #666;
                margin-bottom: 20px;
            }}
            .section-title {{
                font-size: 16px;
                font-weight: bold;
                margin: 25px 0 10px;
                color: #444;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
            }}
            td {{
                font-size: 14px;
                border-bottom: 1px solid #eee;
            }}
            .summary-table td {{
                padding: 10px 0;
            }}
            .summary-table tr:last-child td {{
                font-weight: bold;
                font-size: 16px;
                border-top: 1px solid #ccc;
                padding-top: 12px;
                color: #333;
            }}
            .footer {{
                text-align: center;
                font-size: 13px;
                color: #aaa;
                margin-top: 40px;
            }}
            .track-button {{
                text-align: center;
                margin: 20px 0;
            }}
            .track-button a {{
                display: inline-block;
                background-color: #ff6600;
                color: #fff;
                padding: 12px 25px;
                font-size: 15px;
                font-weight: bold;
                border-radius: 6px;
                text-decoration: none;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">Eatoor</div>
            <div class="sub-header">Order Update Notification</div>

            <p>Greetings from Eatoor</p>
            <p>Your Order id: <strong>#{order_number}</strong> has been <strong>{order_status}</strong>.</p>

            <div class="track-button">
                <a href="{config("REACT_APP_BASE_URL")}/track-order">Track Your Order</a>
            </div>

            <div class="section-title">Delivery Address:</div>
            <p>{address_string}</p>

            <div class="section-title">Order Items:</div>
            <table class="summary-table">
                {item_rows}
            </table>

            <div class="section-title">Order Summary:</div>
            <table class="summary-table">
                <tr>
                    <td>Item Bill</td>
                    <td style="text-align: right;">₹{subtotal:.2f}</td>
                </tr>
                <tr>
                    <td>Handling Fee</td>
                    <td style="text-align: right;">₹{handling_fee:.2f}</td>
                </tr>
                <tr>
                    <td>Delivery Fee</td>
                    <td style="text-align: right;">₹{delivery_fee:.2f}</td>
                </tr>
                <tr>
                    <td>Grand Total</td>
                    <td style="text-align: right;">₹{grand_total:.2f}</td>
                </tr>
            </table>

            <p style="margin-top: 25px;">Thank you for using <strong>{restaurant_name}</strong> via Eatoor!</p>

            <div class="footer">This is an automated email. Please do not reply.</div>
        </div>
    </body>
    </html>
    """

    # Send to both customer and restaurant owner
    recipient_list = [user.email, order.restaurant.owner_details.owner_email_address]

    send_mail(
        subject=subject,
        message="This is an HTML-only email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipient_list,
        html_message=html_message,
        fail_silently=False,
    )




def send_otp_email(user, subject, otp_type):

    if otp_type == "login":
        heading = "🔐 Verify Your Login"
        intro = "We noticed you’re trying to log in. Use the code below to continue."
    elif otp_type == "registration":
        heading = "🎉 Welcome to Eatoor!"
        intro = "We're excited to have you! Use the code below to verify your account."
    else:
        heading = "🔐 Verify Your Account"
        intro = "Use the code below to continue."

    email_content = f"""
    <html>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background-color: #e65c00; padding: 24px; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; font-family: Arial, sans-serif;">
                        <span style="color: black;">Eat</span><span style="color: white;">oor</span>
                    </div>
                    <h1 style="color: white; margin: 12px 0 0; font-size: 26px;">{heading}</h1>
                    <p style="color: white; font-size: 16px; margin-top: 6px;">{intro}</p>
                </div>
                <div style="padding: 24px;">
                    <p style="font-size: 16px; color: #333;">Hi <strong>{user.full_name}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) is:</p>
                    <div style="margin: 20px 0; text-align: center;">
                        <span style="display: inline-block; background-color: #e65c00; color: white; padding: 12px 24px; font-size: 24px; font-weight: bold; border-radius: 6px;">
                            {user.otp}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #555;">
                        This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.
                    </p>
                    <p style="font-size: 14px; color: #555; margin-top: 16px;">
                        Thank you for choosing <strong>Eatoor</strong> – where great food meets great service! 🍽️
                    </p>
                    <p style="font-size: 14px; color: #999; margin-top: 24px;">– The Eatoor Team</p>
                </div>
            </div>
        </body>
    </html>
    """

    send_mail(
        subject,
        message="This is an HTML-only email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=email_content,
        fail_silently=False,
    )


