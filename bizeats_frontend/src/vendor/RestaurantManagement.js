import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit, Trash, PlusCircle, Search, Filter, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import "../assets/css/vendor/RestaurantManagement.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const RestaurantManagement = ({ user }) => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);

  const restaurantStatuses = [
    { value: 0, label: "Inactive", color: "danger" },
    { value: 1, label: "Pending Approval", color: "warning" },
    { value: 2, label: "Active", color: "success" },
    { value: 3, label: "Closed", color: "dark" },
    { value: 4, label: "Suspended", color: "secondary" },
  ];

  useEffect(() => {
    if (user?.user_id) {
      fetchRestaurants();
    }
  }, [user?.user_id]);

  useEffect(() => {
    applyFilters();
  }, [restaurants, searchTerm, statusFilter]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.BY_USER(user.user_id),
        "GET",
        null,
        localStorage.getItem("access")
      );
      setRestaurants(response.live_restaurants || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...restaurants];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
        restaurant.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (restaurant.location?.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (restaurant.cuisines?.some(c => c.cuisine_name?.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(restaurant => 
        restaurant.restaurant_status === parseInt(statusFilter)
      );
    }
    
    setFilteredRestaurants(filtered);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const getStatusBadge = (status) => {
    const statusInfo = restaurantStatuses.find(s => s.value === status);
    if (!statusInfo) return null;
    
    return (
      <span className={`status-badge-message status-${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatAddress = (location) => {
    if (!location) return "";
    const parts = [
      location.shop_no_building,
      location.floor_tower,
      location.area_sector_locality,
      location.city
    ].filter(Boolean);
    return parts.join(", ");
  };

  const getCuisines = (cuisines) => {
    if (!cuisines) return "";
    return cuisines
      .filter(c => c.cuisine_name)
      .map(c => c.cuisine_name)
      .join(", ");
  };

  const handleGetStarted = () => {
    navigate("/register-restaurant");
  };

  const handleNavigate = (restaurant_id) => {
    navigate(`/register-restaurant/${restaurant_id}`);
  };

  const toggleRowExpand = (restaurantId) => {
    setExpandedRows(prev => 
      prev.includes(restaurantId) 
        ? prev.filter(id => id !== restaurantId) 
        : [...prev, restaurantId]
    );
  };

  const updateRestaurantStatus = async (restaurantId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [restaurantId]: true }));
      
      await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_STATUS_UPDATE(restaurantId),
        "PATCH",
        { status: newStatus },
        localStorage.getItem("access")
      );
      
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.restaurant_id === restaurantId 
            ? { ...restaurant, restaurant_status: newStatus } 
            : restaurant
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [restaurantId]: false }));
    }
  };

  if (loading && restaurants.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="restaurant-management-container">
      <div className="restaurant-management-header">
        <h2>Restaurant Management</h2>
        <button className="add-restaurant-button" onClick={handleGetStarted}>
          Register Restaurant
          <ArrowRight size={20} className="cta-icon" />
        </button>
      </div>

      {/* Filter Section */}
      <div className="restaurant-filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            <span>Filters</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                <option value="all">All</option>
                {restaurantStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <button 
              className="reset-filters"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="results-count">
        Showing {filteredRestaurants.length} of {restaurants.length} restaurants
      </div>

      {filteredRestaurants.length > 0 ? (
        <div className="table-container">
          <table className="restaurant-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                {/* <th>Address</th> */}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((restaurant) => (
                <React.Fragment key={restaurant.restaurant_id}>
                  <tr className="main-row">
                    <td className="expand-toggle" onClick={() => toggleRowExpand(restaurant.restaurant_id)}>
                      {expandedRows.includes(restaurant.restaurant_id) ? <ChevronUp /> : <ChevronDown />}
                    </td>
                    <td>
                      <div className="restaurant-name-cell">
                        <img 
                          className="restaurant-image" 
                          src={restaurant.profile_image || "https://via.placeholder.com/60"} 
                          alt={restaurant.restaurant_name} 
                        />
                        <span>{restaurant.restaurant_name}</span>
                      </div>
                    </td>
                    {/* <td>{formatAddress(restaurant.location)}</td> */}
                    <td>
                      {updatingStatus[restaurant.restaurant_id] ? (
                        <span className="status-loading">Updating...</span>
                      ) : (
                        <select
                          className={`status-select status-${restaurantStatuses.find(s => s.value === restaurant.restaurant_status)?.color || 'default'}`}
                          value={restaurant.restaurant_status}
                          onChange={(e) => updateRestaurantStatus(restaurant.restaurant_id, parseInt(e.target.value))}
                          disabled={updatingStatus[restaurant.restaurant_id]}
                        >
                          {restaurantStatuses.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button" 
                          onClick={() => handleNavigate(restaurant.restaurant_id)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="delete-button" 
                          onClick={() => console.log("Delete", restaurant.restaurant_id)}
                          aria-label="Delete restaurant"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.includes(restaurant.restaurant_id) && (
                    <tr className="expanded-row">
                      <td colSpan="5">
                        <div className="expanded-content">
                          <div className="expanded-detail">
                            <h4>Cuisines</h4>
                            <p>{getCuisines(restaurant.cuisines) || "-"}</p>
                          </div>
                          <div className="expanded-detail">
                            <h4>Menu Items</h4>
                            <p>{restaurant.menu_items?.length || 0}</p>
                          </div>
                          <div className="expanded-detail">
                            <h4>Description</h4>
                            <p>{restaurant.description || "-"}</p>
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
      ) : (
        <div className="empty-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
          <h3>No Restaurants Found</h3>
          <p>{restaurants.length === 0 ? "Add your first restaurant to get started" : "No restaurants match your filters"}</p>
          {restaurants.length > 0 && (
            <button 
              className="reset-filters"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantManagement;