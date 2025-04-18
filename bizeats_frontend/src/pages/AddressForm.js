import React, { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../assets/css/AddressForm.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

// Fix default icon issues in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const AddressForm = ({ onClose, onSave }) => {
  const [newAddress, setNewAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    landmark: "",
    addressType: "Home",
  });

  const [markerPosition, setMarkerPosition] = useState(null);
  const [errors, setErrors] = useState({ street: "", zip: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleMapChange = (e) => {
    const latlng = e.target ? e.target.getLatLng() : e.latlng;
    setMarkerPosition(latlng);
    reverseGeocode(latlng.lat, latlng.lng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const addr = data.address || {};

      setNewAddress((prev) => ({
        ...prev,
        street: addr.road || "",
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        zip: addr.postcode || "",
        country: addr.country || "",
        landmark: addr.neighbourhood || "",
      }));
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const handleOlaGeocode = async () => {
    const { street, city, state, zip, country } = newAddress;
    let query = [street, city, state, zip, country].filter(Boolean).join(", ");
    query = query.replace(/[^\x20-\x7E]/g, "");

    const ola_api_key = process.env.REACT_APP_OLA_MAP_API_KEY;

    if (!query.trim()) return null;

    try {
      const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(query)}&language=en&api_key=${ola_api_key}`;
      const response = await fetch(url, {
        headers: {
          "X-Request-Id": Date.now().toString(),
        },
      });

      const data = await response.json();
      if (data?.geocodingResults?.length > 0) {
        const location = data.geocodingResults[0].geometry.location;
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
        };
      } else {
        alert("No location found for the entered address.");
        return null;
      }
    } catch (err) {
      console.error("Ola Maps geocoding error:", err);
      alert("Something went wrong while fetching the location.");
      return null;
    }
  };

  const handleSave = async () => {
    const { street, city, state, zip, country, landmark, addressType } = newAddress;
    let isValid = true;
    let validationErrors = { street: "", zip: "" };

    const streetValue = street?.trim();
    const zipValue = zip?.trim();

    if (!streetValue) {
      validationErrors.street = "Street address is required";
      isValid = false;
    }

    if (!zipValue || !/^\d{6}$/.test(zipValue)) {
      validationErrors.zip = "Valid Zip Code (6 digits) is required";
      isValid = false;
    }

    setErrors(validationErrors);
    if (!isValid) return;

    setIsSubmitting(true);
    const geoCodeResponse = await handleOlaGeocode();
    if (!geoCodeResponse) {
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        street_address: streetValue,
        user: 1,
        city,
        state,
        zip_code: zipValue,
        country,
        near_by_landmark: landmark,
        home_type: addressType,
        latitude: geoCodeResponse.lat,
        longitude: geoCodeResponse.lng,
        is_default: true,
      };

      const response = await fetchData(
        API_ENDPOINTS.ORDER.USER_ADDRESS_STORE,
        "POST",
        payload,
        localStorage.getItem("access")
      );

      if (response) {
        localStorage.setItem("selected_address", response?.id);
        localStorage.setItem("user_full_address", response.full_address);
        onSave(response.full_address);
        onClose();
      }
    } catch (error) {
      console.error("Error saving address:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));

    if (field === "street" && value.trim()) {
      setErrors((prev) => ({ ...prev, street: "" }));
    }

    if (field === "zip" && /^\d{6}$/.test(value.trim())) {
      setErrors((prev) => ({ ...prev, zip: "" }));
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setMarkerPosition(coords);
        reverseGeocode(coords.lat, coords.lng);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setMarkerPosition({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi
      }
    );
  }, []);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  if (!markerPosition) return <p>Loading map...</p>;

  return (
    <div className="slide-panel open">
      <div className="slide-panel-header">
        <h3>Save Address Details</h3>
        <X size={22} className="close-icon" onClick={onClose} />
      </div>

      <div className="map-toggle" onClick={toggleMap}>
        {showMap ? (
          <ChevronUp size={20} className="toggle-icon" />
        ) : (
          <ChevronDown size={20} className="toggle-icon" />
        )}
        <span>{showMap ? "Hide Map" : "View Map"}</span>
      </div>

      <div className={`map-container ${showMap ? "visible" : ""}`}>
        <MapContainer
          center={markerPosition}
          zoom={15}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={{ dragend: handleMapChange }}
          />
        </MapContainer>
      </div>

      <div className={`address-form-scroll ${showMap ? "with-map" : ""}`}>
        <input
          type="text"
          placeholder="Street Address"
          value={newAddress.street}
          onChange={(e) => handleInputChange("street", e.target.value)}
          className={`address-input ${errors.street ? "error" : ""}`}
        />
        {errors.street && <span className="error-message">{errors.street}</span>}

        <input
          type="text"
          placeholder="City"
          value={newAddress.city}
          onChange={(e) => handleInputChange("city", e.target.value)}
          className="address-input"
        />

        <input
          type="text"
          placeholder="State"
          value={newAddress.state}
          onChange={(e) => handleInputChange("state", e.target.value)}
          className="address-input"
        />

        <input
          type="text"
          placeholder="Zip Code"
          value={newAddress.zip}
          onChange={(e) => handleInputChange("zip", e.target.value)}
          maxLength={6}
          className={`address-input ${errors.zip ? "error" : ""}`}
          onInput={(e) => (e.target.value = e.target.value.replace(/\D/g, ""))}
        />
        {errors.zip && <span className="error-message">{errors.zip}</span>}

        <input
          type="text"
          placeholder="Country"
          value={newAddress.country}
          onChange={(e) => handleInputChange("country", e.target.value)}
          className="address-input"
        />

        <input
          type="text"
          placeholder="Landmark"
          value={newAddress.landmark}
          onChange={(e) => handleInputChange("landmark", e.target.value)}
          className="address-input"
        />

        <select
          value={newAddress.addressType}
          onChange={(e) => handleInputChange("addressType", e.target.value)}
          className="address-input"
        >
          <option value="Home">Home</option>
          <option value="Office">Office</option>
          <option value="Other">Other</option>
        </select>

        <button className="submit-btn" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default AddressForm;