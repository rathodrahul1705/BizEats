import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import fetchData from '../components/services/apiService';
import API_ENDPOINTS from '../components/config/apiConfig';
import '../assets/css/payment/PaymentStatus.css';

const PaymentSuccess = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (state?.paymentId && state?.orderId && state?.razorpay_signature) {
      verifyPayment();
    }
  }, []);

  const verifyPayment = async () => {
    const payload = {
      razorpay_order_id: state.orderId,
      razorpay_payment_id: state.paymentId,
      razorpay_signature: state.razorpay_signature,
      amount: state.amount,
      deliveryAddressId: state.deliveryAddressId,
      payment_type: state.payment_type,
      eatoor_order_id: state.eatoor_order_id,
      eatoor_order_number: state.eatoor_order_number,
      restaurant_id: state.restaurant_id,
      restaurantName: state.restaurantName,
      paymentMethod: state.paymentMethod,
    };

    try {
      await fetchData(API_ENDPOINTS.PAYMENT.VERIFY_PAYMENT, 'POST', payload);
      // No need to handle response – assuming success visually
    } catch (err) {
      // Silently ignore errors – optionally log them
      console.error('Payment verification failed:', err);
    }
  };

  return (
    <div className="payment-status-container success">
      <div className="status-icon">
        <FaCheckCircle />
      </div>
      <h1>Payment Successful!</h1>

      <div className="payment-details">
        <p><strong>Amount Paid:</strong> ₹{state?.amount}</p>
        <p><strong>Payment ID:</strong> {state?.paymentId}</p>
        <p><strong>Order Number:</strong> {state?.eatoor_order_number}</p>
        {state?.restaurantName && (
          <p><strong>Home Kitchen:</strong> {state.restaurantName}</p>
        )}
      </div>

      <div className="action-buttons">
        <button
          className="primary-btn"
          onClick={() => navigate(`/track-order/${state?.eatoor_order_number}`)}
        >
          Track Your Order
        </button>
        <button
          className="secondary-btn"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
