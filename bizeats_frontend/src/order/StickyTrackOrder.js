import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMotorcycle, FaBoxOpen, FaTimes } from 'react-icons/fa';
import "../assets/css/order/StickyTrackOrder.css";
import API_ENDPOINTS from "../components/config/apiConfig";

const StickyTrackOrder = ({ user }) => {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showTrackPopup, setShowTrackPopup] = useState(false);

  console.log("user===",user)
  
  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.TRACK.GET_ACTTIVE_ORDER, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ user_id: user?.user_id })
        });

        const data = await response.json();

        if (data.status === "success" && Array.isArray(data.orders)) {
          // Filter only "Confirmed" or "On the Way" orders
          const validStatuses = ["Confirmed", "On the Way"];
          const filtered = data.orders.filter(order =>
            validStatuses.includes(order.status)
          );

          // Sort newest first by placed_on (descending)
          const sorted = filtered.sort((a, b) =>
            new Date(b.placed_on) - new Date(a.placed_on)
          );

          setActiveOrders(sorted);
        }
      } catch (error) {
        console.error("Failed to fetch active orders", error);
      }
    };

    fetchActiveOrders();
  }, [user?.user_id]);

  if (!activeOrders || activeOrders.length === 0) return null;

  const latestOrder = activeOrders[0];
  const displayOrder = selectedOrder || latestOrder;

  const handleTrackClick = () => {
    if (activeOrders.length > 1) {
      setShowTrackPopup(true);
    } else {
      navigate(`/track-order/${displayOrder.order_number}`);
    }
  };

  const calculateArrivalTime = (estimated_delivery) => {
    if (!estimated_delivery) return "N/A";
    const utcDate = new Date(estimated_delivery.replace(' ', 'T') + 'Z');
    if (isNaN(utcDate.getTime())) return "Invalid Date";
  
    const options = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
  
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const formattedDate = formatter.format(utcDate).replace(',', '');
  
    // Convert "dd/mm/yyyy hh:mm:ss" → "dd-mm-yyyy, hh:mm:ss"
    const [datePart, timePart] = formattedDate.split(' ');
    const dateWithHyphen = datePart.replace(/\//g, '-');
    return `${dateWithHyphen}, ${timePart}`;
  };

  return (
    <>
      <div className="sticky-order">
        <div className="sticky-order__content">
          <div className="sticky-order__status-indicator">
            <FaMotorcycle className="sticky-order__icon sticky-order__icon--delivering" />
          </div>

          <div className="sticky-order__info">
            <div className="sticky-order__status-message">
              <span className="sticky-order__title">
                {displayOrder.status === 'On the Way' ? 'Your order is on the way!' : 'Order confirmed!'}
              </span>
              <span className="sticky-order__time">
                Arriving by {calculateArrivalTime(displayOrder.estimated_delivery)}
              </span>
            </div>
          </div>

          <button className="sticky-order__button" onClick={handleTrackClick}>
            Track
          </button>
        </div>
      </div>

      {showTrackPopup && (
        <div className="sticky-order__popup">
          <div className="sticky-order__popup-content">
            <div className="sticky-order__popup-header">
              <h3>Track Order</h3>
              <button
                className="sticky-order__popup-close"
                onClick={() => setShowTrackPopup(false)}
              >
                <FaTimes size={16} />
              </button>
            </div>
            <div className="sticky-order__popup-body">
              <p>Which order would you like to track?</p>
              <div className="sticky-order__popup-list">
                {activeOrders.map((order) => (
                  <div
                    key={order.order_number}
                    className="sticky-order__popup-item"
                    onClick={() => {
                      navigate(`/track-order/${order.order_number}`);
                      setShowTrackPopup(false);
                    }}
                  >
                    <div className="sticky-order__popup-item-status">
                      {order.status === 'On the Way' ? (
                        <FaMotorcycle size={16} className="sticky-order__icon--delivering" />
                      ) : (
                        <FaBoxOpen size={16} className="sticky-order__icon--preparing" />
                      )}
                    </div>
                    <div className="sticky-order__popup-item-details">
                      <span className="sticky-order__popup-item-number">#{order.order_number}</span>
                      <span className="sticky-order__popup-item-time">
                        {`Arriving by ${calculateArrivalTime(order.estimated_delivery)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StickyTrackOrder;
