import React, { useState, useEffect, useMemo } from "react";
import { 
  Trash, Search, Filter, ChevronLeft, ChevronRight, 
  ShoppingCart, User, Store, Clock, ChevronDown, 
  ChevronUp, RefreshCw, X, Check, AlertCircle 
} from "lucide-react";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import "../assets/css/vendor/CartManagement.css";

const CartManagement = () => {
  const { restaurant_id } = useParams();
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch carts on component mount
  useEffect(() => {
    fetchCarts();
  }, [restaurant_id]);

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

  // Apply sorting, filtering and pagination
  const filteredCarts = useMemo(() => {
    let filtered = [...carts];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cart => {
        const searchText = [
          cart.user?.name || '',
          cart.item?.name || '',
          cart.order_number || '',
          cart.cart_status || '',
          cart.restaurant?.name || ''
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
    
    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        // Handle nested properties
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aValue = keys.reduce((obj, key) => obj?.[key], a);
          bValue = keys.reduce((obj, key) => obj?.[key], b);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        // Handle dates
        if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        // Handle numbers
        if (sortConfig.key === 'quantity' || sortConfig.key === 'item.price') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [carts, searchTerm, statusFilter, customerFilter, sortConfig]);

  // Pagination logic
  const paginatedCarts = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredCarts.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredCarts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCarts.length / itemsPerPage);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
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
    setSortConfig({ key: "created_at", direction: "desc" });
    setCurrentPage(1);
  };

  const toggleRowExpand = (cartId) => {
    setExpandedRows(prev => ({
      ...prev,
      [cartId]: !prev[cartId]
    }));
  };

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

  const getStatusIcon = (status) => {
    switch(status) {
      case "Payment Completed": return <Check size={14} />;
      case "Proceeded for Checkout": return <RefreshCw size={14} />;
      case "Item Added": return <AlertCircle size={14} />;
      default: return null;
    }
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
            <div className="header-stats">
              <div className="stat-item">
                <span className="stat-value">{filteredCarts.length}</span>
                <span className="stat-label">Total Items</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {filteredCarts.filter(c => c.cart_status === "Payment Completed").length}
                </span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {filteredCarts.filter(c => c.user?.id).length}
                </span>
                <span className="stat-label">Registered Users</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={fetchCarts}>
              <RefreshCw size={18} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Filter Section */}
        <section className="filter-section">
          <div className="search-filter-container">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search by customer, item, order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                <span>Filters</span>
              </button>
              {(searchTerm || statusFilter !== "all" || customerFilter !== "all") && (
                <button className="reset-filters-btn" onClick={resetFilters}>
                  <span>Reset All</span>
                </button>
              )}
            </div>
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
            </div>
          )}
        </section>

        {/* Cart Items */}
        {filteredCarts.length > 0 ? (
          <div className="cart-content">
            {/* Desktop Table */}
            <div className="desktop-view">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th 
                        className={sortConfig.key === 'user.name' ? 'active' : ''}
                        onClick={() => handleSort('user.name')}
                      >
                        Customer {sortConfig.key === 'user.name' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'item.name' ? 'active' : ''}
                        onClick={() => handleSort('item.name')}
                      >
                        Item {sortConfig.key === 'item.name' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'restaurant.name' ? 'active' : ''}
                        onClick={() => handleSort('restaurant.name')}
                      >
                        Restaurant {sortConfig.key === 'restaurant.name' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'quantity' ? 'active' : ''}
                        onClick={() => handleSort('quantity')}
                      >
                        Qty {sortConfig.key === 'quantity' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'item.price' ? 'active' : ''}
                        onClick={() => handleSort('item.price')}
                      >
                        Price {sortConfig.key === 'item.price' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'cart_status' ? 'active' : ''}
                        onClick={() => handleSort('cart_status')}
                      >
                        Status {sortConfig.key === 'cart_status' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className={sortConfig.key === 'created_at' ? 'active' : ''}
                        onClick={() => handleSort('created_at')}
                      >
                        Date {sortConfig.key === 'created_at' && (
                          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCarts.map((cart) => (
                      <React.Fragment key={`${cart.id}-${cart.updated_at}`}>
                        <tr>
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
                            <div className="price">₹{(cart.item?.price)}</div>
                          </td>
                          <td>
                            <div className={`status ${getStatusClass(cart.cart_status)}`}>
                              {getStatusIcon(cart.cart_status)}
                              <span>{cart.cart_status}</span>
                            </div>
                            {cart.order_number && (
                              <div className="order-number">#{cart.order_number}</div>
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
                        {expandedRows[cart.id] && (
                          <tr className="expanded-row">
                            <td colSpan="8">
                              <div className="expanded-content">
                                <div className="expanded-section">
                                  <h4>Item Details</h4>
                                </div>
                                <div className="expanded-section">
                                  <h4>Customer Information</h4>
                                  <p>{cart.user?.phone || 'No contact information'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile List */}
            <div className="mobile-view">
              {paginatedCarts.map((cart) => (
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
                        {getStatusIcon(cart.cart_status)}
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
            <div className="pagination-container">
              <div className="pagination-info">
                Showing <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCarts.length)}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, filteredCarts.length)}</strong> of{' '}
                <strong>{filteredCarts.length}</strong> items
              </div>
              
              <div className="pagination-controls">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="items-per-page"
                >
                  {[10, 25, 50, 100].map(size => (
                    <option key={size} value={size}>
                      Show {size}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <ChevronLeft size={18} />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="pagination-ellipsis">...</span>
                )}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`}
                  >
                    {totalPages}
                  </button>
                )}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <ShoppingCart size={48} />
            </div>
            <h3>No cart items found</h3>
            <p>
              {carts.length === 0 
                ? "There are no cart items in the system yet." 
                : "No cart items match your current search and filters."}
            </p>
            {carts.length > 0 && (
              <button onClick={resetFilters} className="primary-btn">
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