import requests
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from api.emailer.email_template import build_email_html
from django.core.mail import EmailMultiAlternatives

from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.models import NotificationQueue, Device

User = get_user_model()
MAX_ATTEMPTS = 5

FCM_SERVER_KEY = "YOUR_FCM_SERVER_KEY_HERE"  # Replace with your key


def send_push_notification(tokens, title, body, data):
    """Send push notification using FCM."""
    if not tokens:
        return True, "No tokens"

    url = "https://fcm.googleapis.com/fcm/send"
    headers = {
        "Authorization": "key=" + FCM_SERVER_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "registration_ids": list(tokens),
        "notification": {
            "title": title,
            "body": body
        },
        "data": data
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        return True, "Success"
    return False, response.text

def send_email_notification(email, subject, body, username, offer=None):

    html_body = build_email_html(
        logo_url="https://eatoorprod.s3.amazonaws.com/uploads/80645c4afd0d47dea9c05b0091714778.jpg",
        title=subject,
        message=body,
        button_text="Order Now",
        button_url="https://bizeats.com/offers",
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
        .exclude(status__in=["sent", "cancelled"])   # FIXED
        .select_related("template", "user")
    )

    results = []

    for queue in qs:
        template = queue.template

        # ------------------------------
        # 1. Target users
        # ------------------------------
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

        # ------------------------------
        # 2. Send per user
        # ------------------------------
        for user in users:
            dynamic = queue.payload or {}
            dynamic["username"] = user.full_name

            subject = template.subject
            body = template.body.replace("{{username}}", user.full_name)

            devices = list(
                Device.objects.filter(
                    user=user,
                    is_active=True
                ).values_list("token", flat=True)
            )

            status = "sent"
            errors = []

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

            # ------------------------------
            # 3. Update Queue Logic
            # ------------------------------
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