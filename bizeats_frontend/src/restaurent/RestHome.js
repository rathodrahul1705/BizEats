import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import SignIn from "../components/SignIn";
import ExistingRestaurant from "./ExistingRestaurant"; // Import the modal
import "../assets/css/restaurent/RestHome.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"

const RestHome = ({ setUser }) => {
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showExistingRestaurant, setShowExistingRestaurant] = useState(false); // State for modal visibility
  const [restaurantsList, setrestaurantsList] = useState([]);

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
    setShowExistingRestaurant(true); // Open the modal
  };

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {

      try {
        const response = await fetchData(API_ENDPOINTS.RESTAURANT.BY_USER(user?.user_id), "GET", null, localStorage.getItem("access"));
        setrestaurantsList(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  return (
    <div className="rest-home">
      {/* Header Section */}
      <header className="rest-header">
        {user ? (
          <p className="user-welcome">Welcome, {user.full_name} 👋</p>
        ) : (
          <h1 className="rest-title">Register Your Restaurant & Grow Your Business</h1>
        )}
        <p className="rest-subtitle">Join the largest food network in just 10 minutes</p>

        <div className="button-group">
          <button className="rest-cta" onClick={handleGetStarted}>
            Register Restaurant
            <ArrowRight size={20} className="cta-icon" />
          </button>
          {
            user && restaurantsList?.active_restaurants?.length > 0 ? (

              <button
              className="rest-cta secondary"
              onClick={handleViewExistingApplication}
              >
              View Application
              <ArrowRight size={20} className="cta-icon" />
              </button>

            ) :""
          }
        </div>
      </header>

      {/* Steps Section */}
      <section className="rest-steps">
        <h2 className="steps-heading">How to Register?</h2>
        <ul className="steps-list">
          {[
            "PAN Card",
            "GST Number (if applicable)",
            "FSSAI License",
            "Menu & Profile Food Image",
            "Bank Account Details",
          ].map((step, index) => (
            <li key={index} className="step-item">
              <CheckCircle size={24} className="step-icon" />
              <span className="step-text">{step}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* About Section */}
      <section className="rest-about">
        <h2 className="about-heading">Why Register With Us?</h2>
        <p className="about-text">
          Join thousands of restaurants that have grown their business with our platform. Get more
          customers, increase your visibility, and streamline your operations.
        </p>
      </section>

      {/* Contact Section */}
      <section className="rest-contact">
        <h2 className="contact-heading">Need Help?</h2>
        <p className="contact-text">
          Our support team is available 24/7 to assist you. Reach out to us anytime.
        </p>
        <button className="contact-button">Contact Us</button>
      </section>

      {/* Sign-In Popup */}
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

      {/* Existing Restaurant Modal */}
      {showExistingRestaurant && (
        <ExistingRestaurant onClose={() => setShowExistingRestaurant(false)} restaurantsList={restaurantsList}/>
      )}
    </div>
  );
};

export default RestHome;