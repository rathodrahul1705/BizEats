// components/LocationChecker.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LocationChecker = ({ children }) => {
  const [checkingLocation, setCheckingLocation] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) {
      navigate("/not-available");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'eatoor/1.0 (support@eatoor.com)',
              },
            }
          );
            
          const data = await response.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county;

            if (city && city.toLowerCase().includes("thane")) {
            setCheckingLocation(false); // allowed
          } else {
            navigate("/not-available");
          }
        } catch (error) {
          console.error("Geolocation error:", error);
          navigate("/not-available");
        }
      },
      (error) => {
        console.error("Geolocation permission denied:", error);
        navigate("/not-available");
      }
    );
  }, [navigate]);

  return <>{children}</>;
};

export default LocationChecker;
