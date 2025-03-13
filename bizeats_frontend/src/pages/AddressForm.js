import React, { useState } from "react";
import { X } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../assets/css/AddressSelection.css";

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

  const handleSave = () => {
    const { street, city, state, zip, country, landmark, addressType } = newAddress;
    if (street.trim() && city.trim() && state.trim() && zip.trim() && country.trim()) {
      const fullAddress = `${street}, ${city}, ${state}, ${zip}, ${country} (Landmark: ${landmark}, Type: ${addressType})`;
      onSave(fullAddress);
      onClose();
    }
  };

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
      <input type="text" placeholder="Street Address" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} className="address-input" />
      <input type="text" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="address-input" />
      <input type="text" placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="address-input" />
      <input type="text" placeholder="Zip Code" value={newAddress.zip} onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })} className="address-input" />
      <input type="text" placeholder="Country" value={newAddress.country} onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })} className="address-input" />
      <input type="text" placeholder="Landmark" value={newAddress.landmark} onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} className="address-input" />
      <select value={newAddress.addressType} onChange={(e) => setNewAddress({ ...newAddress, addressType: e.target.value })} className="address-input">
        <option value="Home">Home</option>
        <option value="Work">Work</option>
        <option value="Other">Other</option>
      </select>

      <button className="submit-btn" onClick={handleSave}>Submit Address</button>
    </div>
  );
};

export default AddressForm;
