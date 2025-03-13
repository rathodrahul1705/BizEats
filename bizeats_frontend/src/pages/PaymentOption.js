import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCreditCard, FaGooglePay, FaWallet, FaMoneyBillWave, FaUniversity } from "react-icons/fa";
import "../assets/css/OrderDetails.css";
import PaymentDetails from "./PaymentDetails"; // Importing the new component

const storeDetails = {
  name: "Gourmet Hub",
  deliveryTime: "30-40 min",
  location: "123 Main Street, Downtown",
  rating: 4.5,
  totalAmount: 200, // Dynamic value
};

const PaymentOption = () => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const navigate = useNavigate();

  const paymentMethods = [
    { id: "upi", name: "Pay by UPI App", icon: <FaGooglePay /> },
    { id: "card", name: "Credit & Debit Cards", icon: <FaCreditCard /> },
    { id: "wallets", name: "Wallets", icon: <FaWallet /> },
    { id: "netbanking", name: "Netbanking", icon: <FaUniversity /> },
    { id: "cod", name: "Pay on Delivery", icon: <FaMoneyBillWave /> },
  ];

  return (
    <div className="food-list-container">
      {/* Store Name */}
      <h1 className="store-title">Payment Options</h1>

      {/* Store Details Card */}
      <div className="store-details-card">
        <p className="store-info">🏪 {storeDetails.name}</p>
        <p className="store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="store-info">📍 {storeDetails.location}</p>
        <p className="store-info">🛒 1 Item · Total: ₹{storeDetails.totalAmount}</p>
      </div>

      {/* Payment Method Selection */}
      <h2 className="payment-method-title">Choose a Payment Method</h2>
      <div className="payment-methods">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            className={`payment-method-btn ${selectedPayment === method.id ? "selected" : ""}`}
            onClick={() => setSelectedPayment(method.id)}
          >
            <span className="payment-icon">{method.icon}</span> {method.name}
          </button>
        ))}
      </div>

      {/* Show Payment Details Component if a method is selected */}
      {selectedPayment && <PaymentDetails method={selectedPayment} />}

      {/* Proceed to Payment Button */}
      <button className="payment-btn" onClick={() => navigate("/checkout")}>
        Proceed to Payment 💳
      </button>
    </div>
  );
};

export default PaymentOption;
