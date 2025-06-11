import os
from django.core.mail import send_mail, EmailMessage
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from api.models import Cart, Coupon, Order, RestaurantDocuments, RestaurantLocation, RestaurantMenu, User, UserDeliveryAddress
from decouple import config
from decimal import Decimal, ROUND_UP, ROUND_HALF_UP
from django.conf import settings
from num2words import num2words
import base64

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
        price = item.item_price if item.item_price is not None else Decimal(0)
        item_total = price
        buy_one_get_one_free = item.buy_one_get_one_free
        subtotal += item_total

        item_rows += f"""
            <tr>
                <td style="padding: 10px 0;">
                    {item.quantity} x {menu_item.item_name if menu_item else "Unknown Item"}
                    {" <span style='color: green; font-weight: bold;'>(Buy 1 Get 1 Free)</span>" if buy_one_get_one_free else ""}
                </td>
                <td style="padding: 10px 0; text-align: right;">₹{item_total:.2f}</td>
            </tr>
        """


    handling_fee = Decimal("0.00")

    if order.coupon_id:
        coupon = Coupon.objects.get(id=order.coupon_id)

        if coupon:
            coupon_code = coupon.code
            coupon_code_text = f"Discount coupon ({coupon_code})"
        else:
            # Apply a 10% discount
            total_before_discount = subtotal + order.delivery_fee
            discount = total_before_discount * Decimal('0.10')
            coupon_code = None
            coupon_code_text = "Discount (10%)"
    else:
        # Apply a 10% discount
        total_before_discount = subtotal + order.delivery_fee
        discount = total_before_discount * Decimal('0.10')
        coupon_code = None
        coupon_code_text = "Discount (10%)"
    
    discount_amount = order.coupon_discount if order.coupon_discount else round(discount)
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
                <a href="{settings.REACT_APP_BASE_URL}/track-order/{order.order_number}">Track Your Order</a>
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
                    <td>Item Total</td>
                    <td style="text-align: right;">₹{subtotal:.2f}</td>
                </tr>
                <tr>
                    <td>Delivery Fee</td>
                    <td style="text-align: right;">₹{order.delivery_fee:.2f}</td>
                </tr>
                <tr>
                    <td>{coupon_code_text}</td>
                    <td style="text-align: right;">-₹{discount_amount:.2f}</td>
                </tr>
                <tr>
                    <td>Grand Total</td>
                    <td style="text-align: right;">₹{order.total_amount:.2f}</td>
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

        email = EmailMessage(
            subject=subject,
            body="This is an HTML-only email.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
        )
        email.content_subtype = "html"
        email.body = html_message

        if order.invoice_path:
            try:
                email.attach_file(order.invoice_path.path)
            except Exception as e:
                print("Attachment error:", e)

        email.send(fail_silently=False)

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


