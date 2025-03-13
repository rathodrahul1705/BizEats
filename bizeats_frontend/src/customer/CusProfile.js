import React, { useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { LogOut, User, CreditCard, MapPin, List } from "lucide-react";
import CusOrders from "./CusOrders";
import CusPaymentsDetails from "./CusPaymentsDetails";
import CusAddresses from "./CusAddresses";
import CusSettings from "./CusSettings";
import "../assets/css/customer/CusProfile.css";

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // Redirect to home if no user is logged in
    }
  }, [navigate]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/");
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
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn" title="Logout">
          <LogOut size={18} />
        </button>
      </div>

      {/* Tab Navigation */}
      <Tabs>
        <TabList className="tab-list">
          <Tab><List size={16} /> Orders</Tab>
          <Tab><CreditCard size={16} /> Payments</Tab>
          <Tab><MapPin size={16} /> Addresses</Tab>
          <Tab><User size={16} /> Settings</Tab>
        </TabList>

        <TabPanel><CusOrders /></TabPanel>
        <TabPanel><CusPaymentsDetails /></TabPanel>
        <TabPanel><CusAddresses /></TabPanel>
        <TabPanel><CusSettings /></TabPanel>
      </Tabs>
    </div>
  );
};

export default Profile;
