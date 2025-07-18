import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, ChefHat, Users, Clock, Shield, PieChart } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);

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
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  return (
    <div className="res-home">
      {/* Hero Section */}
      <section className="res-home__hero">
        <div className="res-home__hero-content">
          {user ? (
            <h1 className="res-home__welcome-message">
              Welcome back, <span>{user.full_name}</span>
            </h1>
          ) : (
            <h1 className="res-home__main-heading">
              Grow Your <span>HomeChef</span> Business
            </h1>
          )}
          <p className="res-home__sub-heading">
            Join India's fastest growing home chef platform
          </p>

          <div className="res-home__action-buttons">
            <button className="res-home__primary-btn" onClick={handleGetStarted}>
              Register HomeChef
              <ArrowRight size={18} />
            </button>
            {user && (restaurantsList?.active_restaurants?.length > 0 ||
                     restaurantsList?.live_restaurants?.length > 0) && (
              <button 
                className="res-home__secondary-btn" 
                onClick={handleViewExistingApplication}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'View Applications'}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {user && (restaurantsList?.active_restaurants?.length > 0 ||
               restaurantsList?.live_restaurants?.length > 0) && (
        <section className="res-home__stats">
          <div className="res-home__stats-grid">
            <div className="res-home__stat-card">
              <div className="res-home__stat-icon">
                <ChefHat size={24} />
              </div>
              <div className="res-home__stat-content">
                <h3>{restaurantsList?.live_restaurants?.length || 0}</h3>
                <p>Live Restaurants</p>
              </div>
            </div>
            <div className="res-home__stat-card">
              <div className="res-home__stat-icon">
                <Users size={24} />
              </div>
              <div className="res-home__stat-content">
                <h3>1.2K+</h3>
                <p>Monthly Customers</p>
              </div>
            </div>
            <div className="res-home__stat-card">
              <div className="res-home__stat-icon">
                <PieChart size={24} />
              </div>
              <div className="res-home__stat-content">
                <h3>85%</h3>
                <p>Approval Rate</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Requirements Section */}
      <section className="res-home__requirements">
        <div className="res-home__section-header">
          <h2>Document Checklist</h2>
          <p className="res-home__section-desc">
            Prepare these documents for a seamless registration
          </p>
        </div>
        <div className="res-home__req-grid">
          {[
            { 
              title: "PAN Card", 
              description: "Required for tax purposes",
              icon: <CheckCircle size={20} />
            },
            { 
              title: "GST Number", 
              description: "If applicable to your business",
              icon: <CheckCircle size={20} />
            },
            { 
              title: "FSSAI License", 
              description: "Mandatory for all food businesses",
              icon: <CheckCircle size={20} />
            },
            { 
              title: "Menu & Photos", 
              description: "High-quality images of your dishes",
              icon: <CheckCircle size={20} />
            },
            { 
              title: "Bank Details", 
              description: "For payment transfers",
              icon: <CheckCircle size={20} />
            },
            { 
              title: "Kitchen Details", 
              description: "About your cooking space",
              icon: <CheckCircle size={20} />
            },
          ].map((item, index) => (
            <div className="res-home__req-card" key={index}>
              <div className="res-home__req-icon">{item.icon}</div>
              <div className="res-home__req-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="res-home__benefits">
        <div className="res-home__section-header">
          <h2>Why Choose Our Platform?</h2>
          <p className="res-home__section-desc">
            We're committed to helping home chefs succeed
          </p>
        </div>
        <div className="res-home__benefits-grid">
          {[
            {
              title: "Expanded Reach",
              description: "Access thousands of customers",
              icon: <Users size={32} />
            },
            {
              title: "Time Savings",
              description: "We handle marketing and payments",
              icon: <Clock size={32} />
            },
            {
              title: "Trust & Credibility",
              description: "Verified chef status",
              icon: <Shield size={32} />
            }
          ].map((benefit, index) => (
            <div className="res-home__benefit-card" key={index}>
              <div className="res-home__benefit-icon">{benefit.icon}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="res-home__cta">
        <div className="res-home__cta-content">
          <h2>Ready to Start Your HomeChef Journey?</h2>
          <p>Join thousands of home chefs today</p>
          <button className="res-home__primary-btn" onClick={handleGetStarted}>
            Register Now - It's Free!
            <ArrowRight size={18} />
          </button>
        </div>
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