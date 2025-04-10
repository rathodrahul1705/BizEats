import React, { useState, useEffect } from "react";
import { CheckCircle, Plus } from "lucide-react";
import "../assets/css/AddressSelection.css";
import loactionIcon from "../assets/img/loactionIcon.svg";
import AddressForm from "./AddressForm";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const AddressSelection = ({ onAddressSelect }) => {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(
    localStorage.getItem("selected_address") || null
  );
  const [selectedFullAddress, setselectedFullAddress] = useState(
    localStorage.getItem("user_full_address") || null
  );
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Move fetchAddresses outside useEffect so it's reusable
  const fetchAddresses = async () => {
    try {
      setLoading(true)
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
          is_default: item.is_default,
        }));
        setAddresses(updatedAddresses);

        const storedAddress = localStorage.getItem("selected_address");
        const defaultAddress = updatedAddresses.find((addr) => addr.is_default);

        if (storedAddress) {
          setSelectedAddress(parseInt(storedAddress));
        } else if (defaultAddress) {
          setSelectedAddress(defaultAddress.address_id);
          localStorage.setItem("selected_address", defaultAddress.address_id);
          localStorage.setItem("user_full_address", defaultAddress.address);
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!onAddressSelect) return;
    fetchAddresses();
  }, [onAddressSelect]);

  const handleSelectAddress = (addressId, full_address) => {
    setSelectedAddress(addressId);
    setselectedFullAddress(full_address);
    localStorage.setItem("selected_address", addressId);
    localStorage.setItem("user_full_address", full_address);
  };

  const handleAddAddress = async (newAddress) => {
    setShowAddressForm(false);
    await fetchAddresses(); // Fetch updated list after new address is added
  };

  if (loading && addresses.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="address-container">
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

      <button className="add-btn" onClick={() => setShowAddressForm(true)}>
        <Plus size={18} /> Add New Address
      </button>

      {showAddressForm && (
        <AddressForm onClose={() => setShowAddressForm(false)} onSave={handleAddAddress} />
      )}

      {selectedAddress && (
        <button
          className="proceed-btn"
          onClick={() => onAddressSelect(selectedAddress, selectedFullAddress)}
        >
          Select or Add Address
        </button>
      )}
    </div>
  );
};

export default AddressSelection;
