import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import "../assets/css/restaurent/ExistingRestaurant.css";

const ExistingRestaurant = ({ onClose, restaurantsList }) => {
  const [activeTab, setActiveTab] = useState("active");
  const navigate = useNavigate(); // React Router navigation

  // Extract active and live restaurants from the response
  const activeRestaurants = restaurantsList?.active_restaurants || [];
  const liveRestaurants = restaurantsList?.live_restaurants || [];

  // Navigate to restaurant registration page
  const handleNavigate = (restaurant_id) => {
    navigate(`/register-restaurant/${restaurant_id}`);
  };

  return (
    <div className="existing-restaurant-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
        <h2>Your restaurant applications</h2>

        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === "active" ? "active" : ""}`} 
            onClick={() => setActiveTab("active")}
          >
            Active Restaurants
          </button>
          <button 
            className={`tab-button ${activeTab === "live" ? "active" : ""}`} 
            onClick={() => setActiveTab("live")}
          >
            Live Restaurants
          </button>
        </div>

        {activeTab === "active" && (
          <div className="section">
            <div className="card-container">
              {activeRestaurants.length > 0 ? (
                activeRestaurants.map((restaurant) => (
                  <div key={restaurant.restaurant_id} className="card">
                    <h3>{restaurant.restaurant_name}</h3>
                    <p><strong>Restaurant ID:</strong> {restaurant.restaurant_id}</p>
                    <p><strong>Status:</strong> <span className="status in-progress">Active</span></p>

                    {/* Show location details if available */}
                    {restaurant.location ? (
                      <div className="location-details">
                        <p><strong>Shop No / Building:</strong> {restaurant.location.shop_no_building}</p>
                        <p><strong>Floor / Tower:</strong> {restaurant.location.floor_tower}</p>
                        <p><strong>Area / Locality:</strong> {restaurant.location.area_sector_locality}</p>
                        <p><strong>City:</strong> {restaurant.location.city}</p>
                        <p><strong>Nearby Landmark:</strong> {restaurant.location.nearby_locality}</p>
                      </div>
                    ) : (
                      <p className="no-location">No location details available</p>
                    )}

                    <button 
                      className="card-button continue" 
                      onClick={() => handleNavigate(restaurant.restaurant_id)}
                    >
                      Continue
                    </button>
                  </div>
                ))
              ) : (
                <p>No active restaurants found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "live" && (
          <div className="section">
            <div className="card-container">
              {liveRestaurants.length > 0 ? (
                liveRestaurants.map((restaurant) => (
                  <div key={restaurant.restaurant_id} className="card">
                    <h3>{restaurant.restaurant_name}</h3>
                    <p><strong>Restaurant ID:</strong> {restaurant.restaurant_id}</p>
                    <p><strong>Status:</strong> <span className="status completed">Live</span></p>

                    {/* Show location details if available */}
                    {restaurant.location ? (
                      <div className="location-details">
                        <p><strong>Shop No / Building:</strong> {restaurant.location.shop_no_building}</p>
                        <p><strong>Floor / Tower:</strong> {restaurant.location.floor_tower}</p>
                        <p><strong>Area / Locality:</strong> {restaurant.location.area_sector_locality}</p>
                        <p><strong>City:</strong> {restaurant.location.city}</p>
                        <p><strong>Nearby Landmark:</strong> {restaurant.location.nearby_locality}</p>
                      </div>
                    ) : (
                      <p className="no-location">No location details available</p>
                    )}

                    <button 
                      className="card-button edit" 
                      onClick={() => handleNavigate(restaurant.restaurant_id)}
                    >
                      Edit
                    </button>
                  </div>
                ))
              ) : (
                <p>No live restaurants found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExistingRestaurant;
