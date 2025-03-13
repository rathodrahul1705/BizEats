import React, { useState } from "react";
import { CheckCircle, Plus, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
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

// DraggableMarker listens for both dragend and click events
const DraggableMarker = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      // When map is clicked, call onChange with event containing latlng
      onChange({ latlng: e.latlng });
    },
    dragend(e) {
      onChange(e);
    },
  });
  return (
    <Marker position={position} draggable={true} eventHandlers={{ dragend: onChange }} />
  );
};

const AddressSelection = ({ onAddressSelect }) => {
  const [addresses, setAddresses] = useState([
    "123 Main St, Cityville, CA, 12345, USA",
    "456 Elm St, Townsville, TX, 67890, USA",
  ]);
  const [newAddress, setNewAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    landmark: "",
    addressType: "Home",
    mapAddress: "",
  });
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);

  // Default marker position in India (e.g., New Delhi)
  const [markerPosition, setMarkerPosition] = useState({ lat: 28.6139, lng: 77.2090 });

  // Handle map events (click or dragend) to update marker position and reverse geocode
  const handleMapChange = (e) => {
    // e may have either target.getLatLng() or a latlng property from click event
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
          mapAddress: data.display_name || "",
        }));
      })
      .catch((err) => console.error("Reverse geocoding error:", err));
  };

  const handleAddAddress = () => {
    const { street, city, state, zip, country, landmark, addressType, mapAddress } = newAddress;
    if (street.trim() && city.trim() && state.trim() && zip.trim() && country.trim()) {
      const fullAddress = `${street}, ${city}, ${state}, ${zip}, ${country} (Landmark: ${landmark}, Type: ${addressType}${mapAddress ? ", " + mapAddress : ""})`;
      setAddresses([...addresses, fullAddress]);
      setNewAddress({
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        landmark: "",
        addressType: "Home",
        mapAddress: "",
      });
      setShowAddAddress(false);
    }
  };

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
  };

  return (
    <div className="address-container">
      <h3 className="address-title">Select a Delivery Address</h3>

      {/* Address List */}
      <ul className="address-list">
        {addresses.map((address, index) => (
          <li
            key={index}
            className={`address-item ${selectedAddress === address ? "selected" : ""}`}
            onClick={() => handleSelectAddress(address)}
          >
            {selectedAddress === address && <CheckCircle size={20} className="selected-icon" />}
            {address}
          </li>
        ))}
      </ul>

      {/* Button to Open Slide Panel */}
      <button className="add-btn" onClick={() => setShowAddAddress(true)}>
        <Plus size={18} /> Add New Address
      </button>

      {/* Slide Panel for Adding Address */}
      <div className={`slide-panel ${showAddAddress ? "open" : ""}`}>
        <div className="slide-panel-header">
          <h3>Add Address</h3>
          <X size={22} className="close-icon" onClick={() => setShowAddAddress(false)} />
        </div>
        {/* Map always visible at top */}
        <div className="map-container">
          <MapContainer center={markerPosition} zoom={15} scrollWheelZoom={true} style={{ width: "100%", height: "300px" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DraggableMarker position={markerPosition} onChange={handleMapChange} />
          </MapContainer>
        </div>
        {/* Address Input Fields Below the Map */}
        <input
          type="text"
          placeholder="Street Address"
          value={newAddress.street}
          onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} 
          className="address-input"
        />
        <input
          type="text"
          placeholder="City"
          value={newAddress.city}
          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} 
          className="address-input"
        />
        <input
          type="text"
          placeholder="State"
          value={newAddress.state}
          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} 
          className="address-input"
        />
        <input
          type="text"
          placeholder="Zip Code"
          value={newAddress.zip}
          onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })} 
          className="address-input"
        />
        <input
          type="text"
          placeholder="Country"
          value={newAddress.country}
          onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })} 
          className="address-input"
        />
        <input
          type="text"
          placeholder="Landmark"
          value={newAddress.landmark}
          onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} 
          className="address-input"
        />
        <select
          value={newAddress.addressType}
          onChange={(e) => setNewAddress({ ...newAddress, addressType: e.target.value })}className="address-input"><option value="Home">Home</option><option value="Work">Work</option><option value="Other">Other</option></select>
        <button className="submit-btn" onClick={handleAddAddress}>Submit Address</button>
      </div>

      {/* Proceed Button */}
      {selectedAddress && (
        <button className="proceed-btn" onClick={() => onAddressSelect(selectedAddress)}>
          Proceed to Selected Address
        </button>
      )}

      {/* Background Overlay */}
      {showAddAddress && <div className="overlay" onClick={() => setShowAddAddress(false)}></div>}
    </div>
  );
};

export default AddressSelection;
