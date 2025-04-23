import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/LocationRestriction.css';

const LocationChecker = ({ message }) => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    window.location.reload();
  };

  return (
    <div className="location-restrict-container">
      <h1 className="location-restrict-heading">Access Restricted</h1>
      <p className="location-restrict-message">
        {message || "Our services are currently only available in Thane Maharashtra."}
      </p>

      <div className="location-restrict-buttons">
        <button className="location-btn primary" onClick={handleTryAgain}>
          Check Again
        </button>
        <button className="location-btn secondary" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>

      <p className="location-restrict-note">
        If you believe this is an error, ensure your device's location services are enabled and you're in Thane, Maharashtra.
      </p>
    </div>
  );
};

export default LocationChecker;
