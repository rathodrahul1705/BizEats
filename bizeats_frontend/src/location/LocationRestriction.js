import React from 'react';
import "../assets/css/LocationRestriction.css";

const LocationRestriction = ({ error, onRetry }) => {
  return (
    <div className="location-restriction-container">
      <div className="error-icon">!</div>
      
      <h2 className="restriction-title">Service Not Available</h2>
      
      <p className="restriction-message">
        {error || "Currently, our services are only available in Thane."}
      </p>
      
      <div className="location-icon">📍</div>
      
      <p className="restriction-instruction">
        Please enable location services or check if you're within our service area.
      </p>
      
      <button
        className="retry-button"
        onClick={onRetry}
      >
        Check Location Again
      </button>
      
      <p className="contact-support">
        If you believe this is an error, please contact our support team.
      </p>
    </div>
  );
};

export default LocationRestriction;