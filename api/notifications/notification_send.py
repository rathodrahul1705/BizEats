import requests
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.emailer.email_template import build_email_html
from django.core.mail import EmailMultiAlternatives
from firebase_admin import messaging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from api.models import NotificationQueue, Device
from api.notifications.notification_payload import track_order_function

User = get_user_model()
MAX_ATTEMPTS = 5

def send_push_notification(tokens, title, body, order_number, data=None):
    if not tokens:
        return False, "No tokens provided"

    # Base navigation data (default)
    base_data = {
        "click_action": "TRACK_ORDER",
        "action_screen": "TrackOrder",
        "action_button": "Track Order",
        "order_number": order_number,
    }

    # Merge dynamic data safely (all values must be strings)
    dynamic_data = {str(k): str(v) for k, v in (data or {}).items()}

    final_data = {
        **base_data,
        **dynamic_data,
    }

    messages = []

    for token in tokens:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=final_data,
            android=messaging.AndroidConfig(
                notification=messaging.AndroidNotification(
                    click_action="TRACK_ORDER"
                )
            ),
            token=token,
        )
        messages.append(message)

    response = messaging.send_each(messages)

    return True, f"Sent: {response.success_count}, Failed: {response.failure_count}"

def send_email_notification(email, subject, body, username, offer=None):

    html_body = build_email_html(
        logo_url="https://eatoorprod.s3.amazonaws.com/eatoor-logo/fwdeatoorlogofiles/5.png",
        title=subject,
        message=body,
        button_text="Order Now",
        button_url="https://eatoor.com/home-kitchens",
        footer_text="Delivering happiness to your doorstep ❤️"
    )

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email]
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send()

        return True, "Email sent"

    except Exception as e:
        return False, str(e)

@api_view(["GET"])
def process_notification_queue(request):

    qs = (
        NotificationQueue.objects
        .filter(next_try_at__lte=timezone.now())
        # .exclude(status__in=["sent"])
        .select_related("template", "user")
    )

    results = []

    for queue in qs:
        template = queue.template

        if queue.user:
            users = [queue.user]
        else:
            tag_ids = queue.target_tags.values_list("id", flat=True)
            users = (
                User.objects
                .filter(assigned_tags__tag_id__in=tag_ids)
                .distinct()
            )

        if not users:
            queue.status = "cancelled"
            queue.last_error = "No users found for tag-based notification"
            queue.save()
            continue

        for user in users:
            dynamic = queue.payload or {}
            dynamic["username"] = user.full_name
            subject = template.subject
            body = template.body
            status = "sent"
            errors = []

            devices = list(
                Device.objects.filter(
                    user=user,
                    is_active=True
                ).values_list("token", flat=True)
            )

            if template.key == "SIGNUP_OFFER":
                body = body.replace("{{username}}", user.full_name)

            if template.key == "ORDER_STATUS_NOTIFICATION":
                response_body = track_order_function(queue.payload, body)
                body = None
                if response_body['status'] == "success":
                    body = response_body['body']
                    template.title = response_body['title']

            # ------------------------------
            # EMAIL
            # ------------------------------

            # if queue.channel in ["email", "both"]:
            #     ok, msg = send_email_notification(
            #         email=user.email,
            #         subject=subject,
            #         body=body,
            #         username=user.full_name,
            #         offer=dynamic.get("offer")
            #     )
            #     if not ok:
            #         status = "failed"
            #         errors.append("Email: " + msg)

            # ------------------------------
            # PUSH
            # ------------------------------
            
            if queue.channel in ["push", "both"]:
                ok, msg = send_push_notification(
                    tokens=devices,
                    title=template.title,
                    body=body,
                    data=dynamic
                )
                if not ok:
                    status = "failed"
                    errors.append("Push: " + msg)

            queue.attempts += 1
            queue.sent_at = timezone.now()

            if status == "sent":
                queue.status = "sent"
                queue.last_error = None

            else:
                # Failed notification
                queue.status = "failed"
                queue.last_error = "\n".join(errors)

                # Retry logic
                if queue.attempts < MAX_ATTEMPTS:
                    # schedule retry after 5 minutes
                    queue.next_try_at = timezone.now() + timezone.timedelta(minutes=5)
                else:
                    # Max retries reached → auto cancel
                    queue.status = "cancelled"
                    queue.last_error += "\nMax attempts reached. Auto-cancelled."

            queue.save()

            results.append({
                "queue_id": queue.id,
                "user_id": user.id,
                "status": queue.status,
                "attempts": queue.attempts,
                "errors": errors,
                "next_try_at": queue.next_try_at,
            })

    return Response({
        "processed": len(results),
    })

def send_order_received_notification(tokens, order):
    """
    Send order received push notification to vendor devices.

    :param tokens: str | list[str]  (FCM token or list of tokens)
    :param order: Order model instance
    :return: dict (success / failure counts)
    """

    # ✅ Normalize tokens
    if isinstance(tokens, str):
        tokens = [tokens]

    if not isinstance(tokens, list) or not tokens:
        raise ValueError("Invalid FCM tokens provided")

    # ✅ Order data
    order_number = order.order_number
    restaurant_id = order.restaurant_id

    data_payload = {
        "click_action": "ORDER_RECEIVED",
        "action_type": "navigate",
        "order_number": str(order_number),
        "restaurant_id": str(restaurant_id),
        "action_screen": "PartnerScreen",
        "orderId": str(order_number),
        "type": "new_order",
    }

    # ✅ Firebase message
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title="🛎 New Order Received",
            body=f"Order #{order_number} awaiting confirmation",
        ),
        data=data_payload,
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                channel_id="order_alerts",
                sound="order_alert",
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="order_alert.wav",
                    category="ORDER_ACTION",
                )
            )
        ),
        tokens=tokens,
    )

    # ✅ Send notification
    response = messaging.send_each_for_multicast(message)

    return {
        "success": response.success_count,
        "failed": response.failure_count,
    }


