import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/NotAvailable.css";

const NotAvailable = () => {
  return (
    <div className="not-available-container">
      <div className="not-available-card">
        <h2 className="not-available-title">We’re Not in Your Area Yet!</h2>
        <p className="not-available-message">
          Our food riders are loading up deliciousness and heading your way soon.
        </p>
        <p className="not-available-message-sub">
          EATOOR is expanding fast — stay tuned for fresh bites near you!
        </p>

        <Link to="/">
              <button className="order-now-btn">Allow Location</button>
        </Link>
      </div>
    </div>
  );
};

export default NotAvailable;