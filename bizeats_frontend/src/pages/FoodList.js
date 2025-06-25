import React, { useState, useEffect } from "react";
import { ArrowRightCircle } from "lucide-react";
import "../assets/css/FoodList.css";
import { Link } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

const FoodGrid = () => {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const renderCards = () => (
    restaurants.map((restaurant) => (
      <div className="food-card-wrapper" key={restaurant.restaurant_id}>
        <Link 
          to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
          className="food-card-list" 
        >
          <div className="food-card-media">
            <img 
              src={restaurant.restaurant_image} 
              alt={restaurant.restaurant_name} 
              className="food-card-image"
              loading="lazy"
            />
            <div className="food-card-badge">
              <span className="food-card-price">₹{restaurant.avg_price_range}</span>
              <span className="food-card-rating">⭐ {restaurant.rating || '4.5'}</span>
            </div>
            <button className="food-card-action">
              <ArrowRightCircle size={20} />
            </button>
          </div>
          
          <div className="food-card-content">
            <h3 className="food-card-title">{restaurant.restaurant_name}</h3>
            <p className="food-card-cuisine">{restaurant.item_cuisines}</p>
            
            <div className="food-card-meta">
              <span className="food-card-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {restaurant.restaurant_location}
              </span>
              <span className="food-card-delivery">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                45 min
              </span>
            </div>
          </div>
        </Link>
      </div>
    ))
  );

  return (
    <div className="food-grid-container">
      <div className="food-grid-content">
        <header className="food-grid-header">
          <h2 className="food-grid-title">Order from nearby kitchens</h2>
        </header>
        
        {isMobile ? (
          <div className="mobile-swiper-container">
            <Swiper
              slidesPerView={1.2}
              spaceBetween={15}
              freeMode={true}
              pagination={{
                clickable: true,
              }}
              modules={[FreeMode, Pagination]}
              className="mobile-food-swiper"
              breakpoints={{
                480: {
                  slidesPerView: 1.5,
                },
                640: {
                  slidesPerView: 2.2,
                }
              }}
            >
              {restaurants.map((restaurant) => (
                <SwiperSlide key={restaurant.restaurant_id}>
                  {renderCards().find(card => card.key === restaurant.restaurant_id)}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div className="desktop-swiper-container">
            <Swiper
              slidesPerView={'auto'}
              spaceBetween={20}
              navigation={true}
              freeMode={true}
              modules={[Navigation, FreeMode]}
              className="desktop-food-swiper"
            >
              {restaurants.map((restaurant) => (
                <SwiperSlide key={restaurant.restaurant_id} style={{ width: '280px' }}>
                  {renderCards().find(card => card.key === restaurant.restaurant_id)}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodGrid;