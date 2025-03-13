import React, { useState, useEffect } from "react";
import { User, Edit, List, Key, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../assets/css/Profile.css";

const Profile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [editable, setEditable] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate("/"); // Redirect to home if no user found
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
      <div className="profile-card">
        <div className="profile-pic">
          <User size={50} />
        </div>
        <div className="profile-info">
          <h2>{profileData.full_name}</h2>
          <p>{profileData.email}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
