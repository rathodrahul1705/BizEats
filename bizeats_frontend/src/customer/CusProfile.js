import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { LogOut, User, CreditCard, MapPin, List, Edit } from "lucide-react";
import CusOrders from "./CusOrders";
import CusPaymentsDetails from "./CusPaymentsDetails";
import CusAddresses from "./CusAddresses";
// import CusSettings from "./CusSettings";
import "../assets/css/customer/CusProfile.css";

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [updatedUser, setUpdatedUser] = useState({
    email: user?.email || "",
    contact: user?.contact_number || "",
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
  };

  const handleSaveChanges = () => {
    console.log("Updated User Details:", updatedUser);
    setIsEditing(false);
  };

  console.log("updatedUser==",updatedUser)
  
  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="user-info">
          <User size={40} className="user-icon" />
          <div>
            <h2>{user?.full_name || "User"}</h2>
            <p className="user-email">{user?.email}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button onClick={handleEditProfile} className="edit-profile-btn" title="Edit Profile">
            <Edit size={18} />
          </button>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
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

        <TabPanel><CusOrders /></TabPanel>
        {/* <TabPanel><CusPaymentsDetails /></TabPanel> */}
        {/* <TabPanel><CusAddresses /></TabPanel> */}
        {/* <TabPanel><CusSettings /></TabPanel> */}
      </Tabs>

      {/* Edit Profile Modal - Sliding from Right */}
      {isEditing && (
        <>
          <div className="cus-orders__modal-overlay cus-orders__modal-overlay--show" onClick={() => setIsEditing(false)}></div>
          <div className="cus-orders__edit-modal">
            <div className="cus-orders__modal-header">
              <h3 className="cus-orders__modal-title">Edit Profile</h3>
              <button className="cus-orders__modal-close" onClick={() => setIsEditing(false)}>&times;</button>
            </div>
            <div className="cus-orders__modal-content">
              <label className="cus-orders__modal-label">Email Address:</label>
              <input
                type="email"
                className="cus-orders__modal-input"
                value={updatedUser.email}
                onChange={(e) => setUpdatedUser({ ...updatedUser, email: e.target.value })}
              />
              <label className="cus-orders__modal-label">Phone Number:</label>
              <input
                type="text"
                className="cus-orders__modal-input"
                value={updatedUser.contact}
                maxLength={10}
                onChange={(e) => setUpdatedUser({ ...updatedUser, contact: e.target.value })}
              />
              <div className="cus-orders__modal-actions">
                <button onClick={handleSaveChanges} className="cus-orders__modal-save">Save</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;