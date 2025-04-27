import React, { useEffect, useState } from "react";
import fetchData from "../components/services/apiService";
import API_ENDPOINTS from "../components/config/apiConfig";
import "../assets/css/vendor/OrderManagement.css";
import { useParams } from "react-router-dom";
import { FaPhone, FaMapMarkerAlt, FaCreditCard, FaUser, FaClock, FaMotorcycle } from "react-icons/fa";

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

const paymentMethodIcons = {
  "credit_card": <FaCreditCard />,
  "debit_card": <FaCreditCard />,
  "upi": "💳",
  "net_banking": "🏦",
  "cash_on_delivery": "💰"
};

const OrderManagement = ({ user }) => {
  const { restaurant_id } = useParams();
  const [orders, setOrders] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [recentlyUpdatedOrder, setRecentlyUpdatedOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  useEffect(() => {
    const interval = setInterval(() => {
      const onTheWayOrders = orders.filter(order => order.status.label === "On the Way");
      onTheWayOrders.forEach(order => {
        updateLiveLocation(order.order_number);
      });
    }, 120000);

    return () => clearInterval(interval);
  }, [orders]);

  const toggleOrderExpand = (orderNumber) => {
    setExpandedOrder(expandedOrder === orderNumber ? null : orderNumber);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesId = order.order_number.toLowerCase().includes(searchId.toLowerCase());
    const matchesName = order.full_name.toLowerCase().includes(searchName.toLowerCase());
    const matchesStatus = filterStatus === "All" || order.status.label === filterStatus;

    return matchesId && matchesName && matchesStatus;
  });

  const convertUTCtoIST = (utcDateString) => {
    if (!utcDateString) return "N/A";
    const utcDate = new Date(utcDateString.replace(' ', 'T') + 'Z');
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
  
    const [datePart, timePart] = formattedDate.split(' ');
    const dateWithHyphen = datePart.replace(/\//g, '-');
    return `${dateWithHyphen}, ${timePart}`;
  };

  const markOrderAsPaid = async (orderNumber) => {
    const accessToken = localStorage.getItem("access");
    const response = await fetch(API_ENDPOINTS.PAYMENT.MARKED_PAYMENT(orderNumber), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // If needed
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark order as paid');
    }
    
    return response.json();
  };

  const handleMarkAsPaid = async (orderNumber) => {
    try {
      const response = await markOrderAsPaid(orderNumber);
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.order_number === orderNumber 
            ? { ...order, payment_status: "Completed" } 
            : order
        )
      );
      
      setRecentlyUpdatedOrder(orderNumber);
      setTimeout(() => setRecentlyUpdatedOrder(null), 3000);
    } catch (error) {
      console.error('Failed to mark order as paid:', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Pending": return "#F59E0B";
      case "Confirmed": return "#3B82F6";
      case "Preparing": return "#6366F1";
      case "Ready for Delivery/Pickup": return "#10B981";
      case "On the Way": return "#8B5CF6";
      case "Delivered": return "#10B981";
      case "Cancelled": return "#EF4444";
      case "Refunded": return "#6B7280";
      default: return "#6B7280";
    }
  };

  return (
    <div className="vendor-orders">
      <div className="vendor-orders-header">
        <h2 className="vendor-order-title">Order Management</h2>
        <div className="order-stats">
          <span>Total Orders: {orders.length}</span>
          <span>Pending: {orders.filter(o => o.status.label === "Pending").length}</span>
          <span>Delivered: {orders.filter(o => o.status.label === "Delivered").length}</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-group">
          <input
            type="text"
            placeholder="Search by Order ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
        </div>
        <div className="search-group">
          <input
            type="text"
            placeholder="Search by Customer Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status.id} value={status.label}>{status.label}</option>
            ))}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchVendorOrders}>
          Refresh Orders
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <p>No orders found matching your criteria</p>
        </div>
      ) : (
        <div className="vendor-order-list">
          {filteredOrders.map((order) => (
            <div className={`vendor-card ${expandedOrder === order.order_number ? 'expanded' : ''}`} key={order.order_number}>
              <div className="vendor-card-header" onClick={() => toggleOrderExpand(order.order_number)}>
              <div className="vendor-card-info">
                <div className="order-number-status">
                  <h3 className="order-number">#{order.order_number}</h3>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status.label) }}>
                    {order.status.label}
                  </span>
                  {(() => {
                    const status = order.status.label.toLowerCase();
                    const isCOD = order.payment_method === 'Cash on Delivery';

                    if (['canceled', 'refunded'].includes(status)) {
                      return (
                        <span className="marked-paid-badge">
                          Marked as Paid: ❌
                        </span>
                      );
                    }

                    if (isCOD) {
                        return (
                          <span className="marked-paid-badge">
                            Marked as Paid: {order?.payment_status == "Completed" ? '✅' : '❌'}
                          </span>
                        );
                      return null; // For other statuses, show nothing
                    }

                    return (
                      <span className="marked-paid-badge">
                        Marked as Paid: ✅
                      </span>
                    );
                  })()}

                </div>
                <p className="order-time"><FaClock /> {convertUTCtoIST(order.placed_on)}</p>
              </div>
              <div className="customer-info-mini">
                <p><FaUser /> {order.full_name}</p>
                <p>
                  <FaPhone />{' '}
                  {order.phone_number ? (
                    <a
                      href={`tel:${order.phone_number}`}
                      style={{ color: '#007bff' }}
                    >
                      {order.phone_number}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div className="order-actions">
                <select
                  className="status-select"
                  value={order.status.id}
                  onChange={(e) => handleStatusChange(order.order_number, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={order.status.id == '7' || order.status.id == '8'}
                >
                  {statusOptions.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
                
                {order.status.label.toLowerCase() === 'delivered' && 
                order.payment_method === 'Cash on Delivery' && order?.payment_status != "Completed" && (
                  <button 
                    className="mark-paid-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsPaid(order.order_number);
                    }}
                  >
                    Mark as Paid
                  </button>
                )}
                
                {recentlyUpdatedOrder === order.order_number && (
                  <p className="status-update-success">Status updated ✅</p>
                )}
              </div>
            </div>
              {expandedOrder === order.order_number && (
                <div className="vendor-card-details">
                  <div className="details-grid">
                    <div className="customer-details">
                      <h4><FaUser /> Customer Details</h4>
                      <p><strong>Name:</strong> {order.full_name}</p>
                      <p><strong>Phone:</strong> {order.phone_number || 'N/A'}</p>
                      <p><strong>Email:</strong> {order.email || 'N/A'}</p>
                    </div>

                    <div className="delivery-details-class">
                      <h4><FaMapMarkerAlt /> Delivery Address</h4>
                      {order.delivery_address ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#007bff' }}
                        >
                          {order.delivery_address}
                        </a>
                      ) : (
                        <p>N/A</p>
                      )}
                    </div>

                    <div className="payment-details-class">
                      <h4><FaCreditCard /> Payment Information</h4>
                      <p>
                        <strong>Method:</strong> 
                        <span className="payment-method">
                          {paymentMethodIcons[order.payment_method] || '💳'} 
                          {order.payment_method ? order.payment_method.replace(/_/g, ' ') : 'N/A'}
                        </span>
                      </p>
                      <p><strong>Status: </strong>{order.payment_status == 'Completed' ? "Paid" : order.payment_status || 'Paid'}</p>
                      <p><strong>Transaction ID:</strong> {order.transaction_id || 'N/A'}</p>
                      <p><strong>Amount Paid:</strong> ₹{order.total}</p>
                    </div>

                    <div className="timeline-details">
                      <h4><FaClock /> Order Timeline</h4>
                      <p><strong>Placed:</strong> {convertUTCtoIST(order.placed_on)}</p>
                      <p><strong>Estimated Delivery:</strong> {convertUTCtoIST(order.estimated_delivery)}</p>
                      {order.status.label === "On the Way" && (
                        <button
                          className="update-location-btn"
                          onClick={() => updateLiveLocation(order.order_number)}
                        >
                          <FaMotorcycle /> Update Live Location
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="item-list-container">
                    <h4>Order Items</h4>
                    <div className="item-list">
                      {order.items.map((item, i) => (
                        <div key={i} className="item">
                          <div className="item-info">
                            <span className="item-name">{item.item_name}</span>
                            {item.special_instructions && (
                              <p className="special-instructions">Note: {item.special_instructions}</p>
                            )}
                          </div>
                          <div className="item-quantity-price">
                            <span className="item-quantity">x{item.quantity}</span>
                            <span className="item-price">₹{item.total_price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-summary">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>₹{order.subtotal}</span>
                    </div>
                    <div className="summary-row">
                      <span>Delivery Fee</span>
                      <span>₹{order.delivery_fee}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="summary-row discount">
                        <span>Discount</span>
                        <span>-₹{order.discount}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>₹{order.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;