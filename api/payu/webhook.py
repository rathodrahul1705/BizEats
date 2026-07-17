import logging
from decimal import Decimal, InvalidOperation

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class PayUSuccessWebhookView(APIView):
    """
    Handles PayU Payment Success Webhook.

    PayU sends the webhook as:
    Content-Type: application/x-www-form-urlencoded
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        logger.info("=" * 80)
        logger.info("PayU Success Webhook Received")

        try:
            logger.info("Request Method: %s", request.method)
            logger.info("Content-Type: %s", request.content_type)
            logger.info("Remote IP: %s", request.META.get("REMOTE_ADDR"))
            logger.info("User Agent: %s", request.META.get("HTTP_USER_AGENT"))

            # Raw body
            raw_body = request.body.decode("utf-8", errors="ignore")
            logger.debug("Raw Request Body: %s", raw_body)

            # Form Data
            data = request.POST.dict()

            if not data:
                logger.warning("PayU webhook received with empty payload.")
                return Response(
                    {"detail": "empty payload"},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

            logger.info("Received %s fields from PayU.", len(data))

            # Log important fields only
            logger.info(
                "Payment Details | txnid=%s | status=%s | amount=%s | mihpayid=%s",
                data.get("txnid"),
                data.get("status"),
                data.get("amount"),
                data.get("mihpayid"),
            )

            logger.info(
                "Customer Details | firstname=%s | email=%s | phone=%s",
                data.get("firstname"),
                data.get("email"),
                data.get("phone"),
            )

            logger.info(
                "Product Info | productinfo=%s",
                data.get("productinfo"),
            )

            # Log all keys received
            logger.debug("Webhook Keys: %s", list(data.keys()))

            # Mask hash before logging
            if data.get("hash"):
                logger.debug(
                    "Hash Received: %s****",
                    data.get("hash")[:12]
                )

            logger.info("PayU webhook processed successfully.")
            logger.info("=" * 80)

            return Response(
                {"detail": "ok"},
                status=http_status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Unexpected error while processing PayU webhook.")
            logger.info("=" * 80)

            return Response(
                {"detail": "internal server error"},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @staticmethod
    def _to_decimal(value):
        try:
            return Decimal(value) if value not in (None, "") else None
        except InvalidOperation:
            logger.warning("Invalid decimal value received: %s", value)
            return None