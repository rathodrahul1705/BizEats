import React, { useState, useEffect } from "react";
import "../assets/css/customer/CusOrders.css";
import OrderDetailsModal from "./OrderDetailsSummary";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const CusOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noOrders, setNoOrders] = useState(false);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const getOrderTrackingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetchData(
        API_ENDPOINTS.TRACK.ORDER_DETAILS,
        "POST",
        { user_id: user?.user_id || null }
      );

      if (response.status === "success" && response.orders.length > 0) {
        setOrders(response.orders);
      } else {
        setNoOrders(true);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setNoOrders(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_id) {
      getOrderTrackingDetails();
    }
  }, [user?.user_id]);

  return (
    <div className="orders-container">
      <h3 className="orders-title">Your Past Orders</h3>
      {loading ? (
        <StripeLoader />
      ) : noOrders || orders.length === 0 ? (
        <p className="no-orders">You have no past orders.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order, index) => (
            <li key={index} className="order-item">
              <div className="order-header">
                <img
                  src={order.delivery_address?.restaurant_image}
                  alt="Food"
                  className="order-image"
                />

                <div className="order-details">
                  <h4 className="restaurant-name">
                    {order.delivery_address?.restaurant_name || "Restaurant"}
                  </h4>
                  <p className="restaurant-address">
                    {order.delivery_address?.address}
                  </p>
                  <p className="order-info">
                    <strong>Order ID:</strong> {order.order_number} |{" "}
                    <strong>Date:</strong>{" "}
                    {new Date(order.placed_on).toLocaleDateString()}
                  </p>
                  <span className={`order-status ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              <div className="order-footer">
                <div className="order-items">
                  {order.items.map((item, i) => (
                    <span key={i}>
                      {item.item_name} x {item.quantity}
                      {i !== order.items.length - 1 && ", "}
                    </span>
                  ))}
                </div>
                <p className="order-total">
                  <strong>Total Paid:</strong> ₹ {Number(order.total).toFixed(2)}
                </p>
              </div>

              {/* <div className="order-actions">
                <button className="view-details-btn" onClick={() => handleViewDetails(order)}>
                  View More Details
                </button>
              </div> */}
            </li>
          ))}
        </ul>
      )}

      {/* {orders.length > 0 && (
        <div className="show-more-container">
          <button className="show-more-btn">Show More Orders</button>
        </div>
      )} */}

      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default CusOrders;
