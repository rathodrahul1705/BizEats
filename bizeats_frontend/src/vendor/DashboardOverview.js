import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/css/vendor/DashboardOverview.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const DashboardOverview = ({ user, setUser }) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantsList, setRestaurantsList] = useState([]);

  const handleRestaurantChange = (event) => {
    const restaurantId = event.target.value; // Keep as string
    const restaurant = restaurantsList.find((r) => r.restaurant_id === restaurantId);
    setSelectedRestaurant(restaurant);
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
          setSelectedRestaurant(response.live_restaurants[0]); // Set default selection
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

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

      <div className="vendor-container">
        <div className="vendor-summary">
          <div className="vendor-card">
            <h3>Total Orders Today</h3>
            <p>87</p>
          </div>
          <div className="vendor-card">
            <h3>Revenue Today</h3>
            <p>878</p>
          </div>
          <div className="vendor-card">
            <h3>Pending Orders</h3>
            <p>878</p>
          </div>
          <div className="vendor-card">
            <h3>Customer Reviews</h3>
            <p>878</p>
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
              <Link to={`/vendor-dashboard/analytics/${selectedRestaurant.restaurant_id}`} className="vendor-link-card">
                <h4>Analytics</h4>
                <p>View sales and insights</p>
              </Link>
              <Link to={`/vendor-dashboard/notifications/${selectedRestaurant.restaurant_id}`} className="vendor-link-card">
                <h4>Notifications</h4>
                <p>Check alerts and messages</p>
              </Link>
              <Link to={`/vendor-dashboard/settings/${selectedRestaurant.restaurant_id}`} className="vendor-link-card">
                <h4>Settings</h4>
                <p>Update restaurant details</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
