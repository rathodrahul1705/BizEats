import React, { useEffect, useState } from "react";
import fetchData from "../components/services/apiService";
import API_ENDPOINTS from "../components/config/apiConfig";
import "../assets/css/vendor/OrderManagement.css";
import { useParams } from "react-router-dom";
import { FaPhone, FaMapMarkerAlt, FaCreditCard, FaUser, FaClock, FaMotorcycle, FaWhatsapp } from "react-icons/fa";
import StripeLoader from "../loader/StripeLoader";

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

// Map status strings to IDs
const statusStringToId = {
  "Pending": 1,
  "Confirmed": 2,
  "Preparing": 3,
  "Ready for Delivery/Pickup": 4,
  "On the Way": 5,
  "Delivered": 6,
  "Cancelled": 7,
  "Refunded": 8
};

const paymentMethodIcons = {
  "credit_card": <FaCreditCard />,
  "debit_card": <FaCreditCard />,
  "upi": "💳",
  "net_banking": "🏦",
  "cash_on_delivery": "💰",
  "Eatoor Money": "💰"
};

const OrderManagement = ({ user }) => {
  const { restaurant_id } = useParams();
  const [orders, setOrders] = useState([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [recentlyUpdatedOrder, setRecentlyUpdatedOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "Admin";
  const getAllowedStatusOptions = () => {
    if (isAdmin) {
      return statusOptions;
    }
    return statusOptions.slice(0, 4);
  };

  const fetchVendorOrders = async () => {
    try {
      setLoading(true);
      const response = await fetchData(API_ENDPOINTS.ORDER.VENDOR_ORDERS, "POST", {
        restaurant_id: restaurant_id,
      });

      if (response.status === "success") {
        const formattedOrders = response.orders.map((order) => {
          // Map status string to status object
          const statusId = statusStringToId[order.status] || 1;
          const statusObj = statusOptions.find(s => s.id === statusId) || { id: 1, label: "Pending" };
          
          return {
            ...order,
            status: statusObj,
            // Ensure payment_status is properly set
            payment_status: order.payment_status || "Pending",
            // Format amounts to numbers
            subtotal: parseFloat(order.subtotal) || 0,
            delivery_fee: parseFloat(order.delivery_fee) || 0,
            total: parseFloat(order.total) || 0,
            discount: parseFloat(order.discount) || 0,
          };
        });
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, [restaurant_id]);

  const handleStatusChange = async (orderNumber, statusId) => {
    try {
      const newStatusObj = statusOptions.find(s => s.id === parseInt(statusId));
      
      // Check if status change is allowed for non-admin users
      if (!isAdmin && parseInt(statusId) > 4) {
        alert("You don't have permission to update to this status");
        return;
      }

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
      const activeStatuses = ["On the Way", "Ready for Delivery/Pickup"];
      const activeOrders = orders.filter(order =>
        activeStatuses.includes(order.status.label)
      );
      activeOrders.forEach(order => {
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
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to mark order as paid');
    }
    
    return response.json();
  };

  const handleMarkAsPaid = async (orderNumber) => {
    try {
      await markOrderAsPaid(orderNumber);
      
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
      alert('Failed to mark order as paid. Please try again.');
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

  const shareOnWhatsApp = (order) => {
    const orderDetails = `
*Order Details*:
📋 *Order Number*: #${order.order_number}

*Customer Details*:
👤 *Name*: ${order.full_name || 'N/A'}
📞 *Contact*: ${order.phone_number || 'N/A'}
📍 *Address*: ${order.delivery_address || 'N/A'}

*Payment Information*:
💳 *Method*: ${order.payment_method ? order.payment_method.replace(/_/g, ' ') : 'N/A'}
✅ *Status*: ${order.payment_status || 'N/A'}
💰 *Amount*: ₹${order.total.toFixed(2)}

*Timing*:
📅 *Order Placed*: ${convertUTCtoIST(order.placed_on)}
⏱️ *Estimated Delivery*: ${convertUTCtoIST(order.estimated_delivery)}

*Status*: ${order.status.label}
    `;

    const encodedMessage = encodeURIComponent(orderDetails);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderPaymentStatusBadge = (order) => {
    const status = order.status.label.toLowerCase();
    const isCOD = order.payment_method === 'cash_on_delivery' || order.payment_method === 'Cash on Delivery';
    const isEatoorMoney = order.payment_method === 'Eatoor Money';

    // For cancelled or refunded orders
    if (['cancelled', 'refunded'].includes(status)) {
      return (
        <span className="marked-paid-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
          Payment: {order.payment_status === "Completed" ? '✅ Completed' : '❌ Failed'}
        </span>
      );
    }

    // For Eatoor Money or non-COD orders, they're always "paid"
    if (isEatoorMoney || !isCOD) {
      return (
        <span className="marked-paid-badge" style={{ backgroundColor: 'rgba(0, 168, 120, 0.1)', color: '#00A878' }}>
          Payment: {order.payment_status === "Completed" ? '✅ Completed' : '⏳ Pending'}
        </span>
      );
    }

    // For COD orders
    if (isCOD) {
      return (
        <span className="marked-paid-badge" style={{ 
          backgroundColor: order.payment_status === "Completed" ? 'rgba(0, 168, 120, 0.1)' : 'rgba(255, 159, 28, 0.1)',
          color: order.payment_status === "Completed" ? '#00A878' : '#F59E0B'
        }}>
          Payment: {order.payment_status === "Completed" ? '✅ Completed' : '⏳ Pending'}
        </span>
      );
    }

    return null;
  };

  const shouldShowMarkAsPaidButton = (order) => {
    const isDelivered = order.status.label.toLowerCase() === 'delivered';
    const isCOD = order.payment_method === 'cash_on_delivery' || order.payment_method === 'Cash on Delivery';
    const isNotPaid = order.payment_status !== "Completed";
    
    return isDelivered && isCOD && isNotPaid;
  };

  // Show loader only during initial loading or when no orders and still loading
  if (loading) {
    return <StripeLoader />;
  }

  // Show no orders message when there are no orders
  if (orders.length === 0) {
    return (
      <div className="vendor-orders">
        <div className="vendor-orders-header">
          <h2 className="vendor-order-title">Order Management</h2>
        </div>
        <div className="no-orders">
          <p>No orders found for this restaurant</p>
        </div>
      </div>
    );
  }

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
          {filteredOrders.map((order) => {
            // Check if status select should be disabled
            const isStatusLocked = ['Cancelled', 'Refunded'].includes(order.status.label);
            
            return (
              <div className={`vendor-card ${expandedOrder === order.order_number ? 'expanded' : ''}`} key={order.order_number}>
                <div className="vendor-card-header" onClick={() => toggleOrderExpand(order.order_number)}>
                  <div className="vendor-card-info">
                    <div className="order-number-status">
                      <h3 className="order-number">#{order.order_number}</h3>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status.label) }}>
                        {order.status.label}
                      </span>
                      {renderPaymentStatusBadge(order)}
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
                      disabled={isStatusLocked}
                    >
                      {getAllowedStatusOptions().map((status) => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                    
                    {shouldShowMarkAsPaidButton(order) && (
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
                        <p><strong>Status: </strong>{order.payment_status === 'Completed' ? 'Paid' : order.payment_status || 'Pending'}</p>
                        <p><strong>Transaction ID:</strong> {order.transaction_id || 'N/A'}</p>
                        <p><strong>Amount Paid:</strong> ₹{order.total.toFixed(2)}</p>
                      </div>

                      <div className="timeline-details">
                        <h4><FaClock /> Order Timeline</h4>
                        <p><strong>Placed:</strong> {convertUTCtoIST(order.placed_on)}</p>
                        <p><strong>Estimated Delivery:</strong> {convertUTCtoIST(order.estimated_delivery)}</p>
                        {order.status.label === "On the Way" && isAdmin && (
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
                        {order.items && order.items.map((item, i) => (
                          <div key={i} className="item">
                            <div className="item-info">
                              <span className="item-name">
                                {item.item_name}
                                {item.buy_one_get_one_free && (
                                  <span style={{ color: "green", fontWeight: "bold", marginLeft: "0.5rem" }}>
                                    (Buy 1 Get 1 Free)
                                  </span>
                                )}
                              </span>
                              {item.special_instructions && (
                                <p className="special-instructions">Note: {item.special_instructions}</p>
                              )}
                            </div>
                            <div className="item-quantity-price">
                              <span className="item-quantity">x{item.quantity}</span>
                              <span className="item-price">₹{parseFloat(item.total_price).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="order-summary">
                      <div className="summary-row">
                        <span>Item Total</span>
                        <span>₹{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="summary-row">
                        <span>Delivery Fee</span>
                        <span>₹{order.delivery_fee.toFixed(2)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="summary-row discount">
                          <span>Discount</span>
                          <span>-₹{order.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="summary-row total">
                        <span>Total</span>
                        <span>₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="share-order-container">
                      <button 
                        className="share-order-btn"
                        onClick={() => shareOnWhatsApp(order)}
                      >
                        <FaWhatsapp /> Share Order Details on WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;