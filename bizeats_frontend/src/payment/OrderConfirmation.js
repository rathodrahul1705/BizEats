import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaCartPlus, FaClock } from 'react-icons/fa';
import '../assets/css/payment/PaymentStatus.css';

const OrderConfirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="payment-status-container confirmation">
      <div className="status-icon">
        <FaCheckCircle />
      </div>
      <h1>Order Confirmed!</h1>
      
      <div className="order-details">
        <p className="delivery-info">
          <FaClock /> Your order will be delivered in 30-45 minutes
        </p>
        <p><strong>Payment Method:</strong> {state?.paymentMethod}</p>
        <p><strong>Order Total:</strong> ₹{state?.amount}</p>
        {state?.restaurantName && (
          <p><strong>Restaurant:</strong> {state.restaurantName}</p>
        )}
      </div>

      <div className="action-buttons">
        <button 
          className="primary-btn"
          onClick={() => navigate('/track-order')}
        >
          <FaCartPlus /> Track Your Order
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

export default OrderConfirmation;
