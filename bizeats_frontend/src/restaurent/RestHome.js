import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import SignIn from "../components/SignIn";
import "../assets/css/restaurent/RestHome.css";

const RestHome = ({ setUser }) => {
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(false);

  // Get user from localStorage
  const user = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null;

  const handleGetStarted = () => {
    if (user) {
      navigate("/register-restaurant");
    } else {
      setShowSignIn(true);
    }
  };

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
        <button className="rest-cta" onClick={handleGetStarted}> 
          Register Your Restaurant
          <ArrowRight size={20} className="cta-icon" />
        </button>
      </header>

      {/* Steps Section */}
      <section className="rest-steps">
        <h2 className="steps-heading">How to Register?</h2>
        <ul className="steps-list">
          {["PAN Card", "GST Number (if applicable)", "FSSAI License", "Menu & Profile Food Image", "Bank Account Details"].map((step, index) => (
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
        <p className="about-text">Join thousands of restaurants that have grown their business with our platform. Get more customers, increase your visibility, and streamline your operations.</p>
      </section>

      {/* Contact Section */}
      <section className="rest-contact">
        <h2 className="contact-heading">Need Help?</h2>
        <p className="contact-text">Our support team is available 24/7 to assist you. Reach out to us anytime.</p>
        <button className="contact-button">Contact Us</button>
      </section>

      {/* Sign-In Popup */}
      {showSignIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          setUser={(userData) => {
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData); //
            setShowSignIn(false);
          }}
        />
      )}
    </div>
  );
};

export default RestHome;