@api_view(["POST"])
def send_fcm_notification(request):
    import json
    from firebase_admin import messaging
    
    body = request.data
    device_token = body.get("device_token")

    if not device_token:
        return Response({"error": "device_token is required"}, status=400)

    image_url = "https://eatoorprod.s3.amazonaws.com/menu_images/173660591bbc4c8a9a2a0dcb85bdc173.jpg"
    
    # Get title and body from request
    title = body.get("title", "Aloo Paratha Set")
    notification_body = body.get("body", "Get in 10 rs only")
    
    # Prepare data payload for navigation
    data_payload = {
        "title": title,
        "body": notification_body,
        "image": image_url,
        "click_action": "FLUTTER_NOTIFICATION_CLICK",  # Important for Flutter/React Native
        "action_type": "navigate",
        "action_screen": "HomeTabs",
        "action_button": "Order Now",
        "type": body.get("type", "general"),  # Add type for handling different notifications
        "timestamp": "ssss",  # Current timestamp in milliseconds
        # Add any other data from body
    }
    
    # Add any extra data from request body
    for key, value in body.items():
        if key not in ["device_token", "title", "body", "image"]:
            data_payload[key] = str(value)  # Ensure all values are strings

    try:
        # Build the message
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=notification_body,
                image=image_url  # This works for both iOS and Android
            ),
            token=device_token,
            
            # Data payload for handling in app
            data=data_payload,
            
            # Android specific configuration
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="default",  # Make sure this channel exists in Android app
                    image=image_url,
                    color="#E65C00",  # Add color for better appearance
                    click_action="FLUTTER_NOTIFICATION_CLICK",
                    tag="food_order",  # Group notifications by tag
                ),
                # TTL (Time to Live) in seconds - optional
                ttl=3600,  # 1 hour
            ),
            
            # iOS specific configuration (APNS)
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(
                            title=title,
                            body=notification_body,
                        ),
                        sound="default",
                        badge=1,  # Increment badge count
                        content_available=True,  # Enable background notification
                        mutable_content=True,  # Required for image display
                    ),
                ),
                headers={
                    "apns-priority": "10",  # High priority for immediate delivery
                },
                fcm_options=messaging.APNSFCMOptions(
                    image=image_url
                )
            ),
            
            # Webpush configuration (optional)
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=notification_body,
                    icon=image_url,  # Icon for web notifications
                    image=image_url,
                )
            )
        )
        
        # Send the message
        response = messaging.send(message)
        
        # Log successful delivery
        print(f"✅ Successfully sent message: {response}")
        
        return Response({
            "success": True,
            "message_id": response,
            "message": "Notification sent successfully"
        })
        
    except messaging.UnregisteredError as e:
        # Token is no longer valid
        print(f"❌ Device token is no longer valid: {e}")
        return Response({
            "error": "Device token is no longer valid",
            "code": "TOKEN_UNREGISTERED"
        }, status=400)
        
    except messaging.SenderIdMismatchError as e:
        print(f"❌ Sender ID mismatch: {e}")
        return Response({
            "error": "Sender ID mismatch",
            "code": "SENDER_ID_MISMATCH"
        }, status=400)
        
    except messaging.ThirdPartyAuthError as e:
        print(f"❌ Third party auth error: {e}")
        return Response({
            "error": "Authentication error with FCM",
            "code": "AUTH_ERROR"
        }, status=500)
        
    except messaging.InvalidArgumentError as e:
        print(f"❌ Invalid argument: {e}")
        return Response({
            "error": "Invalid argument in message",
            "code": "INVALID_ARGUMENT"
        }, status=400)
        
    except Exception as e:
        print(f"❌ Error sending notification: {e}")
        return Response({
            "error": f"Failed to send notification: {str(e)}",
            "code": "UNKNOWN_ERROR"
        }, status=500)
    
# def send_fcm_notification(request):
#     body = request.data

#     device_token = body.get("device_token")

#     if not device_token:
#         return Response({"error": "device_token is required"}, status=400)

#     image_url = "https://eatoorprod.s3.amazonaws.com/menu_images/173660591bbc4c8a9a2a0dcb85bdc173.jpg"

#     message = messaging.Message(
#         notification=messaging.Notification(
#             title=body.get("title", "Aloo Paratha Set"),
#             body=body.get("body", "Get in 10 rs only"),
#             image=image_url
#         ),
#         token=device_token,

#         data={
#             **body,
#             "image": image_url,
#             "click_action": "HOMENAVIGATE",
#             "action_type": "navigate",
#             "action_screen": "HomeTabs",
#             "action_button": "Order Now",
#         },

#         android=messaging.AndroidConfig(
#             priority="high",
#             notification=messaging.AndroidNotification(
#                 sound="default",
#                 channel_id="default",
#                 image=image_url,
#                 click_action="OPEN_KITCHEN_PAGE",
#             )
#         ),

#         apns=messaging.APNSConfig(
#             payload=messaging.APNSPayload(
#                 aps=messaging.Aps(
#                     sound="default",
#                     content_available=True
#                 ),
#             ),
#             fcm_options=messaging.APNSFCMOptions(
#                 image=image_url
#             )
#         )
#     )

#     response = messaging.send(message)
#     return Response({"message_id": response})