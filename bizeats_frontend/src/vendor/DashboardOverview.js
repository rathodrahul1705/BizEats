import React from "react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom
import "../assets/css/vendor/index.css";

const DashboardOverview = () => {
  return (
    <div className="vendor-overview">
      <h2>Dashboard Overview</h2>
      <div className="vendor-container">
        {/* Card View (Left Side - 2x2 Grid) */}
        <div className="vendor-summary">
          <div className="vendor-card">
            <h3>Total Orders Today</h3>
            <p>25</p>
          </div>
          <div className="vendor-card">
            <h3>Revenue Today</h3>
            <p>$500.00</p>
          </div>
          <div className="vendor-card">
            <h3>Pending Orders</h3>
            <p>5</p>
          </div>
          <div className="vendor-card">
            <h3>Customer Reviews</h3>
            <p>4.5/5</p>
          </div>
        </div>

        {/* Menu Section (Right Side) */}
        <div className="vendor-links">
          <h3>Quick Links</h3>
          <div className="vendor-link-grid">
            <Link to="/vendor-dashboard/menu" className="vendor-link-card">
              <h4>Menu Management</h4>
              <p>Manage your restaurant menu</p>
            </Link>
            <Link to="/vendor-dashboard/orders" className="vendor-link-card">
              <h4>Order Management</h4>
              <p>View and manage orders</p>
            </Link>
            <Link to="/vendor-dashboard/analytics" className="vendor-link-card">
              <h4>Analytics</h4>
              <p>View sales and insights</p>
            </Link>
            <Link to="/vendor-dashboard/notifications" className="vendor-link-card">
              <h4>Notifications</h4>
              <p>Check alerts and messages</p>
            </Link>
            <Link to="/vendor-dashboard/settings" className="vendor-link-card">
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