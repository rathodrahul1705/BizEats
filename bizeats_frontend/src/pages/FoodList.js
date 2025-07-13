import React, { useState, useEffect, useRef } from "react";
import { ArrowRightCircle, ChevronLeft, ChevronRight, User } from "lucide-react";
import "../assets/css/FoodList.css";
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
import HomePageUpma from "../assets/img/home_page_upma.avif";
import HomePagePoha from "../assets/img/home_page_poha.png";
import HomePageMaggie from "../assets/img/home_page_maggie.webp";
import HomePageEggRoll from "../assets/img/home_page_egg_roll.avif";
import HomePageChickenBiryani from "../assets/img/home_page_chicken_biryani.avif";
import HomePageEggBiryani from "../assets/img/home_page_egg_biryani.jpg";
import HomePageGulabJamun from "../assets/img/home_page_gulab_jamun.jpg";
import HomePageKokamSarbat from "../assets/img/homa_page_kokam_sarbat.jpg";

const FoodGrid = ({user}) => {
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

    const firstName = user?.full_name?.split(' ')[0] || '';
    const capitalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toUpperCase();

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

  const foodItems = [
    {
      name: "Chicken Biryani",
      image: HomePageChickenBiryani,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Gulab Jamun",
      image: HomePageGulabJamun,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Upma",
      image: HomePageUpma,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Poha",
      image: HomePagePoha,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Maggie",
      image: HomePageMaggie,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Egg Roll",
      image: HomePageEggRoll,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Egg Biryani",
      image: HomePageEggBiryani,
      restaurant_id: restaurants[0]?.restaurant_id
    },
    {
      name: "Beverage",
      image: HomePageKokamSarbat,
      restaurant_id: restaurants[0]?.restaurant_id
    }
  ];

  const handleFoodPrev = () => {
    if (foodSwiperRef.current) {
      foodSwiperRef.current.swiper.slidePrev();
    }
  };

  const handleFoodNext = () => {
    if (foodSwiperRef.current) {
      foodSwiperRef.current.swiper.slideNext();
    }
  };

  const handleRestaurantsPrev = () => {
    if (restaurantsSwiperRef.current) {
      restaurantsSwiperRef.current.swiper.slidePrev();
    }
  };

  const handleRestaurantsNext = () => {
    if (restaurantsSwiperRef.current) {
      restaurantsSwiperRef.current.swiper.slideNext();
    }
  };

  const updateFoodNavigationState = (swiper) => {
    setIsFoodBeginning(swiper.isBeginning);
    setIsFoodEnd(swiper.isEnd);
  };

  const updateRestaurantsNavigationState = (swiper) => {
    setIsRestaurantsBeginning(swiper.isBeginning);
    setIsRestaurantsEnd(swiper.isEnd);
  };

  const renderCard = (restaurant) => (
    <div className="split_card__container" key={restaurant.restaurant_id}>
      <Link 
        to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
        className="split_card__image_card"
      >
        <div className="split_card__image_wrapper">
          <img 
            src={restaurant.restaurant_image} 
            alt={restaurant.restaurant_name} 
            className="split_card__image"
            loading="lazy"
          />
          <div className="split_card__badges">
            <span className="split_card__price_badge">
              ₹{restaurant.avg_price_range} for two
            </span>
            {restaurant.rating && (
              <span className="split_card__rating_badge">
                ⭐ {restaurant.rating}
              </span>
            )}
          </div>
          <button className="split_card__action_btn">
            <ArrowRightCircle size={20} />
          </button>
        </div>
      </Link>

      <div className="split_card__content_card">
        <Link 
          to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
          className="split_card__content_link"
        >
          <h3 className="split_card__title">{restaurant.restaurant_name}</h3>
          <span className="split_card__delivery_time">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" strokeColor="rgba(2, 6, 12, 0.92)" fillColor="rgba(2, 6, 12, 0.92)">
              <circle cx="10" cy="10" r="9" fill="url(#StoreRating20_svg__paint0_linear_32982_71567)"></circle>
              <path d="M10.0816 12.865C10.0312 12.8353 9.96876 12.8353 9.91839 12.865L7.31647 14.3968C6.93482 14.6214 6.47106 14.2757 6.57745 13.8458L7.27568 11.0245C7.29055 10.9644 7.26965 10.9012 7.22195 10.8618L4.95521 8.99028C4.60833 8.70388 4.78653 8.14085 5.23502 8.10619L8.23448 7.87442C8.29403 7.86982 8.34612 7.83261 8.36979 7.77777L9.54092 5.06385C9.71462 4.66132 10.2854 4.66132 10.4591 5.06385L11.6302 7.77777C11.6539 7.83261 11.706 7.86982 11.7655 7.87442L14.765 8.10619C15.2135 8.14085 15.3917 8.70388 15.0448 8.99028L12.7781 10.8618C12.7303 10.9012 12.7095 10.9644 12.7243 11.0245L13.4225 13.8458C13.5289 14.2757 13.0652 14.6214 12.6835 14.3968L10.0816 12.865Z" fill="white"></path>
              <defs>
                <linearGradient id="StoreRating20_svg__paint0_linear_32982_71567" x1="10" y1="1" x2="10" y2="19" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#21973B"></stop>
                  <stop offset="1" stop-color="#128540"></stop>
                </linearGradient>
              </defs>
            </svg>
            4.5
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {restaurant.delivery_time || '45 mins'}
          </span>
          <p className="split_card__cuisine">{restaurant.item_cuisines}</p>
          <div className="split_card__footer">
            <span className="split_card__location">
              {restaurant.restaurant_location}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );

  if (loading && restaurants.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="food-grid-container">
      {/* Food Categories Section - Desktop */}
      {!isMobile && (
        <section className="food-categories-section">
          <div className="food-categories-container">
            <div className="food-categories-header">
              <h2 className="food-categories-heading">
                {user?.full_name
                  ? `${user.full_name.split(' ')[0].toUpperCase()}, What's on your mind`
                  : `What's on your mind`}
              </h2>
              <div className="food-categories-controls">
                <button 
                  onClick={handleFoodPrev} 
                  className={`food-categories-arrow ${isFoodBeginning ? 'disabled' : ''}`}
                  disabled={isFoodBeginning}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleFoodNext} 
                  className={`food-categories-arrow ${isFoodEnd ? 'disabled' : ''}`}
                  disabled={isFoodEnd}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            <div className="food-categories-wrapper">
              <Swiper
                ref={foodSwiperRef}
                modules={[Navigation]}
                spaceBetween={20}
                slidesPerView={6}
                onSlideChange={updateFoodNavigationState}
                onSwiper={updateFoodNavigationState}
                breakpoints={{
                  1024: { slidesPerView: 5 },
                  768: { slidesPerView: 4 },
                  640: { slidesPerView: 3 },
                  480: { slidesPerView: 2.5 },
                  320: { slidesPerView: 1.5 }
                }}
              >
                {foodItems.map((item, index) => (
                  <SwiperSlide key={index}>
                    <Link to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} className="food-categories-item">
                      <div className="food-categories-image-wrapper">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="food-categories-image"
                          loading="lazy"
                        />
                      </div>
                      <p className="food-categories-name">{item.name}</p>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </section>
      )}

      {/* Food Categories Section - Mobile */}
      {isMobile && (
        <section className="food-categories-mobile-section">
          <div className="food-categories-mobile-container">
            <div className="food-categories-mobile-header">
              <h2 className="food-categories-mobile-heading">
                {user?.full_name
                  ? `${user.full_name.split(' ')[0].toUpperCase()}, What's on your mind`
                  : `What's on your mind`}
              </h2>
            </div>
            <div className="food-categories-mobile-grid">
              {foodItems.slice(0, 4).map((item, index) => (
                <Link 
                  key={index} 
                  to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} 
                  className="food-categories-mobile-item"
                >
                  <div className="food-categories-mobile-image-wrapper">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="food-categories-mobile-image"
                      loading="lazy"
                    />
                  </div>
                  <p className="food-categories-mobile-name">{item.name}</p>
                </Link>
              ))}
            </div>
            <div className="food-categories-mobile-grid">
              {foodItems.slice(4, 8).map((item, index) => (
                <Link 
                  key={index} 
                  to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} 
                  className="food-categories-mobile-item"
                >
                  <div className="food-categories-mobile-image-wrapper">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="food-categories-mobile-image"
                      loading="lazy"
                    />
                  </div>
                  <p className="food-categories-mobile-name">{item.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Restaurants Grid Section */}
      <section className="restaurants-section">
        <div className="restaurants-container">
          <div className="restaurants-header">
            <h2 className="restaurants-heading">Order from nearby kitchens</h2>
            {!isMobile && (
              <div className="restaurants-controls">
                <button 
                  onClick={handleRestaurantsPrev} 
                  className={`restaurants-arrow ${isRestaurantsBeginning ? 'disabled' : ''}`}
                  disabled={isRestaurantsBeginning}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleRestaurantsNext} 
                  className={`restaurants-arrow ${isRestaurantsEnd ? 'disabled' : ''}`}
                  disabled={isRestaurantsEnd}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>

          <div className="restaurants-wrapper">
            <Swiper
              ref={restaurantsSwiperRef}
              modules={[Navigation, FreeMode]}
              spaceBetween={24}
              slidesPerView={4}
              freeMode={true}
              onSlideChange={updateRestaurantsNavigationState}
              onSwiper={updateRestaurantsNavigationState}
              breakpoints={{
                320: { slidesPerView: 1.2, spaceBetween: 16 },
                375: { slidesPerView: 1.5, spaceBetween: 16 },
                480: { slidesPerView: 1.8, spaceBetween: 16 },
                640: { slidesPerView: 2.2, spaceBetween: 16 },
                768: { slidesPerView: 2.5, spaceBetween: 20 },
                1024: { slidesPerView: 3.5, spaceBetween: 24 },
                1200: { slidesPerView: 4, spaceBetween: 24 }
              }}
            >
              {restaurants.map((restaurant) => (
                <SwiperSlide key={restaurant.restaurant_id}>
                  {renderCard(restaurant)}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      <section className="home_cooked_detail">
        <div className="home_cooked_detail__container">
          <div className="home_cooked_detail__header">
            <h2 className="home_cooked_detail__heading">Home-cooked food in Mumbai</h2>
          </div>
          
          <div className="home_cooked_detail__grid">
            {restaurants.map((restaurant) => (
              <div key={restaurant.restaurant_id} className="home_cooked_detail__card">
                {renderCard(restaurant)}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FoodGrid;