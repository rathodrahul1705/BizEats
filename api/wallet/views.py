import hashlib
import hmac
import razorpay
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status

from api.models import Wallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer
from .services import credit_wallet, debit_wallet
from api.models import Order  # Your Order model


# -----------------------------
# 1. GET WALLET DETAILS
# -----------------------------
class WalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        serializer = WalletSerializer(wallet)
        return Response(serializer.data)


# -----------------------------
# 2. CREATE RAZORPAY ORDER
# -----------------------------
class CreateRazorpayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get("amount")

        if not amount:
            return Response({"error": "Amount required"}, status=400)

        try:
            amount_paise = int(float(amount) * 100)
        except:
            return Response({"error": "Invalid amount"}, status=400)

        client = razorpay.Client(
            auth=(settings.RAZORPAY_API_KEY, settings.RAZORPAY_API_SECRET)
        )

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
        })

        return Response({
            "order_id": order["id"],
            "amount": float(amount),
            "currency": "INR",
            "key": settings.RAZORPAY_API_KEY,
            "message": "Razorpay order created successfully",
        })


# -----------------------------
# 3. ADD MONEY SUCCESS
# -----------------------------
# class AddMoneySuccessView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         amount = request.data.get("amount")
#         razorpay_payment_id = request.data.get("razorpay_payment_id")
#         razorpay_order_id = request.data.get("razorpay_order_id")

#         if not amount:
#             return Response({"error": "Amount is required"}, status=400)

#         wallet, _ = Wallet.objects.get_or_create(user=request.user)

#         credit_wallet(wallet, float(amount),razorpay_payment_id, razorpay_order_id, "add_money", note="Money Added")

#         return Response({"message": "Money added successfully", "balance": wallet.balance})

class AddMoneySuccessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_order_id = request.data.get("razorpay_order_id")
        razorpay_signature = request.data.get("razorpay_signature")
        amount = request.data.get("amount")

        # Validate payload
        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature, amount]):
            return Response({"error": "Missing required parameters"}, status=400)

        # Hash-based signature verification
        generated_signature = hmac.new(
            key=settings.RAZORPAY_API_SECRET.encode(),
            msg=f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            digestmod=hashlib.sha256
        ).hexdigest()

        if generated_signature != razorpay_signature:
            return Response({"error": "Invalid payment signature"}, status=400)

        # Verified — credit wallet
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        credit_wallet(
            wallet,
            float(amount),
            razorpay_payment_id,
            razorpay_order_id,
            source="add_money",
            note="Razorpay payment successful"
        )

        return Response({
            "message": "Payment verified & wallet credited",
            "balance": wallet.balance
        }, status=200)



# -----------------------------
# 4. DEBIT WALLET (Order Payment)
# -----------------------------
class DebitWalletForOrder(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get("amount")
        order_id = request.data.get("order_id", None)  # NOW OPTIONAL

        if not amount:
            return Response({"error": "amount is required"}, status=400)

        try:
            amount = float(amount)
        except:
            return Response({"error": "Invalid amount"}, status=400)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        # ---------- OPTIONAL ORDER ----------
        order = None
        if order_id:
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                return Response({"error": "Order not found"}, status=404)

        # ---------- DEBIT WALLET ----------
        try:
            debit_wallet(wallet, amount, "order_payment", order)
        except ValueError:
            return Response({"error": "Insufficient balance"}, status=400)

        return Response({
            "message": "Wallet debited successfully",
            "balance": wallet.balance
        })

# -----------------------------
# 5. REFUND WALLET AMOUNT
# -----------------------------
class RefundWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        amount = request.data.get("amount")
        order_id = request.data.get("order_id")
        reason = request.data.get("reason", "Refund")

        if not amount or not order_id:
            return Response({"error": "amount & order_id required"}, status=400)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        credit_wallet(wallet, float(amount), "order_refund", order, note=reason)

        return Response({
            "message": "Refund added to wallet",
            "balance": wallet.balance
        })


# -----------------------------
# 6. TRANSACTION HISTORY
# -----------------------------
class TransactionHistoryView(ListAPIView):
    serializer_class = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WalletTransaction.objects.filter(
            wallet__user=self.request.user
        ).order_by('-id')

# -----------------------------
# 7. ADMIN ADJUST WALLET
# -----------------------------
class AdminAdjustWalletView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        user_id = request.data.get("user_id")
        amount = request.data.get("amount")
        txn_type = request.data.get("txn_type")
        note = request.data.get("note", "")

        if not user_id or not amount or not txn_type:
            return Response({"error": "user_id, amount, txn_type required"}, status=400)

        from django.contrib.auth.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        wallet, _ = Wallet.objects.get_or_create(user=user)

        amount = float(amount)

        if txn_type == "credit":
            credit_wallet(wallet, amount, "manual_adjustment", note=note)
        elif txn_type == "debit":
            try:
                debit_wallet(wallet, amount, "manual_adjustment", note=note)
            except ValueError:
                return Response({"error": "Insufficient balance"}, status=400)
        else:
            return Response({"error": "Invalid txn_type"}, status=400)

        return Response({"message": "Wallet updated", "balance": wallet.balance})
