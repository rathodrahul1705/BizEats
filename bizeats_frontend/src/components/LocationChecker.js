// components/LocationChecker.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LocationChecker = ({ children }) => {
  const [checkingLocation, setCheckingLocation] = useState(true);
  const navigate = useNavigate();

  const checkLocation = () => {
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
                "User-Agent": "eatoor/1.0 (support@eatoor.com)",
              },
            }
          );

          const data = await response.json();
          const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county;

          const allowedCities = ["thane", "mumbai", "pune"];
          
          console.log("city==",city)

          if (
            city &&
            allowedCities.some((allowed) =>
              city.toLowerCase().includes(allowed)
            )
          ) {
            setCheckingLocation(false);
          } else {
            navigate("/not-available");
          }
        } catch (error) {
          console.error("Geolocation error:", error);
          navigate("/not-available");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          // If permission was denied, try requesting again
          navigator.geolocation.getCurrentPosition(
            () => {}, // Success callback - will be handled by the next attempt
            () => navigate("/not-available"), // Final error callback
            { timeout: 100 } // Minimal timeout to trigger prompt quickly
          );
        } else {
          navigate("/not-available");
        }
      }
    );
  };

  useEffect(() => {
    checkLocation();
  }, [navigate]);

  return <>{!checkingLocation && children}</>;
};

export default LocationChecker;