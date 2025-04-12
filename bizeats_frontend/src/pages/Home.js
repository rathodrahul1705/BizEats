import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import { ArrowRightCircle } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import HomePageThali from "../assets/img/homepage.webp";

// Carousel images (replace with your actual images)
const carouselImages = [
  {
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    title: "Authentic Home-Cooked Meals",
    subtitle: "Made with love by local home chefs"
  },
  {
    url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    title: "Healthy & Nutritious",
    subtitle: "Fresh ingredients, balanced meals"
  },
  {
    url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    title: "Diverse Cuisines",
    subtitle: "Explore flavors from around the city"
  },
  {
    url: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
    title: "Delivered to Your Doorstep",
    subtitle: "Hot, fresh, and ready to enjoy"
  }
];

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
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1>Delicious <span className="homemade-key">Homemade</span> Meals, Just Around the Corner</h1>
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

      {/* Premium Carousel Section */}
      {/* Premium Carousel Section */}
      <section className="premium-carousel-section">
        <div className="section-container">
          <div className="carousel-wrapper">
            <Swiper
              modules={[Autoplay, EffectFade, Pagination, Navigation]}
              effect="fade"
              spaceBetween={0}
              slidesPerView={1}
              loop={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              navigation={true}
              className="premium-carousel"
            >
              {carouselImages.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div className="carousel-slide">
                    <div className="carousel-image-overlay"></div>
                    <img 
                      src={slide.url} 
                      alt={`Carousel ${index + 1}`} 
                      className="carousel-image"
                    />
                    <div className="carousel-content">
                      <div className="carousel-text-container">
                        <h1 className="carousel-title">{slide.title}</h1>
                        <p className="carousel-subtitle">{slide.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="section-container">
          <h2 className="section-heading">How It Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <span className="step-number">1</span>
              <h3>Choose Your Meal</h3>
              <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h3>Place Your Order</h3>
              <p>Order online easily and enjoy lightning-fast delivery.</p>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h3>Enjoy Your Food</h3>
              <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Slider Section */}
      <section className="food-slider-section">
        <div className="section-container">
          <h2 className="section-heading">Discover the Best Home Kitchens Around You</h2>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={3.5}
            navigation
            loop={false}
            breakpoints={{
              320: { slidesPerView: 1.2 },
              640: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3.5 },
            }}
          >
            {restaurants.map((restaurant) => (
              <SwiperSlide key={restaurant.restaurant_id}>
                <Link to={`/order-details/${restaurant.restaurant_id}`} className="food-card-wrapper-link">
                  <div className="food-card">
                    <div className="food-card-inner">
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
        </div>
      </section>
    </div>
  );
};

export default Home;