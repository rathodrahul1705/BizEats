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

def send_push_notification(tokens, title, body, data=None):
    """Send push notification using Firebase Admin SDK."""
    if not tokens:
        return False, "No tokens provided"

    # Ensure data is a dictionary with string values
    clean_data = {str(k): str(v) for k, v in (data or {}).items()}

    # Build list of messages for each token
    messages = []

    for token in tokens:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token,
            data=clean_data,
        )
        messages.append(message)

    # Send messages in bulk
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
        .exclude(status__in=["sent"])
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
                body = track_order_function(queue.payload, body)
            
            # ------------------------------
            # EMAIL
            # ------------------------------

            if queue.channel in ["email", "both"]:
                ok, msg = send_email_notification(
                    email=user.email,
                    subject=subject,
                    body=body,
                    username=user.full_name,
                    offer=dynamic.get("offer")
                )
                if not ok:
                    status = "failed"
                    errors.append("Email: " + msg)

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

@api_view(["POST"])
def send_fcm_notification(request):
    body = request.data

    device_token = body.get("device_token")

    if not device_token:
        return Response({"error": "device_token is required"}, status=400)

    image_url = "https://eatoorprod.s3.amazonaws.com/menu_images/173660591bbc4c8a9a2a0dcb85bdc173.jpg"

    message = messaging.Message(
        notification=messaging.Notification(
            title=body.get("title", "Aloo Paratha Set"),
            body=body.get("body", "Get in 10 rs only"),
            image=image_url
        ),
        token=device_token,

        data={
            **body,
            "image": image_url,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
            "action_type": "navigate",
            "action_screen": "HomeTabs",
            "action_button": "Order Now",
        },

        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                sound="default",
                channel_id="default",
                image=image_url,
                click_action="OPEN_KITCHEN_PAGE",
            )
        ),

        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound="default",
                    content_available=True
                ),
            ),
            fcm_options=messaging.APNSFCMOptions(
                image=image_url
            )
        )
    )

    response = messaging.send(message)
    return Response({"message_id": response})
