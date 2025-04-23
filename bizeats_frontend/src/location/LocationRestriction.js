import React, { useEffect, useState } from 'react';
import "../assets/css/LocationRestriction.css";
import { useNavigate } from 'react-router-dom';

const SERVICEABLE_CITIES = {
  thane: {
    name: "Thane",
    bounds: { minLat: 19.0, maxLat: 19.3, minLng: 72.9, maxLng: 73.1 },
  },
  mumbai: {
    name: "Mumbai",
    bounds: { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 72.9 },
  },
  pune: {
    name: "Pune",
    bounds: { minLat: 18.4, maxLat: 18.6, minLng: 73.7, maxLng: 74.0 },
  },
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const LocationRestriction = ({ onLocationVerified }) => {
  const [locationStatus, setLocationStatus] = useState({
    isAllowed: null,
    city: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();

  // Store the watchPosition ID to clean up later
  const [watchId, setWatchId] = useState(null);

  const verifyLocation = (lat, lng) => {
    for (const city in SERVICEABLE_CITIES) {
      const { bounds, name } = SERVICEABLE_CITIES[city];
      if (lat >= bounds.minLat && lat <= bounds.maxLat &&
          lng >= bounds.minLng && lng <= bounds.maxLng) {
        return { isAllowed: true, city: name, error: null };
      }
    }
    return {
      isAllowed: false,
      city: null,
      error: "Sorry! We currently deliver only in Mumbai, Thane, and Pune.",
    };
  };

  const handleLocationSuccess = (position) => {
    const { latitude, longitude } = position.coords;
    const status = verifyLocation(latitude, longitude);
    setLocationStatus(status);
    setIsLoading(false);

    if (status.isAllowed) {
      // Clear any existing watch
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      
      if (onLocationVerified) {
        onLocationVerified(status.city);
      } else {
        // Use navigate to go to the same page to trigger a refresh
        navigate('.', { replace: true });
      }
    }
  };

  const handleLocationError = (error) => {
    let errorMessage;

    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied. Please enable location services in your browser settings and try again.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information is unavailable. Please check your network connection.";
        break;
      case error.TIMEOUT:
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            checkLocation();
          }, RETRY_DELAY);
          return;
        }
        errorMessage = "Location request timed out. Please check your internet connection.";
        break;
      default:
        errorMessage = "An unknown error occurred while fetching your location.";
    }

    setLocationStatus({
      isAllowed: false,
      city: null,
      error: errorMessage,
    });
    setIsLoading(false);
  };

  const checkLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus({
        isAllowed: false,
        city: null,
        error: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setIsLoading(true);
    setRetryCount(0);

    // Clear any existing watch
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    // First try with getCurrentPosition
    navigator.geolocation.getCurrentPosition(
      handleLocationSuccess,
      (error) => {
        // If getCurrentPosition fails, start watching position
        const id = navigator.geolocation.watchPosition(
          handleLocationSuccess,
          handleLocationError,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
        setWatchId(id);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    checkLocation();

    // Clean up the watchPosition when component unmounts
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return (
    <div className="location-restriction">
      <div className="location-card">
        <h2>Location Check</h2>

        {isLoading && (
          <div className="location-loading">
            <div className="location-spinner"></div>
            <p>Detecting your location...</p>
          </div>
        )}

        {!isLoading && locationStatus.isAllowed === true && (
          <div className="location-success">
            <svg className="success-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
            </svg>
            <p>Great! We serve your area: <strong>{locationStatus.city}</strong></p>
          </div>
        )}

        {!isLoading && locationStatus.isAllowed === false && (
          <div className="location-error">
            <svg className="error-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p>{locationStatus.error}</p>
            <button
              onClick={checkLocation}
              className="retry-button"
              disabled={isLoading}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationRestriction;