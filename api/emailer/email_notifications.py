from django.core.mail import send_mail, EmailMessage
from api.models import Cart, Order, RestaurantMenu, User, UserDeliveryAddress
from decouple import config
from decimal import Decimal, ROUND_UP, ROUND_HALF_UP
from django.conf import settings

def get_order_email_content(order):
    status_messages = {
        1: {
            "subject": f"Order #{order.order_number} is pending confirmation",
            "message": f"Your order has been placed and is currently pending confirmation from the <strong>{order.restaurant.restaurant_name}</strong>."
        },
        2: {
            "subject": f"Order #{order.order_number} has been confirmed",
            "message": f"Great news! Your order has been confirmed by the <strong>{order.restaurant.restaurant_name}</strong> and will be prepared shortly."
        },
        3: {
            "subject": f"Order #{order.order_number} is being prepared",
            "message": f"Your order is now being freshly prepared by the <strong>{order.restaurant.restaurant_name}</strong> chef."
        },
        4: {
            "subject": f"Order #{order.order_number} is ready for delivery/pickup",
            "message": "Your food is ready! It will soon be picked up or delivered."
        },
        5: {
            "subject": f"Order #{order.order_number} is on the way",
            "message": "Hang tight! Your order is on its way to your doorstep."
        },
        6: {
            "subject": f"Order #{order.order_number} has been delivered",
            "message": "Enjoy your meal! Your order has been successfully delivered."
        },
        7: {
            "subject": f"Order #{order.order_number} has been cancelled",
            "message": "Unfortunately, your order has been cancelled. Please contact support if you have any questions."
        },
        8: {
            "subject": f"Order #{order.order_number} has been refunded",
            "message": "Your order has been refunded. The amount will reflect in your account soon."
        },
    }

    return status_messages.get(order.status, {
        "subject": f"Order #{order.order_number} status update",
        "message": "There is an update regarding your order. Please check your order details."
    })

def send_order_status_email(order):
    
    user = User.objects.filter(id=order.user_id).first()
    cart_items = Cart.objects.filter(order_number=order.order_number)
    delivery_address = UserDeliveryAddress.objects.filter(id=order.delivery_address_id).first()

    address_parts = filter(None, [
        delivery_address.street_address if delivery_address else "",
        delivery_address.city if delivery_address else "",
        delivery_address.state if delivery_address else "",
        delivery_address.zip_code if delivery_address else "",
        delivery_address.country if delivery_address else "",
    ])
    address_string = ", ".join(address_parts)

    item_rows = ""
    subtotal = Decimal("0.00")

    for item in cart_items:
        menu_item = RestaurantMenu.objects.filter(id=item.item_id).first()
        price = menu_item.item_price if menu_item else Decimal("0.00")
        item_total = price * item.quantity
        subtotal += item_total

        item_rows += f"""
            <tr>
                <td style="padding: 10px 0;">{item.quantity} x {menu_item.item_name if menu_item else "Unknown Item"}</td>
                <td style="padding: 10px 0; text-align: right;">₹{item_total:.2f}</td>
            </tr>
        """

    handling_fee = Decimal("0.00")
    delivery_fee = order.delivery_fee or Decimal("0.00")
    total_before_discount = subtotal + handling_fee + delivery_fee
    raw_discount = total_before_discount * Decimal("0.10")
    discount = raw_discount.quantize(Decimal("1."), rounding=ROUND_HALF_UP)
    grand_total = (total_before_discount - discount).quantize(Decimal("1."), rounding=ROUND_HALF_UP)

    email_content = get_order_email_content(order)
    subject = email_content["subject"]
    message_text = email_content["message"]
    restaurant_name = order.restaurant.restaurant_name

    html_message = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; }}
            .container {{
                background-color: #fff;
                max-width: 650px;
                margin: 30px auto;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.07);
                border-top: 6px solid #ff6600;
            }}
            .header {{ text-align: center; }}
            .header img {{ max-height: 60px; }}
            .sub-header {{ text-align: center; font-size: 15px; color: #666; margin: 20px 0; }}
            .section-title {{ font-size: 16px; font-weight: bold; margin-top: 25px; }}
            table {{ width: 100%; border-collapse: collapse; }}
            td {{ font-size: 14px; border-bottom: 1px solid #eee; }}
            .summary-table td {{ padding: 10px 0; }}
            .summary-table tr:last-child td {{
                font-weight: bold;
                font-size: 16px;
                border-top: 1px solid #ccc;
                padding-top: 12px;
                color: #333;
            }}
            .track-button {{ text-align: center; margin: 20px 0; }}
            .track-button a {{
                background-color: #ff6600;
                color: #fff;
                padding: 12px 25px;
                font-weight: bold;
                border-radius: 6px;
                text-decoration: none;
            }}
            .footer {{ text-align: center; font-size: 13px; color: #aaa; margin-top: 40px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://eatoor.com/eatoorweb.png" alt="Eatoor Logo">
            </div>
            <div class="sub-header">Order Update Notification</div>

            <p>Greetings from Eatoor</p>
            <p>{message_text}</p>

            <div class="track-button">
                <a href="{settings.REACT_APP_BASE_URL}/track-order">Track Your Order</a>
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
                    <td>Discount (10%)</td>
                    <td style="text-align: right;">-₹{discount:.2f}</td>
                </tr>
                <tr>
                    <td>Grand Total</td>
                    <td style="text-align: right;">₹{grand_total:.2f}</td>
                </tr>
            </table>

            <p style="margin-top: 25px;">Thank you for choosing <strong>{restaurant_name}</strong> via Eatoor!</p>

            <div class="footer">This is an automated email. Please do not reply.</div>
        </div>
    </body>
    </html>
    """

    recipient_list = list(filter(None, [
        user.email if user else None,
        getattr(order.restaurant.owner_details, "owner_email_address", None)
    ]))

    if recipient_list:
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

def send_contact_email(name, email, message):
    subject = f"New Contact Us Message from {name}"
    body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [settings.DEFAULT_FROM_EMAIL])