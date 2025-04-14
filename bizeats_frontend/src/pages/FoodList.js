import React, { useState, useEffect } from "react";
import { ArrowRightCircle } from "lucide-react";
import "../assets/css/FoodList.css";
import { Link } from "react-router-dom";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"
import StripeLoader from "../loader/StripeLoader";

const FoodGrid = () => {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    setLoading(true)
    // Fetch data from the API
    const fetchRestaurants = async () => {
      try {
        const response = await fetchData(API_ENDPOINTS.HOME.LIVE_RES_LIST, "GET", null);
        setRestaurants(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
      finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  if (loading && restaurants.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="food-grid-container">
      <section className="food-section">
        <h2 className="food-title">Order from nearby kitchens</h2>
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
                  <p className="food-delivery">⏳ {"45"}</p>
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
