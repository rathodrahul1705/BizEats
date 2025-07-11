from datetime import datetime
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
        try:
            coupon = Coupon.objects.get(id=order.coupon_id)
            coupon_code = coupon.code
            coupon_code_text = f"Discount coupon ({coupon_code})"
        except Coupon.DoesNotExist:
            coupon = None
            coupon_code = None
            coupon_code_text = f"Discount"
            discount = Decimal('0.00')
    else:
        coupon = None
        coupon_code = None
        coupon_code_text = f"Discount"
        discount = Decimal('0.00')

    
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
        recipient_list.append("rathodrahul1705@gmail.com")

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
    
    # Get coupon_discount value from order_details (default to 0.0 if not present or invalid)
    try:
        coupon_discount = float(order_details.get("coupon_discount", 0.0))
    except (ValueError, TypeError):
        coupon_discount = 0.0
    
    total = float(order_details.get("total_amount", subtotal + delivery_fee + tax - coupon_discount))

    amount_words = num2words(total, to='currency', lang='en_IN')

    html = f"""<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Invoice - Order #{order_details.get("order_number", "")}</title>
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
                    <div class="invoice-title"><strong>Order Invoice</strong></div>
                    <div style="font-size: 12px; color: #777; margin-top: 5px;">Order #{order_details.get("order_number", "")}</div>
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
                        <div class="info-value">EAT{order_details.get("order_number", "")}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Date:</div>
                        <div class="info-value">{order_details.get("order_date", "")}</div>
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
                        <th>Rate</th>
                        <th>Net</th>
                    </tr>
                </thead>
                <tbody>
    """

    for item in items:
        price = float(item.get("price", 0))
        discount = float(item.get("discount", 0))
        net = price - discount

        html += f"""
                    <tr>
                        <td>{item.get("item_name", "")}</td>
                        <td>{item.get("quantity", 1)}</td>
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
                    <td style="text-align: right;">{subtotal:.2f}</td>
                </tr>
                <tr>
                    <td>Delivery Fee:</td>
                    <td style="text-align: right;">{delivery_fee:.2f}</td>
                </tr>
    """

    if coupon_discount > 0:
        html += f"""
                <tr>
                    <td>Discount:</td>
                    <td style="text-align: right;">-{coupon_discount:.2f}</td>
                </tr>
        """

    html += f"""
                <tr>
                    <td><span class="highlight">Total Amount:</span></td>
                    <td style="text-align: right;"><span class="highlight">{total:.2f}</span></td>
                </tr>
            </table>

            <div class="signature-section">
                <p>For <strong class="highlight">VENSAVOR FOODTECH LLP (FORMERLY KNOWN AS EATOOR)</strong></p>
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

# def generate_coupon_html(coupon, is_vendor=False):
#     """Generate HTML email content for coupon approval workflow"""
#     discount_text = ""
#     if coupon.discount_type == 'percentage':
#         discount_text = f"{coupon.discount_value}% discount"
#     elif coupon.discount_type == 'fixed':
#         discount_text = f"{coupon.discount_value} off"

#     valid_from = coupon.valid_from.strftime('%B %d, %Y') if coupon.valid_from else "immediately"
#     valid_to = coupon.valid_to.strftime('%B %d, %Y') if coupon.valid_to else "no expiration"

#     # Status mapping and colors
#     status_info = {
#         0: {'text': 'Inactive', 'color': '#FF5252'},
#         1: {'text': 'Active', 'color': '#4CAF50'},
#         2: {'text': 'Pending Approval', 'color': '#FFA000'}
#     }
#     current_status = status_info.get(coupon.is_active, status_info[0])

#     # Different content based on recipient (vendor or admin)
#     if is_vendor:
#         header = "Your Coupon Status"
#         subheader = "The status of your coupon created for restaurant"
#         footer = "Please wait for admin approval if status is pending"
#     else:
#         header = "Coupon Approval Request"
#         subheader = f"New coupon created by {coupon.restaurant.restaurant_name if coupon.restaurant else 'a vendor'}"
#         footer = "Please review the coupon details below"
        
#         # Generate approval URL
#         approval_url = f"{settings.REACT_APP_BASE_URL}/vendor-dashboard/coupon/management/{coupon.restaurant.restaurant_id}/"

#     html_content = f"""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <style>
#             body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
#             .coupon-container {{ 
#                 border: 2px dashed #e65c00; 
#                 padding: 20px; 
#                 max-width: 600px; 
#                 margin: 0 auto;
#                 text-align: center;
#                 background-color: #f9f9f9;
#             }}
#             .coupon-code {{
#                 font-size: 24px;
#                 font-weight: bold;
#                 color: #4CAF50;
#                 margin: 15px 0;
#                 padding: 10px;
#                 background-color: #e8f5e9;
#                 border-radius: 5px;
#             }}
#             .coupon-details {{ 
#                 text-align: left; 
#                 margin-top: 20px;
#                 padding: 15px;
#                 background-color: white;
#                 border-radius: 5px;
#             }}
#             .status {{
#                 color: {current_status['color']};
#                 font-weight: bold;
#                 margin: 10px 0;
#                 font-size: 1.1em;
#             }}
#             .footer {{
#                 margin-top: 20px;
#                 font-size: 0.9em;
#                 color: #666;
#             }}
#             .approve-button {{
#                 display: inline-block;
#                 padding: 12px 24px;
#                 margin: 20px 0;
#                 background-color: #e65c00;
#                 color: white;
#                 text-decoration: none;
#                 border-radius: 4px;
#                 font-weight: bold;
#             }}
#             .approve-button:hover {{
#                 background-color: #cc5200;
#             }}
#             .status-badge {{
#                 display: inline-block;
#                 padding: 4px 8px;
#                 border-radius: 12px;
#                 background-color: {current_status['color']}20;  /* 20% opacity */
#                 color: {current_status['color']};
#                 font-size: 0.8em;
#             }}
#         </style>
#     </head>
#     <body>
#         <div class="coupon-container">
#             <h2>{header}</h2>
#             <p>{subheader}</p>
            
