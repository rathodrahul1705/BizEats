import React from 'react';
import "../assets/css/LoadingScreen.css";

const LoadingScreen = ({ message }) => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="location-icon">📍</div>
      </div>
      
      <h3 className="loading-message">
        {message || "Checking your location"}
      </h3>
      
      <p className="loading-subtext">
        Please wait while we verify your location...
      </p>
    </div>
  );
};

export default LoadingScreen;