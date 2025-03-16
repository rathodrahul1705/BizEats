import React from "react";
import "../assets/css/vendor/index.css";

const Notifications = () => {
  return (
    <div className="vendor-notifications">
      <h2>Notifications</h2>
      <div className="vendor-alerts">
        <div className="vendor-card">
          <p>New order received!</p>
        </div>
        <div className="vendor-card">
          <p>Low stock for Pizza</p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;