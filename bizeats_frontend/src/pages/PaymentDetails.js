import React from "react";
import "../assets/css/PaymentDetails.css";

const PaymentDetails = ({ method }) => {

  console.log("method===",method)

  return (
    <div className="payment-details-container">
      {/* <h2 className="payment-details-title">Enter Payment Details</h2> */}

      {method === "upi" && (
        <div className="payment-input">
          <label>UPI ID</label>
          <input type="text" placeholder="Enter your UPI ID" />
        </div>
      )}

      {method === "card" && (
        <>
          <div className="payment-input">
            <label>Card Number</label>
            <input type="text" placeholder="Enter your card number" />
          </div>
          <div className="payment-input">
            <label>Expiry Date</label>
            <input type="text" placeholder="MM/YY" />
          </div>
          <div className="payment-input">
            <label>CVV</label>
            <input type="password" placeholder="***" />
          </div>
        </>
      )}

      {method === "wallets" && (
        <div className="payment-input">
          <label>Choose Wallet</label>
          <select>
            <option value="paytm">Paytm</option>
            <option value="phonepe">PhonePe</option>
            <option value="googlepay">Google Pay</option>
          </select>
        </div>
      )}

      {method === "netbanking" && (
        <div className="payment-input">
          <label>Choose Bank</label>
          <select>
            <option value="hdfc">HDFC Bank</option>
            <option value="sbi">State Bank of India</option>
            <option value="icici">ICICI Bank</option>
          </select>
        </div>
      )}

      {method === "cod" && <p className="cod-info">You can pay in cash or UPI on delivery.</p>}
      {method === "online" && <p className="cod-info">Pay using payment gateway.</p>}
    </div>
  );
};

export default PaymentDetails;
