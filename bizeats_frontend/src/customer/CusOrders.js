import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleTrackOrder = (orderNumber) => {
    navigate(`/track-order/${orderNumber}`);
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

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`cus-orders__star ${i <= rating ? "cus-orders__star--filled" : ""}`}
        >
          {i <= rating ? "★" : "☆"}
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="cus-orders">
      {orders.length > 0 ? (
        <h3 className="cus-orders__title">Your Order History</h3>
      ) : ""}
      
      {loading ? (
        <StripeLoader />
      ) : noOrders || orders.length === 0 ? (
        <div className="cus-orders__empty">
          <svg className="cus-orders__empty-icon" viewBox="0 0 24 24">
            <path d="M12 5c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zm1 9.29c.88-.39 1.5-1.26 1.5-2.29 0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5c0 1.02.62 1.9 1.5 2.29v3.3l-4.5 2.25v-2.54c-1.63-.49-3-1.64-3-3.21v-8c0-2.76 2.24-5 5-5h7c2.76 0 5 2.24 5 5v8c0 1.57-1.37 2.72-3 3.21v2.54l-4.5-2.25v-3.3z" />
          </svg>
          <p className="cus-orders__empty-text">No orders found</p>
        </div>
      ) : (
        <ul className="cus-orders__list">
          {orders.map((order, index) => (
            <li key={index} className="cus-orders__item">
              <div className="cus-orders__card">
                <div className="cus-orders__header">
                  <div className="cus-orders__restaurant">
                    <img
                      src={order.delivery_address?.restaurant_image}
                      alt="Restaurant"
                      className="cus-orders__restaurant-image"
                    />
                    <div className="cus-orders__restaurant-info">
                      <h4 className="cus-orders__restaurant-name">
                        {order.delivery_address?.restaurant_name || "Restaurant"}
                      </h4>
                      <p className="cus-orders__restaurant-address">
                        {order.delivery_address?.address}
                      </p>
                    </div>
                  </div>
                  <div className="cus-orders__meta">
                    <span className="cus-orders__order-id">#{order.order_number}</span>
                    <span className={`cus-orders__status cus-orders__status--${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="cus-orders__content">
                  <div className="cus-orders__items">
                    {order.items.map((item, i) => (
                      <div key={i} className="cus-orders__item-row">
                        {/* <span className="cus-orders__item-name">{item.item_name}</span> */}
                        <span className="item-name">
  {item.item_name}{" "}
  {item.buy_one_get_one_free && (
    <span style={{ color: "green", fontWeight: "bold" }}>
      (Buy 1 Get 1 Free)
    </span>
  )}
</span>

                        <span className="cus-orders__item-quantity">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cus-orders__footer">
                  <div className="cus-orders__footer-top">
                    <time className="cus-orders__date">
                      {new Date(order.placed_on).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </time>
                    <div className="cus-orders__total">
                      ₹{Number(order.total).toFixed(2)}
                    </div>
                  </div>
                  
                  {order.rating !== null && (
                    <div className="cus-orders__rating-section">
                      <span className="cus-orders__rating-label">Your rating:</span>
                      <div className="cus-orders__stars">
                        {renderStars(order.rating)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="cus-orders__action-links">
                <button 
                  className="cus-orders__action-link cus-orders__action-link--track"
                  onClick={() => handleTrackOrder(order.order_number)}
                >
                  Track Your Order
                </button>

                {order.status === "Delivered" && order?.rating == null && (
                  <button 
                    className="cus-orders__action-link cus-orders__action-link--details"
                    onClick={() => handleTrackOrder(order.order_number)}
                  >
                    Rate Order
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default CusOrders;