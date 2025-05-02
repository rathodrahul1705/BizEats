import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { LogOut, User, CreditCard, MapPin, List, Edit } from "lucide-react";
import CusOrders from "./CusOrders";
import CusPaymentsDetails from "./CusPaymentsDetails";
import CusAddresses from "./CusAddresses";
import "../assets/css/customer/CusProfile.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [updatedUser, setUpdatedUser] = useState({
    email: user?.email || "",
    contact: user?.contact_number || "",
  });
  const [errors, setErrors] = useState({
    contact: "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/");
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setErrors({ contact: "" }); // Reset errors when opening modal
  };

  const validateContact = (contact) => {
    if (!contact) return "Phone number is required";
    if (!/^\d{10}$/.test(contact)) return "Phone number must be 10 digits";
    return "";
  };

  const handleSaveChanges = async () => {
    const contactError = validateContact(updatedUser.contact);
    if (contactError) {
      setErrors({ contact: contactError });
      return;
    }

    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem("access");
      if (!accessToken) {
        toast.error("Session expired. Please login again.");
        handleLogout();
        return;
      }
      
      const response = await fetch(API_ENDPOINTS.PROFILE.UPDATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: updatedUser.email,
          contact_number: updatedUser.contact
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser({
          ...user,
          email: data.user.email,
          contact_number: data.user.contact_number
        });
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        console.error("Error updating profile:", data);
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.error("Failed to update profile. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="user-info">
          <User size={40} className="user-icon" />
          <div>
            <h2>{user?.full_name || "User"}</h2>
            <p className="user-email">{user?.email}</p>
            <p className="user-contact">{user?.contact_number || "No phone number provided"}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button 
            onClick={handleEditProfile} 
            className="edit-profile-btn" 
            title="Edit Profile"
            disabled={isLoading}
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={handleLogout} 
            className="logout-btn" 
            title="Logout"
            disabled={isLoading}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs>
        <TabList className="tab-list">
          <Tab><List size={16} /> Orders</Tab>
          {/* <Tab><CreditCard size={16} /> Payments</Tab> */}
          {/* <Tab><MapPin size={16} /> Addresses</Tab> */}
          {/* <Tab><User size={16} /> Settings</Tab> */}
        </TabList>

        <TabPanel>
          <CusOrders />
        </TabPanel>
        {/* <TabPanel><CusPaymentsDetails /></TabPanel> */}
        {/* <TabPanel><CusAddresses /></TabPanel> */}
        {/* <TabPanel><CusSettings /></TabPanel> */}
      </Tabs>

      {/* Edit Profile Modal - Sliding from Right */}
      {isEditing && (
        <>
          <div
            className="cus-orders__modal-overlay cus-orders__modal-overlay--show"
            onClick={() => !isLoading && setIsEditing(false)}
          ></div>
          <div className="cus-orders__edit-modal">
            <div className="cus-orders__modal-header">
              <h3 className="cus-orders__modal-title">Edit Profile</h3>
              <button 
                className="cus-orders__modal-close" 
                onClick={() => !isLoading && setIsEditing(false)}
                disabled={isLoading}
              >
                &times;
              </button>
            </div>
            <div className="cus-orders__modal-content">
              <label className="cus-orders__modal-label">Email Address:</label>
              <input
                type="email"
                className="cus-orders__modal-input"
                value={updatedUser.email}
                onChange={(e) =>
                  setUpdatedUser({ ...updatedUser, email: e.target.value })
                }
                disabled
              />
              
              <label className="cus-orders__modal-label">Phone Number:</label>
              <input
                type="text"
                className={`cus-orders__modal-input ${errors.contact ? 'input-error' : ''}`}
                value={updatedUser.contact}
                maxLength={10}
                onChange={(e) => {
                  setUpdatedUser({ ...updatedUser, contact: e.target.value });
                  setErrors({ ...errors, contact: validateContact(e.target.value) });
                }}
                disabled={isLoading}
              />
              {errors.contact && <span className="error-message">{errors.contact}</span>}
              
              <div className="cus-orders__modal-actions">
                <button 
                  onClick={handleSaveChanges} 
                  className="cus-orders__modal-save"
                  disabled={isLoading || !!errors.contact}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span> Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="cus-orders__modal-cancel"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;