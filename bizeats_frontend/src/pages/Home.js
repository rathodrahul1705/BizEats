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
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import HomePageThali from "../assets/img/homepage.png";

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const response = await fetchData(API_ENDPOINTS.HOME.LIVE_RES_LIST, "GET", null);
        setRestaurants(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
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
      {/* Hero Section - Clean One-Screen Layout */}
      <section className="hero-section clean-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Delicious <span className="homemade_key">Homemade</span> Meals, Just Around the Corner</h1>
            <p>Enjoy soulful, healthy, and flavorful dishes made with love by home chefs in your neighborhood. Real food, real taste — straight from home to you.</p>
            <Link to="/food-list">
              <button className="order-now-btn">Order Now</button>
            </Link>
          </div>
          <div className="hero-image-wrapper">
            <img
              src={HomePageThali}
              alt="Home Food Thali"
              className="hero-thali-image"
            />
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <span className="stepNumber">1</span>
            <h3>Choose Your Meal</h3>
            <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">2</span>
            <h3>Place Your Order</h3>
            <p>Order online easily and enjoy lightning-fast delivery.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">3</span>
            <h3>Enjoy Your Food</h3>
            <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
          </div>
        </div>
      </section>

      {/* Restaurant Slider Section */}
      <section className="foodDataSlider">
        <h2 className="section-heading">Discover the Best Home Kitchens Around You</h2>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={3.5}
          navigation
          loop={false}
          breakpoints={{
            320: { slidesPerView: 1.5 },
            640: { slidesPerView: 2.5 },
            1024: { slidesPerView: 3.5 },
          }}
        >
          {restaurants.map((restaurant) => (
            <SwiperSlide key={restaurant.restaurant_id}>
              <Link to={`/order-details/${restaurant.restaurant_id}`} className="food-card-wrapper-link">
                <div className="foodDataBox">
                  <div className="foodDataBoxInner">
                    <img
                      src={restaurant.restaurant_image}
                      alt={restaurant.restaurant_name}
                      className="food-image"
                    />
                    <p className="food-price">ITEM AT ₹{restaurant.avg_price_range}</p>
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
