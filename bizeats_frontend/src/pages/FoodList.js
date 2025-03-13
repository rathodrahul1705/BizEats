import React from "react";
import { ArrowRightCircle } from "lucide-react";
import "../assets/css/FoodList.css";
import { Link } from "react-router-dom";

const foodData = [
  {
    id: 1,
    title: "Classic Breakfast",
    image: require("../assets/img/breakfast_image.webp"),
    deliveryTime: "30 min",
    location: "Downtown Cafe",
    brand: "Cafe Delight", // Added brand name
    price: "99",
  },
  {
    id: 2,
    title: "Healthy Lunch ddddd",
    image: require("../assets/img/lunch_image.jpg"),
    deliveryTime: "25 min",
    location: "Urban Bites",
    brand: "Healthy Eats", // Added brand name
    price: "129",
  },
  {
    id: 3,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "99",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  }
];

const FoodGrid = () => {
  return (
    <div className="food-grid-container">
      <section className="food-section">
        <h2 className="food-title">Order from favourites</h2>
        <div className="food-card-wrapper">
          {foodData.map((food) => (
            <Link to="/order-details" className="food-card-wrapper-link" key={food.id}>
              <div className="food-card">
                <div className="food-card-inner">
                  <img src={food.image} alt={food.title} className="food-image" />
                  <p className="food-price">ITEM AT ₹{food.price}</p> {/* Display price */}
                </div>
                
                <button className="proceed-button">
                  <ArrowRightCircle size={20} />
                </button>
                <div className="food-details">
                  <p className="food-name">{food.title}</p>
                  <p className="food-location">📍 {food.location}</p>
                  <p className="food-delivery">⏳ {food.deliveryTime}</p>
                  <p className="food-brand">{food.brand}</p> {/* Display brand name */}
                  
                </div>
                
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default FoodGrid;
