import React, { useState } from "react";
import { MapPin, Edit, Trash2, X } from "lucide-react";
import AddressForm from "../pages/AddressForm";
import "../assets/css/customer/CusAddresses.css";

const CusAddresses = () => {
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      label: "Home",
      street: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400001",
      country: "India",
    },
    {
      id: 2,
      label: "Work",
      street: "456 Office Avenue",
      city: "Pune",
      state: "Maharashtra",
      zip: "411001",
      country: "India",
    },
  ]);

  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteAddress, setDeleteAddress] = useState(null);

  // Open form with selected address for editing
  const handleEdit = (address) => {
    setSelectedAddress(address);
    setIsAddressFormOpen(true);
  };

  // Open confirmation modal for deleting address
  const handleDelete = (address) => {
    setDeleteAddress(address);
    setShowConfirm(true);
  };

  // Confirm deletion and update state
  const confirmDelete = () => {
    setAddresses(addresses.filter((a) => a.id !== deleteAddress.id));
    setShowConfirm(false);
    setDeleteAddress(null);
  };

  // Handle save/update of address
  const handleSaveAddress = (updatedAddress) => {
    setAddresses((prev) =>
      prev.some((addr) => addr.id === updatedAddress.id)
        ? prev.map((addr) => (addr.id === updatedAddress.id ? updatedAddress : addr))
        : [...prev, updatedAddress]
    );

    setIsAddressFormOpen(false);
    setSelectedAddress(null);
  };

  return (
    <div className="addresses-container">
      <h3 className="addresses-title">Your Addresses</h3>

      {addresses.length === 0 ? (
        <p className="no-addresses">No saved addresses.</p>
      ) : (
        <ul className="address-list">
          {addresses.map((address) => (
            <li key={address.id} className="address-item">
              <MapPin size={24} className="address-icon" />
              <div className="address-details">
                <p className="address-label">{address.label}</p>
                <p className="address-info">
                  {address.street}, {address.city}, {address.state} - {address.zip}, {address.country}
                </p>
              </div>
              <div className="address-actions">
                <button className="edit-btn" onClick={() => handleEdit(address)}>
                  <Edit size={20} />
                </button>
                <button className="delete-btn" onClick={() => handleDelete(address)}>
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Address Form Modal */}
      {isAddressFormOpen && (
        <div className="form-overlay">
          <div className="form-modal">
            <AddressForm
              existingAddress={selectedAddress}
              onSave={handleSaveAddress}
              onClose={() => setIsAddressFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h4>Confirm Deletion</h4>
            <p>Are you sure you want to delete the address "{deleteAddress?.label}"?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
            <button className="close-btn" onClick={() => setShowConfirm(false)}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CusAddresses;
