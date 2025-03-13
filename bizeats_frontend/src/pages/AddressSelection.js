import React, { useState } from "react";
import { CheckCircle, Plus } from "lucide-react";
import "../assets/css/AddressSelection.css";
import loactionIcon from "../assets/img/loactionIcon.svg";
import AddressForm from "./AddressForm";

const AddressSelection = ({ onAddressSelect }) => {
  const [addresses, setAddresses] = useState([
    "123 Main St, Cityville, CA, 12345, USA",
    "456 Elm St, Townsville, TX, 67890, USA",
  ]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const handleSelectAddress = (address) => {
    setSelectedAddress(address);
  };

  const handleAddAddress = (newAddress) => {
    setAddresses([...addresses, newAddress]);
    setShowAddressForm(false);
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
            <span className="loactionName"><img src={loactionIcon} alt="Location Icon" /> Home</span>
            <p className="addressData">{address}</p>
          </li>
        ))}
      </ul>

      {/* Open Address Form */}
      <button className="add-btn" onClick={() => setShowAddressForm(true)}>
        <Plus size={18} /> Add New Address
      </button>

      {/* Address Form Slide Panel */}
      {showAddressForm && (
        <AddressForm onClose={() => setShowAddressForm(false)} onSave={handleAddAddress} />
      )}

      {/* Proceed Button */}
      {selectedAddress && (
        <button className="proceed-btn" onClick={() => onAddressSelect(selectedAddress)}>
          Proceed to Selected Address
        </button>
      )}
    </div>
  );
};

export default AddressSelection;
