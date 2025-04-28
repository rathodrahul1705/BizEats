# coupon_crud.py

from rest_framework import generics, status
from rest_framework.response import Response
from api.models import Coupon
from rest_framework import serializers


# Serializer
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'


# Create Coupon
class CouponCreateView(generics.CreateAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"message": "Coupon created successfully!", "data": serializer.data}, status=status.HTTP_201_CREATED)


# List All Coupons
class CouponListView(generics.ListAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer


# Retrieve One Coupon
class CouponDetailView(generics.RetrieveAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer


# Update Coupon
class CouponUpdateView(generics.UpdateAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)  # allows PATCH
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"message": "Coupon updated successfully!", "data": serializer.data})


# Delete Coupon
class CouponDeleteView(generics.DestroyAPIView):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"message": "Coupon deleted successfully!"}, status=status.HTTP_204_NO_CONTENT)
