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
    delivered_orders: 0,
  });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [timeRangeFilter, setTimeRangeFilter] = useState("today");
  const [isLoading, setIsLoading] = useState(true);

  const handleRestaurantChange = (event) => {
    const restaurantId = event.target.value;
    const restaurant = restaurantsList.find((r) => r.restaurant_id === restaurantId);
    setSelectedRestaurant(restaurant);
  };

  const handleDateChange = (event) => setDateFilter(event.target.value);
  const handleTimeRangeChange = (event) => setTimeRangeFilter(event.target.value);

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  useEffect(() => {
    if (!selectedRestaurant?.restaurant_id) return;

    const fetchVendorCountDetails = async () => {
      try {
        setIsLoading(true);
        const payload = {
          restaurant_id: selectedRestaurant.restaurant_id,
          date: dateFilter,
          time_range: timeRangeFilter,
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorCountDetails();
  }, [selectedRestaurant?.restaurant_id, dateFilter, timeRangeFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₹', '₹');
  };

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-overview">
        <div className="header-section">
          <h2>Dashboard Overview</h2>
          <div className="dropdown-wrapper">
            <label>Restaurant</label>
            <select 
              value={selectedRestaurant?.restaurant_id || ""} 
              onChange={handleRestaurantChange}
              disabled={isLoading}
            >
              {restaurantsList.map((restaurant) => (
                <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                  {restaurant.restaurant_name} ({restaurant.location?.area_sector_locality}, {restaurant.location?.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters">
          <div className="filter-item">
            <label>Date</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={handleDateChange}
              disabled={isLoading}
            />
          </div>
          <div className="filter-item">
            <label>Time Range</label>
            <select 
              value={timeRangeFilter} 
              onChange={handleTimeRangeChange}
              disabled={isLoading}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <div className="dashboard-content">
            <div className="summary-cards">
              <div className="card">
                <h3>Total Orders</h3>
                <p>{dashboardData.total_orders}</p>
                <div className="card-badge">Today</div>
              </div>
              <div className="card">
                <h3>Revenue</h3>
                <p>{formatCurrency(dashboardData.total_revenue)}</p>
                <div className="card-badge">All Time</div>
              </div>
              <div className="card">
                <h3>Pending Orders</h3>
                <p>{dashboardData.pending_orders}</p>
                <div className="card-badge">Active</div>
              </div>
              <div className="card">
                <h3>Delivered Orders</h3>
                <p>{dashboardData.delivered_orders}</p>
                <div className="card-badge">Completed</div>
              </div>
            </div>

            {selectedRestaurant && (
              <div className="quick-links">
                <h3>Quick Actions</h3>
                <div className="links-grid">
                  <Link 
                    to={`/vendor-dashboard/menu/${selectedRestaurant.restaurant_id}`} 
                    className="link-card"
                  >
                    <div className="link-icon"></div>
                    <h4>Menu Management</h4>
                    <p>Update your restaurant menu items</p>
                    <div className="link-arrow">→</div>
                  </Link>
                  <Link 
                    to={`/vendor-dashboard/order/management/${selectedRestaurant.restaurant_id}`} 
                    className="link-card"
                  >
                    <div className="link-icon"></div>
                    <h4>Order Management</h4>
                    <p>View and process customer orders</p>
                    <div className="link-arrow">→</div>
                  </Link>
                  <Link 
                    to={`/register-your-restaurent`} 
                    className="link-card"
                  >
                    <div className="link-icon"></div>
                    <h4>Restaurant Settings</h4>
                    <p>Manage your restaurant details</p>
                    <div className="link-arrow">→</div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;