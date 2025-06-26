import React, { useState, useEffect } from "react";
import { ArrowRightCircle } from "lucide-react";
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

  const renderCard = (restaurant) => (
    <div className="split_card__container" key={restaurant.restaurant_id}>
      {/* Image Card */}
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

      {/* Content Card */}
      <div className="split_card__content_card">
        <Link 
          to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
          className="split_card__content_link"
        >
          <h3 className="split_card__title">{restaurant.restaurant_name}</h3>

          <span className="split_card__delivery_time">

          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" strokeColor="rgba(2, 6, 12, 0.92)" fillColor="rgba(2, 6, 12, 0.92)"><circle cx="10" cy="10" r="9" fill="url(#StoreRating20_svg__paint0_linear_32982_71567)"></circle><path d="M10.0816 12.865C10.0312 12.8353 9.96876 12.8353 9.91839 12.865L7.31647 14.3968C6.93482 14.6214 6.47106 14.2757 6.57745 13.8458L7.27568 11.0245C7.29055 10.9644 7.26965 10.9012 7.22195 10.8618L4.95521 8.99028C4.60833 8.70388 4.78653 8.14085 5.23502 8.10619L8.23448 7.87442C8.29403 7.86982 8.34612 7.83261 8.36979 7.77777L9.54092 5.06385C9.71462 4.66132 10.2854 4.66132 10.4591 5.06385L11.6302 7.77777C11.6539 7.83261 11.706 7.86982 11.7655 7.87442L14.765 8.10619C15.2135 8.14085 15.3917 8.70388 15.0448 8.99028L12.7781 10.8618C12.7303 10.9012 12.7095 10.9644 12.7243 11.0245L13.4225 13.8458C13.5289 14.2757 13.0652 14.6214 12.6835 14.3968L10.0816 12.865Z" fill="white"></path><defs><linearGradient id="StoreRating20_svg__paint0_linear_32982_71567" x1="10" y1="1" x2="10" y2="19" gradientUnits="userSpaceOnUse"><stop stop-color="#21973B"></stop><stop offset="1" stop-color="#128540"></stop></linearGradient></defs></svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {restaurant.restaurant_location}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="split_view__container">
      <div className="split_view__inner">
        <header className="split_view__header">
          <h2 className="split_view__heading">Order from nearby kitchens</h2>
          {!isMobile && (
            <div className="split_view__header_nav">
              <button className="split_view__nav split_view__nav_prev">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="split_view__nav split_view__nav_next">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </header>
        
        <div className="split_view__swiper_wrapper">
          <Swiper
            slidesPerView={isMobile ? 1.5 : 'auto'}
            spaceBetween={isMobile ? 16 : 24}
            freeMode={true}
            pagination={isMobile ? {
              clickable: true,
              el: '.split_view__pagination',
              type: 'bullets',
            } : false}
            navigation={!isMobile ? {
              nextEl: '.split_view__nav_next',
              prevEl: '.split_view__nav_prev',
            } : false}
            modules={isMobile ? [FreeMode, Pagination] : [Navigation, FreeMode]}
            className="split_view__swiper"
            breakpoints={{
              375: {
                slidesPerView: 1.8,
              },
              480: {
                slidesPerView: 2.2,
              },
              640: {
                slidesPerView: 2.5,
              },
              768: {
                slidesPerView: 3,
                spaceBetween: 20
              },
              1024: {
                slidesPerView: 4,
                spaceBetween: 24
              }
            }}
          >
            {restaurants.map((restaurant) => (
              <SwiperSlide key={restaurant.restaurant_id} style={!isMobile ? { width: '300px' } : {}}>
                {renderCard(restaurant)}
              </SwiperSlide>
            ))}
          </Swiper>
          
          {isMobile && <div className="split_view__pagination"></div>}
        </div>
      </div>
    </div>
  );
};

export default FoodGrid;