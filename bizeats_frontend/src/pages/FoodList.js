import React, { useState, useEffect } from "react";
import { ArrowRightCircle } from "lucide-react";
import "../assets/css/FoodList.css";
import { Link } from "react-router-dom";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"

// const foodData = [
//   {
//     id: 1,
//     title: "Classic Breakfast",
//     image: require("../assets/img/breakfast_image.webp"),
//     deliveryTime: "30 min",
//     location: "Downtown Cafe",
//     brand: "Cafe Delight", // Added brand name
//     price: "99",
//   },
//   {
//     id: 2,
//     title: "Healthy Lunch ddddd tttt",
//     image: require("../assets/img/lunch_image.jpg"),
//     deliveryTime: "25 min",
//     location: "Urban Bites",
//     brand: "Healthy Eats", // Added brand name
//     price: "129",
//   },
//   {
//     id: 3,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "99",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   },
//   {
//     id: 4,
//     title: "Delicious Dinner",
//     image: require("../assets/img/dinner_image.webp"),
//     deliveryTime: "40 min",
//     location: "Gourmet Hub",
//     brand: "Gourmet Kitchen", // Added brand name
//     price: "149",
//   }
// ];

const FoodGrid = () => {

  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    // Fetch data from the API
    const fetchRestaurants = async () => {
      try {
        const response = await fetchData(API_ENDPOINTS.HOME.LIVE_RES_LIST, "GET", null);
        setRestaurants(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, []);


  return (
    <div className="food-grid-container">
      <section className="food-section">
        <h2 className="food-title">Order from favourites</h2>
        <div className="food-card-wrapper">
          {restaurants.map((food) => (
            <Link to={`/order-details/${food.restaurant_id}`} className="food-card-wrapper-link" key={food.id}>
              <div className="food-card">
                <div className="food-card-inner">
                  <img src={food.restaurant_image} alt={food.item_cuisines} className="food-image" />
                  <p className="food-price">ITEM AT ₹{food.avg_price_range}</p> {/* Display price */}
                </div>
                
                <button className="proceed-button">
                  <ArrowRightCircle size={20} />
                </button>
                <div className="food-details">
                  <p className="food-location">📍 {food.restaurant_location}</p>
                  <p className="food-delivery">⏳ {"23"}</p>
                  <p className="food-name">{food.item_cuisines}</p>
                  <p className="food-brand">{food.restaurant_name}</p> {/* Display brand name */}
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