#             <div class="status">
#                 Status: <span class="status-badge">{current_status['text']}</span>
#             </div>
            
#             <div class="coupon-code">{coupon.code}</div>
            
#             <div class="coupon-details">
#                 <p><strong>Discount:</strong> {discount_text}</p>
#                 {f'<p><strong>Minimum Order:</strong> {coupon.minimum_order_amount}</p>' if coupon.minimum_order_amount else ''}
#                 <p><strong>Valid:</strong> From {valid_from} to {valid_to}</p>
#                 <p><strong>Max Uses:</strong> {coupon.max_uses if coupon.max_uses else 'Unlimited'}</p>
#                 <p><strong>Created By:</strong> {coupon.restaurant.restaurant_name if coupon.restaurant else 'Vendor'}</p>
#                 <p><strong>Created At:</strong> {coupon.created_at.strftime('%B %d, %Y %H:%M')}</p>
#             </div>
            
#             {'<a href="' + approval_url + '" class="approve-button">Approve Coupon</a>' if not is_vendor and coupon.is_active == 2 else ''}
            
#             <div class="footer">
#                 {footer}
#             </div>
#         </div>
#     </body>
#     </html>
#     """
#     return html_content

# def generate_coupon_status_html(coupon):
#     from django.conf import settings

#     is_approved = coupon.is_active == 1
#     status_text = "Approved" if is_approved else "Rejected"
#     color = "#28a745" if is_approved else "#dc3545"
#     bg_color = "#e6f4ea" if is_approved else "#fdecea"
#     message = (
#         "🎉 Congratulations! Your coupon has been approved and is now live on EATOOR."
#         if is_approved else
#         "⚠️ Unfortunately, your coupon was not approved. Please review the offer details or contact support."
#     )

