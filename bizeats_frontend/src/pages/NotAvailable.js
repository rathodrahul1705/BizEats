import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/NotAvailable.css";

const NotAvailable = () => {
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(false);

  const requestLocationAccess = () => {
    if (navigator.geolocation) {
      // First try to trigger the browser's location prompt
      navigator.geolocation.getCurrentPosition(
        () => {
          // If permission granted, redirect to home
          navigate("/");
        },
        () => {
          // If permission denied, show message
          setShowMessage(true);
          // Redirect to home after 3 seconds
          setTimeout(() => navigate("/"), 3000);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // If geolocation not supported, redirect to home
      navigate("/");
    }
  };

  return (
    <div className="not-available-container">
      <div className="not-available-card">
        <h2 className="not-available-title">We're Not in Your Area Yet!</h2>
        <p className="not-available-message">
          Our food riders are loading up deliciousness and heading your way soon.
        </p>
        <p className="not-available-message-sub">
          EATOOR is expanding fast — stay tuned for fresh bites near you!
        </p>

        {showMessage && (
          <p className="instruction-message">
            Please enable location access from your browser settings.
            <br />
            Redirecting you to the home page...
          </p>
        )}

        <button className="order-now-btn" onClick={requestLocationAccess}>
          Allow Location
        </button>
      </div>
    </div>
  );
};

export default NotAvailable;