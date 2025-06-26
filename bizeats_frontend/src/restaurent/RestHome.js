import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import SignIn from "../components/SignIn";
import ExistingRestaurant from "./ExistingRestaurant";
import "../assets/css/restaurent/RestHome.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const RestHome = ({ setUser }) => {
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showExistingRestaurant, setShowExistingRestaurant] = useState(false);
  const [restaurantsList, setRestaurantsList] = useState([]);

  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;

  const handleGetStarted = () => {
    if (user) {
      navigate("/register-restaurant");
    } else {
      setShowSignIn(true);
    }
  };

  const handleViewExistingApplication = () => {
    setShowExistingRestaurant(true);
  };

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {
      try {
        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.BY_USER(user?.user_id),
          "GET",
          null,
          localStorage.getItem("access")
        );
        setRestaurantsList(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  return (
    <div className="rest-home-container">
      {/* Header Section */}
      <header className="rest-header">
        {user ? (
          <h1 className="welcome-message">
            Welcome back, <span>{user.full_name}</span>
          </h1>
        ) : (
          <h1 className="main-heading">Register Your HomeChef</h1>
        )}
        <p className="sub-heading">
          Join our platform and reach thousands of customers
        </p>

        <div className="action-buttons">
          <button className="primary-button" onClick={handleGetStarted}>
            Register HomeChef
            <ArrowRight size={18} />
          </button>
          {user && (restaurantsList?.active_restaurants?.length > 0 ||
                   restaurantsList?.live_restaurants?.length > 0) && (
            <button 
              className="secondary-button" 
              onClick={handleViewExistingApplication}
            >
              View Applications
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Requirements Section */}
      <section className="requirements-section">
        <h2>What you'll need</h2>
        <p className="section-description">
          Have these documents ready for a smooth registration process
        </p>
        <ul className="requirements-list">
          {[
            "PAN Card",
            "GST Number (if applicable)",
            "FSSAI License",
            "Menu & Profile Food Image",
            "Bank Account Details",
          ].map((item, index) => (
            <li key={index}>
              <CheckCircle size={20} className="check-icon" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <h2>Why join our platform?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>More Customers</h3>
            <p>Get discovered by thousands of hungry customers in your area</p>
          </div>
          <div className="benefit-card">
            <h3>Easy Management</h3>
            <p>Simple tools to manage your menu, orders, and payments</p>
          </div>
          <div className="benefit-card">
            <h3>Quick Setup</h3>
            <p>Get started in minutes with our straightforward onboarding</p>
          </div>
          <div className="benefit-card">
            <h3>24/7 Support</h3>
            <p>Our team is always ready to help you with any questions</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <h2>Ready to get started?</h2>
        <button className="primary-button" onClick={handleGetStarted}>
          Register Your HomeChef Now
          <ArrowRight size={18} />
        </button>
      </section>

      {/* Modals */}
      {showSignIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          setUser={(userData) => {
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            setShowSignIn(false);
          }}
        />
      )}

      {showExistingRestaurant && (
        <ExistingRestaurant
          onClose={() => setShowExistingRestaurant(false)}
          restaurantsList={restaurantsList}
        />
      )}
    </div>
  );
};

export default RestHome;