import React from "react";
import "../assets/css/vendor/index.css";

const OrderManagement = () => {
  return (
    <div className="vendor-orders">
      <h2>Order Management</h2>
      <div className="vendor-order-list">
        <div className="vendor-card">
          <h3>Order #123</h3>
          <p>Customer: John Doe</p>
          <p>Items: Burger, Fries</p>
          <p>Total: $15.99</p>
          <p>Status: Pending</p>
        </div>
        <div className="vendor-card">
          <h3>Order #124</h3>
          <p>Customer: Jane Smith</p>
          <p>Items: Pizza, Soda</p>
          <p>Total: $22.50</p>
          <p>Status: Completed</p>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;