import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaTimesCircle } from 'react-icons/fa';
import '../assets/css/payment/PaymentStatus.css';

const PaymentFailed = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  console.log("state===",state)
  
  return (
    <div className="payment-status-container failed">
      <div className="status-icon">
        <FaTimesCircle />
      </div>
      <h1>Payment Failed</h1>
      
      <div className="payment-details">
        <p><strong>Error:</strong> {state?.error || 'Unknown error occurred'}</p>
        {state?.orderAmount && (
          <p><strong>Order Amount:</strong> ₹{state.orderAmount}</p>
        )}
        {state?.restaurantName && (
          <p><strong>Restaurant:</strong> {state.restaurantName}</p>
        )}
      </div>

      <div className="action-buttons">
        <button 
          className="primary-btn"
          onClick={() => navigate(`/payments/${state.restaurant_id}`)}
        >
          Try Payment Again
        </button>
        {/* <button 
          className="secondary-btn"
          onClick={() => navigate('/support')}
        >
          Contact Support
        </button> */}
      </div>
    </div>
  );
};

export default PaymentFailed;