import React from 'react';
import "../assets/css/LocationRestriction.css";

const LocationRestriction = ({ error, onRetry }) => {
  return (
    <div className="location-restriction-container">
      <div className="error-icon">😕</div>

      <h2 className="restriction-title">Oopsie Daisy! 🐣</h2>

      <p className="restriction-message">
        {error || "Looks like you’ve ventured outside our delicious delivery zone."}
      </p>

      <p className="restriction-instruction">
        Our services currently only operate in <strong>Thane Maharashtra</strong>. Hop back in the tasty zone!
      </p>

      <button
        className="retry-button"
        onClick={onRetry}
      >
        Try My Luck Again 🔄
      </button>

      <p className="contact-support">
        Think this is a mistake? Our friendly support unicorns are on standby 🦄✨
      </p>
    </div>
  );
};

export default LocationRestriction;
