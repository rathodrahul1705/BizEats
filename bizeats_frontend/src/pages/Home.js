import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";

// Category Data
const categories = [
  {
    id: 1,
    name: "Breakfast",
    image: require("../assets/img/breakfast_image.webp")
  },
  {
    id: 2,
    name: "Lunch",
    image: require("../assets/img/lunch_image.jpg")
  },
  {
    id: 3,
    name: "Dinner",
    image: require("../assets/img/dinner_image.webp")
  }
];

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Delicious Food, Delivered To You</h1>
          <p>
            Experience top-quality meals from your favorite local restaurants,
            delivered right to your door.
          </p>
          <Link to="/food-list">
            <button className="order-now-btn">Order Now</button>
          </Link>
        </div>
      </section>

      {/* Featured Categories Section (Section 2) */}
      <section className="restaurants-section">
        <h2 className="section-heading">Browse by Categories</h2>
        <div className="restaurant-list">
          {categories.map((category) => (
            <Link key={category.id} to="/food-list" className="restaurant-link">
              <div className="restaurant-card">
                <img
                  src={category.image}
                  alt={category.name}
                  className="category-image"
                  width="200"
                  height="150"
                />
                <p className="category-name">{category.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works Section (Section 3) */}
      <section className="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <h3>1. Choose Your Meal</h3>
            <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
          </div>
          <div className="step-card">
            <h3>2. Place Your Order</h3>
            <p>Order online easily and enjoy lightning-fast delivery.</p>
          </div>
          <div className="step-card">
            <h3>3. Enjoy Your Food</h3>
            <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
