import React from "react";
import { MapPin, Store, X } from "lucide-react";
import "../assets/css/customer/OrderDetailsSummary.css";

const OrderDetailsSummary = ({ isOpen, onClose, order }) => {
  if (!order) return null;

  return (
    <>
      {isOpen && <div className="order-modal-overlay" onClick={onClose}></div>}
      <div className={`order-details-modal ${isOpen ? "slide-in-right" : ""}`}>
        <div className="modal-header">
          <h3>Order Details Summary</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Order Info */}
        <div className="order-info">
          <p><strong>Order ID:</strong> {order.id}</p>
          <div className="location-info">
            <p><Store size={18} className="icon" /> {order.restaurant}, {order.location}</p>
            <p><MapPin size={18} className="icon" /> Delivered To: Home Address</p>
          </div>
        </div>

        {/* Delivery Status */}
        {order.status === "Delivered" && (
          <div className="delivery-status">
            <h4>Delivery Status</h4>
            <p>📦 Delivered on <strong>{order.deliveryDate}</strong></p>
            <p>🚴 by <strong>{order.deliveryPerson}</strong></p>
          </div>
        )}

        {/* Item Summary */}
        <div className="item-summary">
          <h4>Item Summary</h4>
          {order.items.map((item, index) => (
            <div className="item-row" key={index}>
              <span>🍽 {item.name} x {item.quantity}</span>
              <span>₹{order.total / order.items.length}</span>
            </div>
          ))}

          <hr />
          <div className="item-total"><span>Item Total</span><span>₹{order.total}</span></div>
          <div className="item-fees"><span>Platform Fee</span><span>₹{order.platformFee}</span></div>
          <div className="item-fees"><span>Delivery Fee</span><span>{order.deliveryFee}</span></div>
          <div className="item-discount"><span>Discount</span><span>-₹{order.discount}</span></div>
          <div className="item-taxes"><span>Taxes</span><span>₹{order.taxes}</span></div>
        </div>

        <hr />

        {/* Payment Summary */}
        <div className="payment-summary">
          <p><strong>Paid Via:</strong> 💳 {order.paymentMethod}</p>
          <h3>Total: ₹{order.total - order.discount + order.taxes + order.platformFee}</h3>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsSummary;
