import React, { useState } from "react";
import { PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../assets/css/OrderDetails.css";

const storeDetails = {
  name: "Gourmet Hub",
  deliveryTime: "30-40 min",
  location: "123 Main Street, Downtown",
  rating: 4.5,
};

const foodData = [
  {
    id: 1,
    title: "Classic Breakfast",
    description: "A delicious morning meal with eggs, toast, and coffee.",
    image: require("../assets/img/breakfast_image.webp"),
    price: 12.99,
    deliveryTime: "30 min",
    location: "Downtown Cafe",
    type: "veg",
  },
  {
    id: 2,
    title: "Healthy Lunch",
    description: "A fresh, healthy mix of greens, grilled chicken, and quinoa.",
    image: require("../assets/img/lunch_image.jpg"),
    price: 15.99,
    deliveryTime: "25 min",
    location: "Urban Bites",
    type: "veg",
  },
  {
    id: 3,
    title: "Delicious Dinner",
    description: "A gourmet dish with steak, mashed potatoes, and veggies.",
    image: require("../assets/img/dinner_image.webp"),
    price: 18.99,
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    type: "non-veg",
  },
];

const OrderDetails = () => {
  const [cart, setCart] = useState({});
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  // Add item to cart
  const addToCart = (id) => {
    setCart((prevCart) => ({
      ...prevCart,
      [id]: (prevCart[id] || 0) + 1,
    }));
  };

  // Remove item from cart
  const removeFromCart = (id) => {
    setCart((prevCart) => {
      if (!prevCart[id]) return prevCart;
      const updatedCart = { ...prevCart };
      updatedCart[id] -= 1;
      if (updatedCart[id] <= 0) delete updatedCart[id];
      return updatedCart;
    });
  };

  // Calculate total items in cart
  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  // Filtered food list
  const filteredFood = foodData.filter((food) => filter === "all" || food.type === filter);

  return (
    <div className="food-list-container">
      {/* Store Name */}
      <h1 className="store-title">{storeDetails.name}</h1>

      {/* Store Details Card */}
      <div className="store-details-card">
        <p className="store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="store-info">📍 {storeDetails.location}</p>
        <p className="store-info">⭐ {storeDetails.rating} / 5</p>
      </div>

      {/* Filter Buttons */}
      <div className="filter-container">
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          🍽 All
        </button>
        <button className={`filter-btn ${filter === "veg" ? "active" : ""}`} onClick={() => setFilter("veg")}>
          🥦 Veg
        </button>
        <button className={`filter-btn ${filter === "non-veg" ? "active" : ""}`} onClick={() => setFilter("non-veg")}>
          🍗 Non-Veg
        </button>
      </div>

      <h2 className="food-list-title">Recommended ({filteredFood.length})</h2>
      <ul className="food-list">
        {filteredFood.map((food) => (
          <li key={food.id} className="food-item">
            <img src={food.image} alt={food.title} className="food-image" />
            <div className="food-details">
              <h3 className="food-title">
              {food.title} {food.type === "veg" ? "🥦" : "🍗"} 
              </h3>
              <p className="food-description">{food.description}</p>
              <p className="food-location">📍 {food.location}</p>
              <p className="food-price">$ {food.price.toFixed(2)}</p>
              <div className="cart-actions">
                <button className="cart-btn" onClick={() => removeFromCart(food.id)}>
                  <MinusCircle size={20} />
                </button>
                <span className="cart-quantity">{cart[food.id] || 0}</span>
                <button className="cart-btn" onClick={() => addToCart(food.id)}>
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* View Cart Button */}
      {totalItems > 0 && (
        <button className="view-cart-btn" onClick={() => navigate("/cart")}>
          <ShoppingCart size={20} />
          View Cart ({totalItems})
        </button>
      )}
    </div>
  );
};

export default OrderDetails;
