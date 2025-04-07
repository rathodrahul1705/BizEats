import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import '../assets/css/payment/PaymentStatus.css';

const PaymentSuccess = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="payment-status-container success">
      <div className="status-icon">
        <FaCheckCircle />
      </div>
      <h1>Payment Successful!</h1>
      
      <div className="payment-details">
        <p><strong>Amount Paid:</strong> ₹{state?.amount}</p>
        <p><strong>Payment ID:</strong> {state?.paymentId}</p>
        <p><strong>Order ID:</strong> {state?.orderId}</p>
        {state?.restaurantName && (
          <p><strong>Restaurant:</strong> {state.restaurantName}</p>
        )}
      </div>

      <div className="action-buttons">
        <button 
          className="primary-btn"
          onClick={() => navigate('/track-order')}
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