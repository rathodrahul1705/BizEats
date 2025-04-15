import React from 'react';
import "../../assets/css/links/Pricing.css";

const Pricing = () => {
  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <h1>Our Pricing Plans</h1>
        <p>Transparent and affordable pricing tailored for every user</p>
      </div>

      <div className="pricing-content">
        <div className="pricing-card">
          <h2>Starter Plan</h2>
          <p className="price">₹0/month</p>
          <ul>
            <li>Browse restaurants & menus</li>
            <li>Place orders & track delivery</li>
            <li>Email support</li>
          </ul>
        </div>

        <div className="pricing-card">
          <h2>Vendor Pro</h2>
          <p className="price">₹999/month</p>
          <ul>
            <li>List your restaurant on EATOOR</li>
            <li>Manage menu & orders</li>
            <li>Analytics dashboard</li>
            <li>Priority support</li>
          </ul>
        </div>

        <div className="pricing-card">
          <h2>Enterprise</h2>
          <p className="price">Custom</p>
          <ul>
            <li>Custom feature integration</li>
            <li>Dedicated account manager</li>
            <li>24/7 premium support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