#     return f"""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <style>
#             body {{
#                 font-family: Arial, sans-serif;
#                 background-color: #f4f4f4;
#                 margin: 0;
#                 padding: 0;
#             }}
#             .email-wrapper {{
#                 max-width: 600px;
#                 margin: 20px auto;
#                 background: #ffffff;
#                 border-radius: 10px;
#                 padding: 20px;
#                 box-shadow: 0 0 8px rgba(0,0,0,0.05);
#             }}
#             .header {{
#                 text-align: center;
#                 font-size: 20px;
#                 font-weight: bold;
#                 color: {color};
#                 margin-bottom: 10px;
#             }}
#             .status-box {{
#                 background-color: {bg_color};
#                 padding: 15px;
#                 border-radius: 8px;
#                 margin-bottom: 20px;
#                 text-align: center;
#                 color: #333;
#                 font-size: 15px;
#             }}
#             .details {{
#                 font-size: 14px;
#                 line-height: 1.6;
#                 color: #333;
#             }}
#             .details p {{
#                 margin: 5px 0;
#             }}
#             .footer {{
#                 text-align: center;
#                 color: #888;
#                 font-size: 12px;
#                 margin-top: 30px;
#             }}
#             @media screen and (max-width: 480px) {{
#                 .email-wrapper {{
#                     padding: 15px;
#                 }}
#                 .header {{
#                     font-size: 18px;
#                 }}
#             }}
#         </style>
#     </head>
#     <body>
#         <div class="email-wrapper">
#             <div class="header">Coupon {status_text}</div>
#             <div class="status-box">{message}</div>
#             <div class="details">
#                 <p><strong>Coupon Code:</strong> {coupon.code}</p>
#                 <p><strong>Discount Type:</strong> {coupon.get_offer_type_display()}</p>
#                 <p><strong>Discount Value:</strong> ₹{coupon.discount_value}</p>
#                 <p><strong>Restaurant:</strong> {coupon.restaurant.restaurant_name}</p>
#                 <p><strong>Valid From:</strong> {coupon.valid_from.strftime('%B %d, %Y')}</p>
#                 <p><strong>Valid Till:</strong> {coupon.valid_to.strftime('%B %d, %Y')}</p>
#             </div>
#             <div class="footer">
#                 If you have questions, contact us at <a href="mailto:{settings.DEFAULT_FROM_EMAIL}">{settings.DEFAULT_FROM_EMAIL}</a><br><br>
#                 – Team EATOOR
#             </div>
#         </div>
#     </body>
#     </html>
#     """



