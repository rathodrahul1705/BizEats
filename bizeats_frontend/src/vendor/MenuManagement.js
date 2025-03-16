import React from "react";
import "../assets/css/vendor/index.css";

const MenuManagement = () => {
  return (
    <div className="vendor-menu">
      <h2>Menu Management</h2>
      <button className="vendor-button">Add New Menu Item</button>
      <div className="vendor-menu-list">
        <div className="vendor-card">
          <h3>Burger</h3>
          <p>$9.99</p>
          <button className="vendor-button">Edit</button>
          <button className="vendor-button">Delete</button>
        </div>
        <div className="vendor-card">
          <h3>Pizza</h3>
          <p>$12.99</p>
          <button className="vendor-button">Edit</button>
          <button className="vendor-button">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;