import React from 'react';
import { FaLeaf, FaRocket, FaHeart, FaStore, FaMoneyBillWave, FaUtensils, FaSmile } from 'react-icons/fa';
import "../../assets/css/links/AboutUs.css";

const AboutUs = () => {
  return (
    <div className="aboutus">
      {/* Hero Section with CSS Pattern Background */}
      <div className="aboutus__hero">
        <div className="aboutus__hero-content">
          <h1>About EATOOR</h1>
          <p className="subtitle">Delicious Homemade Meals, Just Around the Corner</p>
          <div className="aboutus__stats">
            <div className="stat-item">
              <FaUtensils className="stat-icon" />
              <span className="stat-number">4+</span>
              <span className="stat-label">Home Chefs</span>
            </div>
            <div className="stat-item">
              <FaSmile className="stat-icon" />
              <span className="stat-number">1K+</span>
              <span className="stat-label">Happy Customers</span>
            </div>
            <div className="stat-item">
              <FaRocket className="stat-icon" />
              <span className="stat-number">1.5K+</span>
              <span className="stat-label">Meals Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="aboutus__content">
        {/* Who We Are Section */}
        <section className="aboutus__section aboutus__section--who">
          <div className="section-content">
            <h2>Who We Are</h2>
            <p>
              EATOOR is a homegrown food delivery platform committed to connecting local kitchens and food vendors with hungry customers. 
              Born out of a passion for great food and convenience, we are redefining how people enjoy meals—fresh, fast, and full of flavor.
            </p>
            <p>
              Our platform bridges the gap between talented home chefs and food enthusiasts who crave authentic, homemade meals without the hassle of cooking.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="aboutus__section aboutus__section--mission">
          <div className="mission-card">
            <h2>Our Mission</h2>
            <p>
              To empower local home chefs by providing a digital platform to grow, while ensuring customers receive high-quality meals from their favorite kitchens with speed and trust.
            </p>
            <div className="mission-values">
              <div className="value-item">
                <div className="value-icon">
                  <FaLeaf />
                </div>
                <h3>Sustainability</h3>
                <p>Supporting local economies and reducing food waste</p>
              </div>
              <div className="value-item">
                <div className="value-icon">
                  <FaHeart />
                </div>
                <h3>Community</h3>
                <p>Building connections through shared food experiences</p>
              </div>
              <div className="value-item">
                <div className="value-icon">
                  <FaRocket />
                </div>
                <h3>Innovation</h3>
                <p>Constantly improving our platform and services</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="aboutus__section aboutus__section--why">
          <h2>Why Choose EATOOR?</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <FaRocket />
              </div>
              <h3>Fast & Reliable</h3>
              <p>Average delivery time under 30 minutes in urban areas</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <FaStore />
              </div>
              <h3>Authentic Meals</h3>
              <p>100% home-cooked meals from verified local chefs</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <FaMoneyBillWave />
              </div>
              <h3>Fair Pricing</h3>
              <p>No hidden fees with transparent cost breakdown</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <FaHeart />
              </div>
              <h3>Customer Support</h3>
              <p>24/7 support with 95% satisfaction rate</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;