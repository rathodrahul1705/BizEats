import React, { useEffect, useState } from "react";
import fetchData from "../components/services/apiService";
import API_ENDPOINTS from "../components/config/apiConfig";
import "../assets/css/vendor/OrderManagement.css";
import { useParams } from "react-router-dom";

const statusOptions = [
  { id: 1, label: "Pending" },
  { id: 2, label: "Confirmed" },
  { id: 3, label: "Preparing" },
  { id: 4, label: "Ready for Delivery/Pickup" },
  { id: 5, label: "On the Way" },
  { id: 6, label: "Delivered" },
  { id: 7, label: "Cancelled" },
  { id: 8, label: "Refunded" },
];

const OrderManagement = ({ user }) => {
  const { restaurant_id } = useParams();
  const [orders, setOrders] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [recentlyUpdatedOrder, setRecentlyUpdatedOrder] = useState(null);

  const fetchVendorOrders = async () => {
    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.VENDOR_ORDERS, "POST", {
        restaurant_id: restaurant_id,
      });

      if (response.status === "success") {
        const formattedOrders = response.orders.map((order) => {
          const statusObj = statusOptions.find(s => s.id === order.status) || { id: 1, label: "Pending" };
          return {
            ...order,
            status: statusObj,
          };
        });
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, [restaurant_id]);

  const handleStatusChange = async (orderNumber, statusId) => {
    try {
      const newStatusObj = statusOptions.find(s => s.id === parseInt(statusId));
      const response = await fetchData(API_ENDPOINTS.ORDER.UPDATE_ORDER_STATUS, "POST", {
        order_number: orderNumber,
        new_status: parseInt(statusId),
      });

      if (response.status === "success") {
        const updated = orders.map((order) =>
          order.order_number === orderNumber ? { ...order, status: newStatusObj } : order
        );
        setOrders(updated);
        setRecentlyUpdatedOrder(orderNumber);
        setTimeout(() => setRecentlyUpdatedOrder(null), 3000);

        if (newStatusObj.label === "On the Way") {
          updateLiveLocation(orderNumber);
        }
      } else {
        console.error("Failed to update status:", response.message);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateLiveLocation = async (orderNumber) => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      try {
        const response = await fetch(API_ENDPOINTS.TRACK.UPDATE_LIVE_LOCATION, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_number: orderNumber,
            latitude,
            longitude,
          }),
        });

        const data = await response.json();
        if (data.status === "success") {
          console.log(`Live location updated for order ${orderNumber}`);
        } else {
          console.error("Live location update failed:", data.message);
        }
      } catch (error) {
        console.error("Error updating live location:", error);
      }
    });
  };

  // ⏱ Live location auto update for "On the Way" orders every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const onTheWayOrders = orders.filter(order => order.status.label === "On the Way");
      onTheWayOrders.forEach(order => {
        updateLiveLocation(order.order_number);
      });
    }, 120000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    const matchesId = order.order_number.toLowerCase().includes(searchId.toLowerCase());
    const matchesName = order.full_name.toLowerCase().includes(searchName.toLowerCase());
    const matchesStatus = filterStatus === "All" || order.status.label === filterStatus;

    return matchesId && matchesName && matchesStatus;
  });

  return (
    <div className="vendor-orders">
      <h2 className="vendor-order-title">Order Management</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by Order ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search by Customer Name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All</option>
          {statusOptions.map((status) => (
            <option key={status.id} value={status.label}>{status.label}</option>
          ))}
        </select>
      </div>

      <div className="vendor-order-list">
        {filteredOrders.map((order) => (
          <div className="vendor-card" key={order.order_number}>
            <div className="vendor-card-header">
              <div className="vendor-card-info">
                <h3 className="order-number">#{order.order_number}</h3>
                <p><strong>Placed:</strong> {order.placed_on}</p>
              </div>
              <div className="status-box">
                <label htmlFor={`status-${order.order_number}`}>Status</label>
                <select
                  id={`status-${order.order_number}`}
                  className="status-select"
                  value={order.status.id}
                  onChange={(e) => handleStatusChange(order.order_number, e.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
                {recentlyUpdatedOrder === order.order_number && (
                  <p className="status-update-success">Status updated successfully ✅</p>
                )}
              </div>
            </div>

            <hr className="order-divider" />

            <div className="vendor-card-body">
              <p><strong>Customer:</strong> {order.full_name}</p>
              <p><strong>Estimated Delivery:</strong> {order.estimated_delivery}</p>

              <div className="item-list">
                {order.items.map((item, i) => (
                  <div key={i} className="item">
                    <span>{item.item_name} x{item.quantity}</span>
                    <span>₹{item.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="pricing">
                <p><strong>Subtotal:</strong> ₹{order.subtotal}</p>
                <p><strong>Delivery Fee:</strong> ₹{order.delivery_fee}</p>
                <p><strong>Total:</strong> ₹{order.total}</p>
              </div>

              {order.status.label === "On the Way" && (
                <button
                  className="update-location-btn"
                  onClick={() => updateLiveLocation(order.order_number)}
                >
                  Update Live Location 📍
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderManagement;
