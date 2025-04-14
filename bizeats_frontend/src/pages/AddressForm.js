import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../assets/css/AddressSelection.css";
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

  const [markerPosition, setMarkerPosition] = useState({ lat: 28.6139, lng: 77.2090 });
  const [errors, setErrors] = useState({
    street: "",
    zip: "",
  });

  // Handle map click or drag event
  const handleMapChange = (e) => {
    const latlng = e.target ? e.target.getLatLng() : e.latlng;
    setMarkerPosition(latlng);

    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`)
      .then((res) => res.json())
      .then((data) => {
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
      })
      .catch((err) => console.error("Reverse geocoding error:", err));
  };

  // Handle save
  const handleSave = async () => {
    const { street, city, state, zip, country, landmark, addressType } = newAddress;
    let isValid = true;
    let validationErrors = { street: "", zip: "" };

    // Ensure the fields are not undefined or null before calling .trim()
    const streetValue = street ? street.trim() : "";
    const zipValue = zip ? zip.trim() : "";

    // Validate Street and Zip
    if (!streetValue) {
      validationErrors.street = "Street address is required";
      isValid = false;
    }

    // Updated regex to validate 6-digit zip code
    if (!zipValue || !/^\d{6}$/.test(zipValue)) {
      validationErrors.zip = "Valid Zip Code (6 digits) is required";
      isValid = false;
    }

    setErrors(validationErrors);

    if (isValid) {
      try {
        const payload = {
          street_address: streetValue,
          user: 1,
          city: city,
          state: state,
          zip_code: zipValue,
          country: country,
          near_by_landmark: landmark,
          home_type: addressType,
          latitude: null,
          longitude: null,
          is_default: true,
        };

        const response = await fetchData(API_ENDPOINTS.ORDER.USER_ADDRESS_STORE, "POST", payload, localStorage.getItem("access"));

        if (response) {
          localStorage.setItem("selected_address", response?.id);
          localStorage.setItem("user_full_address", response.full_address);
          onSave(response.full_address);
          onClose();
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  // Handle user input to hide errors on valid input
  const handleInputChange = (field, value) => {
    setNewAddress((prev) => ({ ...prev, [field]: value }));

    if (field === "street" && value.trim()) {
      setErrors((prev) => ({ ...prev, street: "" }));
    }

    if (field === "zip" && /^\d{6}$/.test(value.trim())) {
      setErrors((prev) => ({ ...prev, zip: "" }));
    }
  };

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setNewAddress({
          country: data.country_name,
          state: data.state,
          city: data.city,
          state: data.region,
        });
      })
      .catch(err => console.error('Failed to get location:', err));
  }, []);

  return (
    <div className="slide-panel open">
      <div className="slide-panel-header">
        <h3>Save Address Details</h3>
        <X size={22} className="close-icon" onClick={onClose} />
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer center={markerPosition} zoom={15} scrollWheelZoom={true} style={{ width: "100%", height: "300px" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={markerPosition} draggable={true} eventHandlers={{ dragend: handleMapChange }} />
        </MapContainer>
      </div>

      {/* Address Inputs */}
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
        onInput={(e) => e.target.value = e.target.value.replace(/\D/g, '')}  // Only allows digits
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

      <button className="submit-btn" onClick={handleSave}>Submit</button>
    </div>
  );
};

export default AddressForm;
