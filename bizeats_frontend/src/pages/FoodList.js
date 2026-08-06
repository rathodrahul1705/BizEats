// FoodGrid.jsx
import React, { useState, useEffect, useRef } from "react";
import { ArrowRightCircle, ChevronLeft, ChevronRight, Clock, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

// Image imports
import HomePageUpma from "../assets/img/snaks.png";
import HomePagePoha from "../assets/img/home_page_poha.png";
import HomePageMaggie from "../assets/img/home_page_maggie.webp";
import HomePageEggRoll from "../assets/img/home_page_egg_roll.png";
import HomePageChickenBiryani from "../assets/img/home_page_chicken_biryani.png";
import HomePageEggBiryani from "../assets/img/home_page_chicken_biryani.png";
import HomePageGulabJamun from "../assets/img/home_page_gulab_jamun.png";
import HomePageKokamSarbat from "../assets/img/homa_page_kokam_sarbat.png";

import "../assets/css/FoodList.css";

const FoodGrid = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const foodSwiperRef = useRef(null);
  const restaurantsSwiperRef = useRef(null);
  
  const [isFoodBeginning, setIsFoodBeginning] = useState(true);
  const [isFoodEnd, setIsFoodEnd] = useState(false);
  const [isRestaurantsBeginning, setIsRestaurantsBeginning] = useState(true);
  const [isRestaurantsEnd, setIsRestaurantsEnd] = useState(false);

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
        setRestaurants(response.data.KitchenList || []);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const foodItems = [
    { name: "Chicken Biryani", image: HomePageChickenBiryani },
    { name: "Gulab Jamun", image: HomePageGulabJamun },
    { name: "Samosa", image: HomePageUpma },
    { name: "Poha", image: HomePagePoha },
    { name: "Maggie", image: HomePageMaggie },
    { name: "Egg Roll", image: HomePageEggRoll },
    { name: "Egg Biryani", image: HomePageEggBiryani },
    { name: "Beverage", image: HomePageKokamSarbat }
  ];

  const handleFoodPrev = () => foodSwiperRef.current?.swiper.slidePrev();
  const handleFoodNext = () => foodSwiperRef.current?.swiper.slideNext();
  const handleRestaurantsPrev = () => restaurantsSwiperRef.current?.swiper.slidePrev();
  const handleRestaurantsNext = () => restaurantsSwiperRef.current?.swiper.slideNext();

  const updateFoodNavigationState = (swiper) => {
    setIsFoodBeginning(swiper.isBeginning);
    setIsFoodEnd(swiper.isEnd);
  };

  const updateRestaurantsNavigationState = (swiper) => {
    setIsRestaurantsBeginning(swiper.isBeginning);
    setIsRestaurantsEnd(swiper.isEnd);
  };

  const getUserGreeting = () => {
    if (!user?.full_name) return "What's on your mind";
    const firstName = user.full_name.split(' ')[0];
    return `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}, What's on your mind`;
  };

  const renderCard = (restaurant) => (
    <div className="food-list-restaurant-card" key={restaurant.restaurant_id}>
      <Link 
        to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
        className="food-list-restaurant-card__link"
      >
        <div className="food-list-restaurant-card__image-wrapper">
          <img 
            src={restaurant.restaurant_image} 
            alt={restaurant.restaurant_name} 
            className="food-list-restaurant-card__image"
            loading="lazy"
          />
          <div className="food-list-restaurant-card__badges">
            <span className="food-list-restaurant-card__price-badge">
              ₹{restaurant.avg_price_range} for two
            </span>
            {restaurant.rating && (
              <span className="food-list-restaurant-card__rating-badge">
                <Star size={12} fill="#FF8250" color="#FF8250" />
                {restaurant.rating}
              </span>
            )}
          </div>
          <button className="food-list-restaurant-card__action-btn" aria-label="View restaurant">
            <ArrowRightCircle size={20} />
          </button>
        </div>

        <div className="food-list-restaurant-card__content">
          <h3 className="food-list-restaurant-card__title">{restaurant.restaurant_name}</h3>
          <div className="food-list-restaurant-card__meta">
            <span className="food-list-restaurant-card__delivery">
              <Clock size={14} />
              {restaurant.delivery_time || '30-45 mins'}
            </span>
          </div>
          <p className="food-list-restaurant-card__cuisine">{restaurant.item_cuisines}</p>
          <div className="food-list-restaurant-card__footer">
            <span className="food-list-restaurant-card__location">
              <MapPin size={14} />
              {restaurant.restaurant_location}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );

  if (loading && restaurants.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="food-list-restaurant">
      <div className="food-list-restaurant__container">
        {/* Food Categories - Desktop */}
        {!isMobile && (
          <section className="food-list-restaurant-categories">
            <div className="food-list-restaurant-categories__header">
              <h2 className="food-list-restaurant-categories__title">{getUserGreeting()}</h2>
              <div className="food-list-restaurant-categories__controls">
                <button 
                  onClick={handleFoodPrev} 
                  className={`food-list-restaurant-categories__arrow ${isFoodBeginning ? 'disabled' : ''}`}
                  disabled={isFoodBeginning}
                  aria-label="Previous categories"
                >
                  <ChevronLeft size={22} />
                </button>
                <button 
                  onClick={handleFoodNext} 
                  className={`food-list-restaurant-categories__arrow ${isFoodEnd ? 'disabled' : ''}`}
                  disabled={isFoodEnd}
                  aria-label="Next categories"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            <div className="food-list-restaurant-categories__swiper">
              <Swiper
                ref={foodSwiperRef}
                modules={[Navigation]}
                spaceBetween={16}
                slidesPerView={6}
                onSlideChange={updateFoodNavigationState}
                onSwiper={updateFoodNavigationState}
                breakpoints={{
                  320: { slidesPerView: 3, spaceBetween: 12 },
                  480: { slidesPerView: 4, spaceBetween: 12 },
                  640: { slidesPerView: 5, spaceBetween: 16 },
                  1024: { slidesPerView: 6, spaceBetween: 16 }
                }}
              >
                {foodItems.map((item, index) => (
                  <SwiperSlide key={index}>
                    <Link 
                      to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} 
                      className="food-list-restaurant-categories__item"
                    >
                      <div className="food-list-restaurant-categories__image-wrapper">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="food-list-restaurant-categories__image"
                          loading="lazy"
                        />
                      </div>
                      <p className="food-list-restaurant-categories__name">{item.name}</p>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </section>
        )}

        {/* Food Categories - Mobile */}
        {isMobile && (
          <section className="food-list-restaurant-categories-mobile">
            <h2 className="food-list-restaurant-categories-mobile__title">{getUserGreeting()}</h2>
            <div className="food-list-restaurant-categories-mobile__grid">
              {foodItems.map((item, index) => (
                <Link 
                  key={index} 
                  to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} 
                  className="food-list-restaurant-categories-mobile__item"
                >
                  <div className="food-list-restaurant-categories-mobile__image-wrapper">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="food-list-restaurant-categories-mobile__image"
                      loading="lazy"
                    />
                  </div>
                  <p className="food-list-restaurant-categories-mobile__name">{item.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Restaurants Section */}
        <section className="food-list-restaurant-grid">
          <div className="food-list-restaurant-grid__header">
            <h2 className="food-list-restaurant-grid__title">Order from nearby kitchens</h2>
            {!isMobile && (
              <div className="food-list-restaurant-grid__controls">
                <button 
                  onClick={handleRestaurantsPrev} 
                  className={`food-list-restaurant-grid__arrow ${isRestaurantsBeginning ? 'disabled' : ''}`}
                  disabled={isRestaurantsBeginning}
                  aria-label="Previous restaurants"
                >
                  <ChevronLeft size={22} />
                </button>
                <button 
                  onClick={handleRestaurantsNext} 
                  className={`food-list-restaurant-grid__arrow ${isRestaurantsEnd ? 'disabled' : ''}`}
                  disabled={isRestaurantsEnd}
                  aria-label="Next restaurants"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </div>

          <div className="food-list-restaurant-grid__swiper">
            <Swiper
              ref={restaurantsSwiperRef}
              modules={[Navigation, FreeMode]}
              spaceBetween={20}
              slidesPerView={4}
              freeMode={true}
              onSlideChange={updateRestaurantsNavigationState}
              onSwiper={updateRestaurantsNavigationState}
              breakpoints={{
                320: { slidesPerView: 1.2, spaceBetween: 12 },
                480: { slidesPerView: 1.5, spaceBetween: 12 },
                640: { slidesPerView: 2, spaceBetween: 16 },
                768: { slidesPerView: 2.5, spaceBetween: 16 },
                1024: { slidesPerView: 3.5, spaceBetween: 20 },
                1200: { slidesPerView: 4, spaceBetween: 20 }
              }}
            >
              {restaurants.map((restaurant) => (
                <SwiperSlide key={restaurant.restaurant_id}>
                  {renderCard(restaurant)}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Home Cooked Detail */}
        <section className="food-list-restaurant-home-cooked">
          <h2 className="food-list-restaurant-home-cooked__title">Home-cooked food in Mumbai</h2>
          <div className="food-list-restaurant-home-cooked__grid">
            {restaurants.slice(0, 8).map((restaurant) => (
              <div key={restaurant.restaurant_id} className="food-list-restaurant-home-cooked__item">
                {renderCard(restaurant)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FoodGrid;