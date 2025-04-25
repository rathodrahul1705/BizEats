import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/css/vendor/DashboardOverview.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const DashboardOverview = ({ user, setUser }) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    delivered_orders: 0
  });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [timeRangeFilter, setTimeRangeFilter] = useState("today");

  const handleRestaurantChange = (event) => {
    const restaurantId = event.target.value;
    const restaurant = restaurantsList.find((r) => r.restaurant_id === restaurantId);
    setSelectedRestaurant(restaurant);
  };

  const handleDateChange = (event) => {
    setDateFilter(event.target.value);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRangeFilter(event.target.value);
  };

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {
      try {
        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.BY_USER(user?.user_id),
          "GET",
          null,
          localStorage.getItem("access")
        );
        if (response?.live_restaurants?.length) {
          setRestaurantsList(response.live_restaurants);
          setSelectedRestaurant(response.live_restaurants[0]);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  useEffect(() => {
    if (!selectedRestaurant?.restaurant_id) return;
  
    const fetchVendorCountDetails = async () => {
      try {
        const payload = {
          restaurant_id: selectedRestaurant?.restaurant_id || "",
          date: dateFilter,
          time_range: timeRangeFilter
        };
  
        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.RES_VENDOR_COUNT,
          "POST",
          payload,
          localStorage.getItem("access")
        );
  
        if (response?.status === "success") {
          setDashboardData(response.data);
        }
      } catch (error) {
        console.error("Error fetching vendor count details:", error);
      }
    };
  
    fetchVendorCountDetails();
  }, [selectedRestaurant?.restaurant_id, dateFilter, timeRangeFilter]);
  

  return (
    <div className="vendor-overview">
      {/* Header & Restaurant Dropdown */}
      <div className="vendor-header">
        <h2>Dashboard Overview</h2>
        <div className="dropdown-container">
          <label>Restaurant</label>
          <select value={selectedRestaurant?.restaurant_id || ""} onChange={handleRestaurantChange}>
            {restaurantsList.map((restaurant) => (
              <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                {restaurant.restaurant_name} ({restaurant.location?.area_sector_locality} {restaurant.location?.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters Section */}
      <div className="vendor-filters">
        <div className="filter-group">
          <label>Date</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={handleDateChange} 
          />
        </div>
        <div className="filter-group">
          <label>Time Range</label>
          <select value={timeRangeFilter} onChange={handleTimeRangeChange}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="vendor-container">
        <div className="vendor-summary">
          <div className="vendor-card">
            <h3>Total Orders</h3>
            <p>{dashboardData.total_orders}</p>
          </div>
          <div className="vendor-card">
            <h3>Revenue</h3>
            <p>₹{dashboardData.total_revenue}</p>
          </div>
          <div className="vendor-card">
            <h3>Pending Orders</h3>
            <p>{dashboardData.pending_orders}</p>
          </div>
          <div className="vendor-card">
            <h3>Delivered Orders</h3>
            <p>{dashboardData.delivered_orders}</p>
          </div>
        </div>

        {selectedRestaurant && (
          <div className="vendor-links">
            <h3>Quick Links</h3>
            <div className="vendor-link-grid">
              <Link to={`/vendor-dashboard/menu/${selectedRestaurant.restaurant_id}`} className="vendor-link-card">
                <h4>Menu Management</h4>
                <p>Manage your restaurant menu</p>
              </Link>
              <Link to={`/vendor-dashboard/order/management/${selectedRestaurant.restaurant_id}`} className="vendor-link-card">
                <h4>Order Management</h4>
                <p>View and manage orders</p>
              </Link>
              <Link to={`/register-your-restaurent`} className="vendor-link-card">
                <h4>Register Your Restaurant</h4>
                <p>Manage your restaurant</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;