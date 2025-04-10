import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import { ArrowRightCircle } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"
import StripeLoader from "../loader/StripeLoader";

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
    image: require("../assets/img/lunch_image.webp")
  },
  {
    id: 3,
    name: "Dinner",
    image: require("../assets/img/dinner_image.webp")
  }
];

const Home = () => {
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
        {/* Featured Categories Section (Section 2) */}
        <div className="restaurants-section">
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
        </div>
      </section>

      {/* How It Works Section (Section 3) */}
      <section className="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <span className="stepNumber">1</span>
            <h3> Choose Your Meal</h3>
            <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">2</span>
            <h3> Place Your Order</h3>
            <p>Order online easily and enjoy lightning-fast delivery.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">3</span>
            <h3> Enjoy Your Food</h3>
            <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
          </div>
        </div>
      </section>

      <section className="foodDataSlider">
        <h2 className="section-heading">Discover best restaurants for food order</h2>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}  // Adjust space between slides
          slidesPerView={3.5} 
          navigation
          // pagination={{ clickable: true }}
          // autoplay={{ delay: 3000 }}
          loop={false}
          breakpoints={{
            320: { slidesPerView: 1.5 }, // Mobile (small screens)
            640: { slidesPerView: 2.5 }, // Tablets
            1024: { slidesPerView: 3.5 }, // Desktops
          }}
        >
          {restaurants.map((restaurant) => (
              <SwiperSlide key={restaurant.restaurant_id}>
                <Link to={`/order-details/${restaurant.restaurant_id}`} className="food-card-wrapper-link" key={restaurant.restaurant_id}>
                <div className="foodDataBox">
                  <div className="foodDataBoxInner">
                    {/* You can replace the image source with a placeholder or dynamically fetched image */}
                    <img src={restaurant.restaurant_image} alt={restaurant.restaurant_name} className="food-image" />
                    <p className="food-price">ITEM AT ₹{restaurant.avg_price_range}</p> {/* Display price */}
                  </div>
                  <button className="proceed-button">
                    <ArrowRightCircle size={20} />
                  </button>
                  <div className="food-details">
                    <p className="food-name">{restaurant.restaurant_name}</p>
                    <p className="food-location">📍 {restaurant.restaurant_location}</p>
                    <p className="food-delivery">⏳ {restaurant.item_cuisines}</p>
                  </div>
                </div>
                </Link>
              </SwiperSlide>
          ))}
        </Swiper>    
      </section>
    </div>
  );
};

export default Home;