import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import fetchData from '../components/services/apiService';
import API_ENDPOINTS from '../components/config/apiConfig';
import '../assets/css/payment/PaymentStatus.css';

const PaymentSuccess = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(null);
  const [error, setError] = useState(null);
  
  console.log("state===,",state)
  
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
      eatoor_order_id: state.eatoor_order_id,
      eatoor_order_number: state.eatoor_order_number,
      restaurant_id: state.restaurant_id,
      restaurantName: state.restaurantName,
      paymentMethod: state.paymentMethod,
    };
    

    try {

      const response = await fetchData(API_ENDPOINTS.PAYMENT.VERIFY_PAYMENT, 'POST', payload);
      if (response?.status === 'Payment Successful') {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        setError(response?.error || 'Payment verification failed.');
      }
    } catch (err) {
      setIsVerified(false);
      setError(err.message || 'Something went wrong.');
    }
  };

  return (
    <div className={`payment-status-container ${isVerified === false ? 'error' : 'success'}`}>
      <div className="status-icon">
        <FaCheckCircle />
      </div>
      <h1>
        {isVerified === null
          ? 'Verifying Payment...'
          : isVerified
          ? 'Payment Successful!'
          : 'Payment Verification Failed'}
      </h1>

      {isVerified && (
        <div className="payment-details">
          <p><strong>Amount Paid:</strong> ₹{state?.amount}</p>
          <p><strong>Payment ID:</strong> {state?.paymentId}</p>
          <p><strong>Order ID:</strong> {state?.orderId}</p>
          {state?.restaurantName && (
            <p><strong>Restaurant:</strong> {state.restaurantName}</p>
          )}
        </div>
      )}

      {isVerified === false && (
        <div className="error-message">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <div className="action-buttons">
        <button
          className="primary-btn"
          onClick={() => navigate('/track-order')}
          disabled={!isVerified}
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
