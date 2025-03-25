import React, { useState, useEffect } from "react";
import { CheckCircle, Plus } from "lucide-react";
import "../assets/css/AddressSelection.css";
import loactionIcon from "../assets/img/loactionIcon.svg";
import AddressForm from "./AddressForm";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const AddressSelection = ({ onAddressSelect }) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(
    localStorage.getItem("selected_address") || null
  );

  const [selectedFullAddress, setselectedFullAddress] = useState(
    localStorage.getItem("user_full_address") || null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);

  
  useEffect(() => {
    if (!onAddressSelect) return;

    const fetchAddresses = async () => {
      try {
        const response = await fetchData(
          API_ENDPOINTS.ORDER.USER_ADDRESS_LIST,
          "GET",
          null,
          localStorage.getItem("access")
        );

        if (response) {
          const updatedAddresses = response.map((item) => ({
            address: item.full_address,
            address_id: item.id,
            is_default: item.is_default, // Ensure default address is considered
          }));
          setAddresses(updatedAddresses);

          const storedAddress = localStorage.getItem("selected_address");
          const defaultAddress = updatedAddresses.find((addr) => addr.is_default);

          if (storedAddress) {
            setSelectedAddress( parseInt(storedAddress));
          } else if (defaultAddress) {
            setSelectedAddress(defaultAddress.address_id);
            localStorage.setItem("selected_address", defaultAddress.address_id);
          }
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    fetchAddresses();
  }, [onAddressSelect]);

  const handleSelectAddress = (addressId,full_address) => {
    setSelectedAddress(addressId);
    setselectedFullAddress(full_address)
    localStorage.setItem("selected_address", addressId);
    localStorage.setItem("user_full_address", full_address);
  };

  const handleAddAddress = (newAddress) => {
    setAddresses([...addresses, newAddress]);
    setShowAddressForm(false);
  };

  // console.log("selectedFullAddress====",selectedFullAddress)

  return (
    <div className="address-container">
      <h3 className="address-title">Select a Delivery Address</h3>

      {/* Address List */}
      <ul className="address-list">
        {addresses.map((address) => (
          <li
            key={address.address_id}
            className={`address-item ${selectedAddress === address.address_id ? "selected" : ""}`}
            onClick={() => handleSelectAddress(address.address_id, address?.address)}
          >
            {selectedAddress === address.address_id && <CheckCircle size={20} className="selected-icon" />}
            <span className="loactionName">
              <img src={loactionIcon} alt="Location Icon" /> Home
            </span>
            <p className="addressData">{address.address}</p>
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
        <button className="proceed-btn" onClick={() => onAddressSelect(selectedAddress,selectedFullAddress)}>
          Proceed to Selected Address
        </button>
      )}
    </div>
  );
};

export default AddressSelection;