def generate_coupon_html(coupon, is_vendor=False):
    """Generate modern HTML email for coupon approval workflow"""
    # Discount text
    discount_text = ""
    if coupon.discount_type == 'percentage':
        discount_text = f"{coupon.discount_value}% OFF"
    elif coupon.discount_type == 'fixed':
        discount_text = f"{coupon.discount_value} OFF"

    # Date formatting
    valid_from = coupon.valid_from.strftime('%b %d, %Y') if coupon.valid_from else "Now"
    valid_to = coupon.valid_to.strftime('%b %d, %Y') if coupon.valid_to else "No expiration"

    # Status information
    status_info = {
        0: {'text': 'Reject', 'class': 'inactive', 'color': '#E53E3E'},
        1: {'text': 'Approved', 'class': 'active', 'color': '#38A169'},
        2: {'text': 'Pending Approval', 'class': 'pending_approval', 'color': '#DD6B20'}
    }
    current_status = status_info.get(coupon.is_active, status_info[0])

    # Email content
    if is_vendor:
        header = f"Your Coupon Status Update"
        subheader = f"Status of your coupon for {coupon.restaurant.restaurant_name if coupon.restaurant else 'your restaurant'}"
        footer = "You'll be notified when admin reviews your coupon"
    else:
        header = "New Coupon Approval Request"
        subheader = f"Created by {coupon.restaurant.restaurant_name if coupon.restaurant else 'a vendor'}"
        footer = "Please review below and take action"
        approval_url = f"{settings.REACT_APP_BASE_URL}/vendor-dashboard/coupon/management/{coupon.restaurant.restaurant_id}/"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Modern CSS with responsive design */
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                line-height: 1.5;
                margin: 0;
                padding: 0;
                background-color: #F8FAFC;
                color: #1A202C;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                text-align: center;
                padding: 30px 0 20px;
            }}
            .logo {{
                height: 40px;
                margin-bottom: 20px;
            }}
            .card {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
                overflow: hidden;
                margin-bottom: 30px;
            }}
            .card-header {{
                background: linear-gradient(135deg, #FF6B00, #E05D00);
                color: white;
                padding: 25px;
                text-align: center;
            }}
            .card-header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 700;
            }}
            .card-header p {{
                margin: 8px 0 0;
                opacity: 0.9;
                font-size: 16px;
            }}
            .card-body {{
                padding: 25px;
            }}
            .status-badge {{
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                background-color: {current_status['color']}15;
                color: {current_status['color']};
                margin: 10px 0;
                font-size: 14px;
            }}
            .coupon-code {{
                font-size: 32px;
                font-weight: 700;
                color: #E05D00;
                text-align: center;
                margin: 25px 0;
                padding: 15px;
                background-color: #FFF5F0;
                border-radius: 8px;
                letter-spacing: 1px;
                border: 2px dashed #FF9E66;
            }}
            .detail-row {{
                display: flex;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #EDF2F7;
            }}
            .detail-label {{
                font-weight: 600;
                color: #2D3748;
                min-width: 150px;
            }}
            .detail-value {{
                color: #4A5568;
            }}
            .action-btn {{
                display: block;
                width: 100%;
                padding: 16px;
                margin: 30px 0 20px;
                background: linear-gradient(135deg, #FF6B00, #E05D00);
                color: white;
                text-align: center;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s;
            }}
            .action-btn:hover {{
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(224, 93, 0, 0.2);
            }}
            .footer {{
                text-align: center;
                font-size: 14px;
                color: #718096;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E2E8F0;
            }}
            @media (max-width: 480px) {{
                .email-container {{
                    padding: 15px;
                }}
                .card-header h1 {{
                    font-size: 20px;
                }}
                .coupon-code {{
                    font-size: 24px;
                    padding: 12px;
                }}
                .detail-row {{
                    flex-direction: column;
                }}
                .detail-label {{
                    margin-bottom: 4px;
                    min-width: auto;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <!-- Logo placeholder - replace with actual logo in production -->
                <div class="logo" style="font-weight: 700; font-size: 28px; color: #FF6B00;">EATOOR</div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h1>{header}</h1>
                    <p>{subheader}</p>
                </div>
                
                <div class="card-body">
                    <div class="coupon-code">Status: {current_status['text']}</div>
                    
                    <div class="coupon-code">{coupon.code}</div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Discount:</span>
                        <span class="detail-value">{discount_text}</span>
                    </div>
                    {f'<div class="detail-row"><span class="detail-label">Minimum Order:</span><span class="detail-value">{coupon.minimum_order_amount}</span></div>' if coupon.minimum_order_amount else ''}
                    <div class="detail-row">
                        <span class="detail-label">Valid Period:</span>
                        <span class="detail-value">{valid_from} - {valid_to}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Max Uses:</span>
                        <span class="detail-value">{coupon.max_uses if coupon.max_uses else 'Unlimited'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created By:</span>
                        <span class="detail-value">{coupon.restaurant.restaurant_name if coupon.restaurant else 'Vendor'}</span>
                    </div>
                    
                    {'<a href="' + approval_url + '" class="action-btn">Review & Approve Coupon</a>' if not is_vendor and coupon.is_active == 2 else ''}
                </div>
            </div>
            
            <div class="footer">
                {footer}<br><br>
                © {datetime.now().year} Eatoor. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return html


def generate_coupon_status_html(coupon):
    """Generate modern HTML for coupon status notification"""
    is_approved = coupon.is_active == 1
    status_text = "APPROVED" if is_approved else "REJECTED"
    status_color = "#38A169" if is_approved else "#E53E3E"
    
    message = (
        "Your coupon has been approved and is now live on our platform!"
        if is_approved else
        "Your coupon submission didn't meet our current requirements."
    )
    
    # Date formatting
    valid_from = coupon.valid_from.strftime('%b %d, %Y') if coupon.valid_from else "Immediately"
    valid_to = coupon.valid_to.strftime('%b %d, %Y') if coupon.valid_to else "No expiration"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Reusing the same modern CSS from generate_coupon_html */
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                line-height: 1.5;
                margin: 0;
                padding: 0;
                background-color: #F8FAFC;
                color: #1A202C;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                text-align: center;
                padding: 30px 0 20px;
            }}
            .logo {{
                height: 40px;
                margin-bottom: 20px;
            }}
            .card {{
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
                overflow: hidden;
                margin-bottom: 30px;
            }}
            .card-header {{
                background: linear-gradient(135deg, #FF6B00, #E05D00);
                color: white;
                padding: 25px;
                text-align: center;
            }}
            .card-header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 700;
            }}
            .card-header p {{
                margin: 8px 0 0;
                opacity: 0.9;
                font-size: 16px;
            }}
            .card-body {{
                padding: 25px;
            }}
            .status-badge {{
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                background-color: {status_color}15;
                color: {status_color};
                margin: 10px 0;
                font-size: 14px;
            }}
            .coupon-code {{
                font-size: 32px;
                font-weight: 700;
                color: #E05D00;
                text-align: center;
                margin: 25px 0;
                padding: 15px;
                background-color: #FFF5F0;
                border-radius: 8px;
                letter-spacing: 1px;
                border: 2px dashed #FF9E66;
            }}
            .detail-row {{
                display: flex;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #EDF2F7;
            }}
            .detail-label {{
                font-weight: 600;
                color: #2D3748;
                min-width: 150px;
            }}
            .detail-value {{
                color: #4A5568;
            }}
            .footer {{
                text-align: center;
                font-size: 14px;
                color: #718096;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E2E8F0;
            }}
            @media (max-width: 480px) {{
                .email-container {{
                    padding: 15px;
                }}
                .card-header h1 {{
                    font-size: 20px;
                }}
                .coupon-code {{
                    font-size: 24px;
                    padding: 12px;
                }}
                .detail-row {{
                    flex-direction: column;
                }}
                .detail-label {{
                    margin-bottom: 4px;
                    min-width: auto;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <!-- Logo placeholder - replace with actual logo in production -->
                <div class="logo" style="font-weight: 700; font-size: 28px; color: #FF6B00;">EATOOR</div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h1>Coupon {status_text.capitalize()}</h1>
                    <p>{message}</p>
                </div>
                
                <div class="card-body">                    
                    <div class="coupon-code">{status_text}</div>
                    <div class="coupon-code">{coupon.code}</div>
                    <div class="detail-row">
                        <span class="detail-label">Discount:</span>
                        <span class="detail-value">{'%' if coupon.discount_type == 'percentage' else ''}{coupon.discount_value} OFF</span>
                    </div>
                    {f'<div class="detail-row"><span class="detail-label">Minimum Order:</span><span class="detail-value">{coupon.minimum_order_amount}</span></div>' if coupon.minimum_order_amount else ''}
                    <div class="detail-row">
                        <span class="detail-label">Valid Period:</span>
                        <span class="detail-value">{valid_from} - {valid_to}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Restaurant:</span>
                        <span class="detail-value">{coupon.restaurant.restaurant_name}</span>
                    </div>
                    
                    <div style="margin-top: 30px; padding: 20px; background-color: #F8FAFC; border-radius: 8px; text-align: center;">
                        <p style="margin: 0; color: #4A5568;">
                            { 'Customers can now use this coupon when ordering from your restaurant.' if is_approved 
                              else 'Please review our coupon guidelines and submit a new request if needed.' }
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                Need help? Contact contact@eatoor.com<br><br>
                © {datetime.now().year} Eatoor. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return html