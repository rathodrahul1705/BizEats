import React, { useState, useEffect } from "react";
import { Trash, Search, Filter, ChevronLeft, ChevronRight, ShoppingCart, User, Store, Clock, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import "../assets/css/vendor/CartManagement.css";

const CartManagement = () => {
  const { restaurant_id } = useParams();
  const [carts, setCarts] = useState([]);
  const [filteredCarts, setFilteredCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  useEffect(() => {
    fetchCarts();
  }, [restaurant_id]);

  useEffect(() => {
    applyFilters();
  }, [carts, searchTerm, statusFilter, customerFilter]);

  const fetchCarts = async () => {
    try {
      setLoading(true);
      const response = await fetchData(
        API_ENDPOINTS.USER.CART_LIST,
        "GET",
        null,
        localStorage.getItem("access")
      );
      setCarts(response?.carts || []);
    } catch (error) {
      console.error("Error fetching carts:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...carts];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cart => {
        const searchText = [
          cart.user?.name || '',
          cart.item?.name || '',
          cart.order_number || '',
          cart.cart_status || ''
        ].join(' ').toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(cart => 
        statusFilter === "completed" 
          ? cart.cart_status === "Payment Completed"
          : cart.cart_status !== "Payment Completed"
      );
    }
    
    // Customer filter
    if (customerFilter !== "all") {
      filtered = filtered.filter(cart => 
        customerFilter === "registered" 
          ? cart.user?.id !== null
          : cart.user?.id === null
      );
    }
    
    setFilteredCarts(filtered);
    setCurrentPage(1);
    setExpandedRows({});
  };

  const handleDelete = async (cartId) => {
    if (!window.confirm("Are you sure you want to delete this cart item?")) return;
    
    try {
      await fetchData(
        API_ENDPOINTS.CART.DELETE(cartId),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      fetchCarts();
    } catch (error) {
      console.error("Error:", error);
      fetchCarts();
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCustomerFilter("all");
  };

  const toggleRowExpand = (cartId) => {
    setExpandedRows(prev => ({
      ...prev,
      [cartId]: !prev[cartId]
    }));
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCarts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCarts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusClass = (status) => {
    switch(status) {
      case "Payment Completed": return "completed";
      case "Proceeded for Checkout": return "processing";
      case "Item Added": return "pending";
      default: return "default";
    }
  };

  if (loading && carts.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="cart-management">
      <div className="cart-container">
        {/* Header */}
        <header className="cart-header">
          <div className="header-content">
            <h1>Cart Management</h1>
            <p>{filteredCarts.length} {filteredCarts.length === 1 ? 'item' : 'items'} found</p>
          </div>
          <button className="refresh-btn" onClick={fetchCarts}>
            <RefreshCw size={18} />
            <span>Refresh</span>
          </button>
        </header>

        {/* Filter Section */}
        <section className="filter-section">
          <div className="search-filter-container">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search carts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="filter-options">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Payment Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Customer Type</label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                >
                  <option value="all">All Customers</option>
                  <option value="registered">Registered Users</option>
                  <option value="guest">Guest Users</option>
                </select>
              </div>
              
              <button className="reset-filters" onClick={resetFilters}>
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* Cart Items */}
        {filteredCarts.length > 0 ? (
          <div className="cart-content">
            {/* Desktop Table */}
            <div className="desktop-view">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Item</th>
                    <th>Restaurant</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((cart) => (
                    <tr key={`${cart.id}-${cart.updated_at}`}>
                      <td>
                        <div className="user-info">
                          <div className={`avatar ${cart.user?.id ? 'registered' : 'guest'}`}>
                            <User size={16} />
                          </div>
                          <div>
                            <div className="name">{cart.user?.name || 'Guest'}</div>
                            <div className="email">{cart.user?.email || cart.item.session_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="item-name">{cart.item?.name}</div>
                        <div className="item-desc">{cart.item?.description || 'No description'}</div>
                      </td>
                      <td>
                        <div className="restaurant-info">
                          <div className="avatar">
                            <Store size={16} />
                          </div>
                          <div>
                            <div className="name">{cart.restaurant?.name}</div>
                            <div className="id">{cart.restaurant?.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="quantity">{cart.quantity}</div>
                        {cart.buy_one_get_one_free && (
                          <span className="tag bogo">BOGO</span>
                        )}
                      </td>
                      <td>
                        {/* <div className="price">₹{(cart.item?.price * cart.quantity).toFixed(2)}</div> */}
                        <div className="unit-price">₹{parseFloat(cart.item?.price || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <span className={`status ${getStatusClass(cart.cart_status)}`}>
                          {cart.cart_status}
                        </span>
                        {cart.order_number && (
                          <div className="order-number-num">{cart.order_number}</div>
                        )}
                      </td>
                      <td>
                        <div className="date">
                          <Clock size={14} />
                          {formatDate(cart.created_at)}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(cart.id)}
                          className="delete-btn"
                          title="Delete"
                        >
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="mobile-view">
              {currentItems.map((cart) => (
                <div 
                  key={`mobile-${cart.id}`} 
                  className={`cart-item ${expandedRows[cart.id] ? 'expanded' : ''}`}
                >
                  <div 
                    className="item-header"
                    onClick={() => toggleRowExpand(cart.id)}
                  >
                    <div className="user-info">
                      <div className={`avatar ${cart.user?.id ? 'registered' : 'guest'}`}>
                        <User size={16} />
                      </div>
                      <div>
                        <div className="name">{cart.user?.name || 'Guest'}</div>
                        <div className="item">{cart.item?.name}</div>
                      </div>
                    </div>
                    <div className="status-container">
                      <span className={`status ${getStatusClass(cart.cart_status)}`}>
                        {cart.cart_status.split(' ')[0]}
                      </span>
                      {expandedRows[cart.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  
                  {expandedRows[cart.id] && (
                    <div className="item-details">
                      <div className="detail-row">
                        <span>Item:</span>
                        <span>{cart.item?.name}</span>
                      </div>
                      <div className="detail-row">
                        <span>Description:</span>
                        <span>{cart.item?.description || 'No description'}</span>
                      </div>
                      <div className="detail-row">
                        <span>Restaurant:</span>
                        <span>{cart.restaurant?.name}</span>
                      </div>
                      <div className="detail-row">
                        <span>Quantity:</span>
                        <span>
                          {cart.quantity}
                          {cart.buy_one_get_one_free && <span className="tag bogo">BOGO</span>}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Price:</span>
                        <span>
                          ₹{(cart.item?.price * cart.quantity).toFixed(2)}
                          <small> (₹{parseFloat(cart.item?.price || 0).toFixed(2)} each)</small>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Order #:</span>
                        <span>{cart.order_number || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span>Date:</span>
                        <span className="date">
                          <Clock size={14} />
                          {formatDate(cart.created_at)}
                        </span>
                      </div>
                      <div className="actions">
                        <button
                          onClick={() => handleDelete(cart.id)}
                          className="delete-btn"
                        >
                          <Trash size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {indexOfFirstItem + 1} to{' '}
                  {Math.min(indexOfLastItem, filteredCarts.length)} of {filteredCarts.length} items
                </div>
                <div className="pagination-controls">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={currentPage === number ? 'active' : ''}
                    >
                      {number}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <ShoppingCart size={40} />
            </div>
            <h3>No cart items found</h3>
            <p>
              {carts.length === 0 
                ? "Your restaurant doesn't have any cart items yet." 
                : "No cart items match your current filters."}
            </p>
            {carts.length > 0 && (
              <button onClick={resetFilters}>
                Reset all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartManagement;