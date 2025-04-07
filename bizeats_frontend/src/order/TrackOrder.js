import React, { useEffect, useState } from 'react';
import { Bike } from 'lucide-react';
import "../assets/css/order/TrackOrder.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const TrackOrder = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [noOrders, setNoOrders] = useState(false);

  const statusMap = {
    "Pending": 0,
    "Confirmed": 20,
    "Preparing": 40,
    "Ready for Delivery/Pickup": 60,
    "On the Way": 80,
    "Delivered": 100,
    "Cancelled": 0,
    "Refunded": 0,
  };

  const getOrderTrackingDetails = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.TRACK.TRACK_ORDER,
        "POST",
        { user_id: user?.user_id || null }
      );

      if (response.status === "success" && response.orders.length > 0) {
        setOrders(response.orders);
        setSelectedOrder(response.orders[0]);
      } else {
        setNoOrders(true);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setNoOrders(true);
    }
  };

  useEffect(() => {
    if (user?.user_id) {
      getOrderTrackingDetails();
    }
  }, [user?.user_id]);

  const handleOrderChange = (event) => {
    const orderNumber = event.target.value;
    const order = orders.find(o => o.order_number === orderNumber);
    setSelectedOrder(order);
  };

  if (noOrders) {
    return (
      <div className="track-order-container no-orders">
        <h2 className="order-summary-title">Track Order</h2>
        <div className="no-order-message">
          <h3>No Orders Found</h3>
          <p>Looks like you haven’t placed any orders yet.</p>
        </div>
      </div>
    );
  }

  if (!selectedOrder) return <p>Loading order...</p>;

  const progress = statusMap[selectedOrder.status] || 0;

  return (
    <div className="track-order-container">
      <div className="track-header">
        <h2 className="order-summary-title">Track Order</h2>
        <div className="order-selector">
          <label htmlFor="orderSelect">Select Order:</label>
          <select id="orderSelect" onChange={handleOrderChange} value={selectedOrder.order_number}>
            {orders.map((order) => (
              <option key={order.order_number} value={order.order_number}>
                {order.order_number} - {order.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="order-summary-card">
        <div className="progress-section">
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            <div className="bike-icon" style={{ left: `calc(${progress}% + 2px)` }}>
              <Bike size={28} color="#e65c00" />
            </div>
          </div>
        </div>

        <div className="order-section">
          <h3>Order Info</h3>
          <p><strong>ID:</strong> {selectedOrder.order_number}</p>
          <p><strong>Status:</strong> {selectedOrder.status}</p>
          <p><strong>Placed On:</strong> {selectedOrder.placed_on}</p>
        </div>

        <div className="order-section">
          <h3>Delivery Address</h3>
          <p>{selectedOrder.delivery_address.full_name}</p>
          <p>{selectedOrder.delivery_address.address}</p>
          <p>{selectedOrder.delivery_address.landmark}</p>
          <p>{selectedOrder.delivery_address.phone_number || ""}</p>
        </div>

        <div className="order-section">
          <h3>Estimated Delivery</h3>
          <p><strong>Expected By:</strong> {selectedOrder.estimated_delivery}</p>
        </div>

        <div className="order-section">
          <h3>Items Ordered</h3>
          {selectedOrder.items.map((item, idx) => (
            <div className="item-line" key={idx}>
              <div className="item-name-qty">
                <span className="item-name">{item.item_name}</span>
                <span className="item-qty">x{item.quantity}</span>
              </div>
              <span className="item-total">₹{item.total_price}</span>
            </div>
          ))}
        </div>

        <div className="order-pricing">
          <div className="pricing-line">
            <span>Subtotal</span>
            <span>₹{selectedOrder.subtotal}</span>
          </div>
          <div className="pricing-line total-line">
            <span>Total</span>
            <span>₹{selectedOrder.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
