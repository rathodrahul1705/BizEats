// components/LocationChecker.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const allowedCities = ["Mumbai", "Delhi", "Bangalore", "Thāne"]; // Example allowed cities

const LocationChecker = ({ children }) => {
  const [locationAllowed, setLocationAllowed] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/"); // IP-based location
        const data = await res.json();
        const city = data.city;

        console.log("city==",city)
        
        if (allowedCities.includes(city)) {
          setLocationAllowed(true);
        } else {
          setLocationAllowed(false);
          navigate("/not-available");
        }
      } catch (err) {
        console.error("Location fetch error", err);
        setLocationAllowed(false);
        navigate("/not-available");
      }
    };

    fetchLocation();
  }, [navigate]);

  if (locationAllowed === null) return <div>Checking location...</div>;

  return <>{children}</>;
};

export default LocationChecker;
