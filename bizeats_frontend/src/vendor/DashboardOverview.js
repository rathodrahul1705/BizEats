import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/css/vendor/DashboardOverview.css";

const DashboardOverview = () => {
  const restaurants = [
    { id: 1, name: "The Food Hub", location: "New York", orders: 25, revenue: 500, pendingOrders: 5, rating: "4.5/5" },
    { id: 2, name: "Spice Delight", location: "Los Angeles", orders: 30, revenue: 700, pendingOrders: 7, rating: "4.7/5" }
  ];

  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurants[0]);

  const handleRestaurantChange = (event) => {
    const restaurantId = parseInt(event.target.value);
    const restaurant = restaurants.find((r) => r.id === restaurantId);
    setSelectedRestaurant(restaurant);
  };

  return (
    <div className="vendor-overview">
      {/* Header & Restaurant Dropdown */}
      <div className="vendor-header">
        <h2>Dashboard Overview</h2>
        <div className="dropdown-container">
          <label>Restaurant</label>
          <select value={selectedRestaurant.id} onChange={handleRestaurantChange}>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name} ({restaurant.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="vendor-container">
        <div className="vendor-summary">
          <div className="vendor-card">
            <h3>Total Orders Today</h3>
            <p>{selectedRestaurant.orders}</p>
          </div>
          <div className="vendor-card">
            <h3>Revenue Today</h3>
            <p>${selectedRestaurant.revenue}.00</p>
          </div>
          <div className="vendor-card">
            <h3>Pending Orders</h3>
            <p>{selectedRestaurant.pendingOrders}</p>
          </div>
          <div className="vendor-card">
            <h3>Customer Reviews</h3>
            <p>{selectedRestaurant.rating}</p>
          </div>
        </div>

        <div className="vendor-links">
          <h3>Quick Links</h3>
          <div className="vendor-link-grid">
            <Link to={`/vendor-dashboard/menu/${selectedRestaurant.id}`} className="vendor-link-card">
              <h4>Menu Management</h4>
              <p>Manage your restaurant menu</p>
            </Link>
            <Link to={`/vendor-dashboard/orders/${selectedRestaurant.id}`} className="vendor-link-card">
              <h4>Order Management</h4>
              <p>View and manage orders</p>
            </Link>
            <Link to={`/vendor-dashboard/analytics/${selectedRestaurant.id}`} className="vendor-link-card">
              <h4>Analytics</h4>
              <p>View sales and insights</p>
            </Link>
            <Link to={`/vendor-dashboard/notifications/${selectedRestaurant.id}`} className="vendor-link-card">
              <h4>Notifications</h4>
              <p>Check alerts and messages</p>
            </Link>
            <Link to={`/vendor-dashboard/settings/${selectedRestaurant.id}`} className="vendor-link-card">
              <h4>Settings</h4>
              <p>Update restaurant details</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
