import React from "react";
import "../assets/css/vendor/index.css";

const Settings = () => {
  return (
    <div className="vendor-settings">
      <h2>Settings</h2>
      <form className="vendor-form">
        <label htmlFor="restaurant-name">Restaurant Name</label>
        <input type="text" id="restaurant-name" placeholder="Enter restaurant name" />
        <label htmlFor="address">Address</label>
        <input type="text" id="address" placeholder="Enter address" />
        <label htmlFor="contact-info">Contact Info</label>
        <input type="text" id="contact-info" placeholder="Enter contact info" />
        <button type="submit" className="vendor-button">Save Changes</button>
      </form>
    </div>
  );
};

export default Settings;