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
    Handles PayU's 'Payment Successful' webhook.

    IMPORTANT: PayU posts this as application/x-www-form-urlencoded,
    NOT JSON — so we read request.POST, not request.data as JSON.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        data = request.POST.dict()

        if not data:
            logger.warning("PayU success webhook received with empty payload")
            return Response({"detail": "empty payload"}, status=http_status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "ok"}, status=http_status.HTTP_200_OK)

    @staticmethod
    def _to_decimal(value):
        try:
            return Decimal(value) if value not in (None, "") else None
        except InvalidOperation:
            return None