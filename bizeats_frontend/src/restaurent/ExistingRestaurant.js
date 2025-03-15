import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "../assets/css/restaurent/ExistingRestaurant.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"

const ExistingRestaurant = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("active");
  const [activeRestaurants, setActiveRestaurants] = useState([]);
  const [liveRestaurants, setLiveRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {

      try {
        const response = await fetchData(API_ENDPOINTS.RESTAURANT.BY_USER(user?.user_id), "GET", null, localStorage.getItem("access"));
        setActiveRestaurants(response.filter((restaurant) => restaurant.status === "In Progress"));
        setLiveRestaurants(response.filter((restaurant) => restaurant.status === "Completed"));
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="existing-restaurant-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
        <h2>Your restaurant applications</h2>

        <div className="tab-navigation">
          <button className={`tab-button ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
            Active Restaurants
          </button>
          <button className={`tab-button ${activeTab === "live" ? "active" : ""}`} onClick={() => setActiveTab("live")}>
            Live Restaurants
          </button>
        </div>

        {activeTab === "active" && (
          <div className="section">
            <div className="card-container">
              {activeRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="card">
                  <h3>{restaurant.name}</h3>
                  <p><strong>Onboarding Date:</strong> {restaurant.onboarding_date}</p>
                  <p><strong>Restaurant ID:</strong> {restaurant.id}</p>
                  <p><strong>Status:</strong> <span className="status in-progress">{restaurant.status}</span></p>
                  <p><strong>Address:</strong> {restaurant.address}</p>
                  <button className="card-button continue">Continue</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "live" && (
          <div className="section">
            <div className="card-container">
              {liveRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="card">
                  <h3>{restaurant.name}</h3>
                  <p><strong>Onboarding Date:</strong> {restaurant.onboarding_date}</p>
                  <p><strong>Restaurant ID:</strong> {restaurant.id}</p>
                  <p><strong>Status:</strong> <span className="status completed">{restaurant.status}</span></p>
                  <p><strong>Address:</strong> {restaurant.address}</p>
                  <button className="card-button edit">Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExistingRestaurant;
