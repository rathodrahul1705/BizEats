// src/services/LocationService.js
import { useState, useEffect } from 'react';

export const useLocation = () => {
  const [location, setLocation] = useState({
    isAllowed: null,
    error: null,
    city: null
  });

  const serviceableCities = {
    thane: {
      name: "Thane",
      bounds: { minLat: 19.0, maxLat: 19.3, minLng: 72.9, maxLng: 73.1 }
    },
    mumbai: {
      name: "Mumbai",
      bounds: { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 72.9 }
    },
    pune: {
      name: "Pune",
      bounds: { minLat: 18.4, maxLat: 18.6, minLng: 73.7, maxLng: 74.0 }
    }
  };

  const verifyLocation = (lat, lng) => {
    for (const city in serviceableCities) {
      const { bounds, name } = serviceableCities[city];
      if (lat >= bounds.minLat && lat <= bounds.maxLat && 
          lng >= bounds.minLng && lng <= bounds.maxLng) {
        return { isAllowed: true, city: name, error: null };
      }
    }
    return { 
      isAllowed: false, 
      city: null, 
      error: "Our services are currently only available in Mumbai, Pune, and Thane." 
    };
  };

  const checkLocation = () => {
    setLocation({ isAllowed: null, error: null, city: null });

    if (!navigator.geolocation) {
      setLocation({
        isAllowed: false,
        error: "Geolocation is not supported by your browser.",
        city: null
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(verifyLocation(latitude, longitude));
      },
      (error) => {
        console.error("Location error:", error);
        setLocation({
          isAllowed: false,
          error: "Unable to retrieve your location. Please enable location services.",
          city: null
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    checkLocation();
  }, []);

  return { ...location, checkLocation };
};