def get_invoice_html(order_details):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    logo_path = os.path.join(BASE_DIR, "../static/img/eatoorweb.png")
    sign_path = os.path.join(BASE_DIR, "../static/img/authorized_sign.jpg")

    try:
        with open(logo_path, "rb") as f:
            logo_base64 = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        logo_base64 = ""
        print("Logo load error:", e)

    try:
        with open(sign_path, "rb") as f:
            sign_base64 = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        sign_base64 = ""
        print("Signature load error:", e)

    items = order_details.get("cart_items", [])
    restaurant = order_details.get("restaurant", {})
    user = order_details.get("user", {})
    address = order_details.get("delivery_address", {})

    subtotal = float(order_details.get("subtotal", 0))
    delivery_fee = float(order_details.get("delivery_fee", 0))
    tax = float(order_details.get("tax", 0))
    
    # Calculate 10% discount on (subtotal + delivery fee)
    calculated_discount = round((subtotal + delivery_fee) * 0.10, 2)

    # Get coupon_discount value from order_details (default to 0.0 if not present or invalid)
    try:
        coupon_discount = float(order_details.get("coupon_discount", 0.0))
    except (ValueError, TypeError):
        coupon_discount = 0.0

    # If coupon_discount is zero, use calculated 10% discount
    if coupon_discount == 0.0:
        coupon_discount = calculated_discount
    
    total_subtotal_amount = subtotal + delivery_fee
    total = float(order_details.get("total_amount", subtotal + delivery_fee + tax - coupon_discount))

    amount_words = num2words(total, to='currency', lang='en_IN')

    html = f"""
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Inter', sans-serif;
            }}
            body {{
                background: #ffffff;
                color: #333333;
                line-height: 1.5;
                font-size: 14px;
            }}
            .invoice-container {{
                max-width: 800px;
                margin: 0 auto;
                padding: 30px;
                background: #ffffff;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 2px solid #e65c00;
                padding-bottom: 20px;
            }}
            .invoice-title {{
                font-size: 24px;
                font-weight: 700;
                color: #e65c00;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .logo {{
                height: 50px;
            }}
            .info-section {{
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                margin-bottom: 30px;
            }}
            .info-box {{
                flex: 1;
                min-width: 250px;
                background: #f8f9fa;
                border-radius: 5px;
                padding: 15px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }}
            .info-box h3 {{
                font-size: 15px;
                font-weight: 600;
                color: #e65c00;
                margin-bottom: 10px;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }}
            .info-row {{
                display: flex;
                margin-bottom: 5px;
            }}
            .info-label {{
                font-weight: 500;
                min-width: 100px;
                color: #555;
            }}
            .info-value {{
                font-weight: 400;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 13px;
            }}
            th {{
                background: #e65c00;
                color: white;
                font-weight: 500;
                padding: 10px 12px;
                text-align: left;
            }}
            td {{
                padding: 10px 12px;
                border-bottom: 1px solid #f0f0f0;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            .totals-table {{
                width: 300px;
                margin-left: auto;
                margin-top: 20px;
                border: 1px solid #eee;
            }}
            .totals-table td {{
                padding: 8px 12px;
            }}
            .totals-table tr:last-child td {{
                font-weight: 600;
                background: #f8f8f8;
                border-top: 1px solid #ddd;
            }}
            .amount-words {{
                margin-top: 15px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 5px;
                font-size: 13px;
                color: #555;
            }}
            .signature-section {{
                margin-top: 40px;
                text-align: right;
            }}
            .signature-img {{
                height: 50px;
                margin-top: 10px;
            }}
            .footer {{
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #999;
                border-top: 1px solid #eee;
                padding-top: 15px;
            }}
            .highlight {{
                color: #e65c00;
                font-weight: 600;
            }}
            .discount-note {{
                font-size: 12px;
                color: #666;
                font-style: italic;
            }}
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div>
                    <div class="invoice-title">Tax Invoice</div>
                    <div style="font-size: 12px; color: #777; margin-top: 5px;">Order #{order_details.get("order_number")}</div>
                </div>
                <img src="data:image/png;base64,{logo_base64}" class="logo" alt="Eatoor Logo">
            </div>

            <div class="info-section">
                <div class="info-box">
                    <h3>Restaurant Details</h3>
                    <div class="info-row">
                        <div class="info-label">Name:</div>
                        <div class="info-value">{restaurant.get("name", "")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Address:</div>
                        <div class="info-value">{restaurant.get("full_address", "N/A")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">FSSAI:</div>
                        <div class="info-value">{order_details.get("fssai_number","")}</div>
                    </div>
                </div>

                <div class="info-box">
                    <h3>Invoice Details</h3>
                    <div class="info-row">
                        <div class="info-label">Invoice No:</div>
                        <div class="info-value">EAT{order_details.get("order_number")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Date:</div>
                        <div class="info-value">{order_details.get("order_date")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Order Type:</div>
                        <div class="info-value">Delivery</div>
                    </div>
                </div>

                <div class="info-box">
                    <h3>Customer Details</h3>
                    <div class="info-row">
                        <div class="info-label">Name:</div>
                        <div class="info-value">{user.get("full_name", "")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Address:</div>
                        <div class="info-value">{address.get("full_address", "")}</div>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Rate (₹)</th>
                        <th>Net (₹)</th>
                    </tr>
                </thead>
                <tbody>
    """

    for item in items:
        price = float(item.get("price", 0))
        discount = float(item.get("discount", 0))
        net = price - discount
        # cgst = round(net * 0.025, 2)
        # sgst = round(net * 0.025, 2)
        # total_line = round(net + cgst + sgst, 2)

        html += f"""
                    <tr>
                        <td>{item.get("item_name")}</td>
                        <td>{item.get("quantity")}</td>
                        <td>{price:.2f}</td>
                        <td>{net:.2f}</td>
                    </tr>
        """

    html += f"""
                </tbody>
            </table>

            <table class="totals-table">
                <tr>
                    <td>Item Total:</td>
                    <td style="text-align: right;">₹{subtotal:.2f}</td>
                </tr>
                <tr>
                    <td>Delivery Fee:</td>
                    <td style="text-align: right;">₹{delivery_fee:.2f}</td>
                </tr>

                <tr>
                    <td>Subtotal (Item + Delivery Fee):</td>
                    <td style="text-align: right;">₹{total_subtotal_amount:.2f}</td>
                </tr>

                <tr>
                    <td>Discount (10%):</td>
                    <td style="text-align: right;">-₹{coupon_discount:.2f}</td>
                </tr>
                <tr>
                    <td><span class="highlight">Total Amount:</span></td>
                    <td style="text-align: right;"><span class="highlight">₹{total:.2f}</span></td>
                </tr>
            </table>

            <div class="signature-section">
                <p>For <strong class="highlight">VENSAVOR FOODTECH LLP</strong></p>
                <img src="data:image/png;base64,{sign_base64}" class="signature-img" alt="Signature" />
                <p style="font-size: 12px; color: #777;">Authorized Signatory</p>
            </div>

            <div class="footer">
                <p>Thank you for your order! For any queries, please contact us at <span class="highlight">contact@eatoor.com</span></p>
            </div>
        </div>
    </body>
    </html>
    """

    return html

def get_order_full_details(order_details):
    try:
        # 1. Get Order
        order = get_object_or_404(Order, order_number=order_details.order_number)
        
        # 2. Get User
        user = order.user
        user_data = {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "contact_number": user.contact_number,
            "role": user.get_role_display(),
        }

        # 3. Get Delivery Address (User)
        address = order.delivery_address
        user_address_line = f"{address.street_address}, {address.city}, {address.state}, {address.zip_code}, {address.country}"
        address_data = {
            "full_address": user_address_line,
            "street": address.street_address,
            "city": address.city,
            "state": address.state,
            "zip": address.zip_code,
            "country": address.country,
            "landmark": address.near_by_landmark,
            "latitude": float(address.latitude) if address.latitude else None,
            "longitude": float(address.longitude) if address.longitude else None,
        }

        # 4. Get Restaurant
        restaurant = order.restaurant
        restaurant_data = {
            "name": restaurant.restaurant_name,
            "location": {},
            "full_address": None,
        }

        # 4a. Add Restaurant Location if exists
        try:
            location = restaurant.restaurant_location
            restaurant_address_line = f"{location.shop_no_building or ''} {location.floor_tower or ''} {location.area_sector_locality}, {location.city}, {location.nearby_locality or ''}".strip().replace("  ", " ")
            restaurant_data["location"] = {
                "shop_no_building": location.shop_no_building,
                "floor_tower": location.floor_tower,
                "area_sector_locality": location.area_sector_locality,
                "city": location.city,
                "nearby_locality": location.nearby_locality,
                "latitude": float(location.latitude) if location.latitude else None,
                "longitude": float(location.longitude) if location.longitude else None,
            }
            restaurant_data["full_address"] = restaurant_address_line
        except RestaurantLocation.DoesNotExist:
            pass

        # 4b. Get FSSAI Number from RestaurantDocuments
        fssai_number = None
        try:
            fssai_number = restaurant.documents.fssai_number
        except RestaurantDocuments.DoesNotExist:
            pass

        # 5. Get Cart Items related to this order
        cart_items = Cart.objects.filter(order_number=order_details.order_number)
        cart_data = []
        for item in cart_items:
            cart_data.append({
                "item_id": item.item.id,
                "item_name": item.item.item_name,
                "quantity": item.quantity,
                "price": float(item.item_price or 0),
                "description": item.description,
                "bogo_offer": item.buy_one_get_one_free,
            })

        # 6. Construct Final Response
        data = {
            "order_number": order.order_number,
            "status": order.get_status_display(),
            "payment_status": order.get_payment_status_display(),
            "payment_method": order.get_payment_method_display(),
            "payment_type": order.get_payment_type_display() if order.payment_type else None,
            "subtotal": float(order.subtotal),
            "tax": float(order.tax or 0),
            "delivery_fee": float(order.delivery_fee or 0),
            "coupon_discount": float(order.coupon_discount or 0),
            "total_amount": float(order.total_amount or 0),
            "quantity": order.quantity,
            "special_instructions": order.special_instructions,
            "special_requests": order.special_requests,
            "is_takeaway": order.is_takeaway,
            "order_date": order.order_date,
            "delivery_date": order.delivery_date,
            "user": user_data,
            "delivery_address": address_data,
            "restaurant": restaurant_data,
            "cart_items": cart_data,
            "fssai_number": fssai_number
        }

        return JsonResponse({"status": "success", "data": data}, status=200)

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

