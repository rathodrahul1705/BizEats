import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import { ArrowRightCircle, ChevronLeft, ChevronRight, Star, Clock, MapPin, Heart, Zap } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { Navigation, Pagination, Autoplay, EffectFade, FreeMode } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import HomePageThali from "../assets/img/homepage.webp";
import HomePageUpma from "../assets/img/home_page_upma.avif";
import HomePagePoha from "../assets/img/home_page_poha.png";
import HomePageMaggie from "../assets/img/home_page_maggie.webp";
import HomePageEggRoll from "../assets/img/home_page_egg_roll.avif";
import HomePageChickenBiryani from "../assets/img/home_page_chicken_biryani.avif";
import HomePageEggBiryani from "../assets/img/home_page_egg_biryani.jpg";
import HomePageGulabJamun from "../assets/img/home_page_gulab_jamun.jpg";
import HomePageKokamSarbat from "../assets/img/homa_page_kokam_sarbat.jpg";

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const foodSwiperRef = useRef(null);
  const restaurantsSwiperRef = useRef(null);
  const [isFoodBeginning, setIsFoodBeginning] = useState(true);
  const [isFoodEnd, setIsFoodEnd] = useState(false);
  const [isRestaurantBeginning, setIsRestaurantBeginning] = useState(true);
  const [isRestaurantEnd, setIsRestaurantEnd] = useState(false);
  const [restaurantsReview, setRestaurantsReview] = useState([]);
  const [resviewdetails, serReviewDetails] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeCategory, setActiveCategory] = useState("All");

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

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      try {
        const response = await fetchData(API_ENDPOINTS.HOME.CUSTOMER_REVIEW, "GET", null);
        setRestaurantsReview(response['reviews']);
        serReviewDetails(response);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, []);

  const handleFoodPrev = () => {
    if (foodSwiperRef.current && foodSwiperRef.current.swiper && !isFoodBeginning) {
      foodSwiperRef.current.swiper.slidePrev();
    }
  };

  const handleFoodNext = () => {
    if (foodSwiperRef.current && foodSwiperRef.current.swiper && !isFoodEnd) {
      foodSwiperRef.current.swiper.slideNext();
    }
  };

  const handleRestaurantsPrev = () => {
    if (restaurantsSwiperRef.current && restaurantsSwiperRef.current.swiper && !isRestaurantBeginning) {
      restaurantsSwiperRef.current.swiper.slidePrev();
    }
  };

  const handleRestaurantsNext = () => {
    if (restaurantsSwiperRef.current && restaurantsSwiperRef.current.swiper && !isRestaurantEnd) {
      restaurantsSwiperRef.current.swiper.slideNext();
    }
  };

  const updateFoodNavigationState = (swiper) => {
    setIsFoodBeginning(swiper.isBeginning);
    setIsFoodEnd(swiper.isEnd);
  };

  const updateRestaurantsNavigationState = (swiper) => {
    setIsRestaurantBeginning(swiper.isBeginning);
    setIsRestaurantEnd(swiper.isEnd);
  };

  const foodCategories = [
    { name: "All", icon: "🍽️" },
    { name: "Biryani", icon: "🍚" },
    { name: "Snacks", icon: "🥨" },
    { name: "Desserts", icon: "🍨" },
    { name: "Beverages", icon: "🧃" },
    { name: "Thalis", icon: "🍛" },
    { name: "Rolls", icon: "🌯" },
    { name: "Fast Food", icon: "🍔" },
  ];

  const foodItems = [
    {
      name: "Chicken Biryani",
      image: HomePageChickenBiryani,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Biryani",
      price: "₹220",
      rating: 4.8,
      time: "30-45 min",
      offer: "20% OFF"
    },
    {
      name: "Gulab Jamun",
      image: HomePageGulabJamun,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Desserts",
      price: "₹60",
      rating: 4.5,
      time: "15-20 min",
      offer: "Buy 1 Get 1"
    },
    {
      name: "Upma",
      image: HomePageUpma,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Snacks",
      price: "₹50",
      rating: 4.2,
      time: "20-30 min"
    },
    {
      name: "Poha",
      image: HomePagePoha,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Snacks",
      price: "₹45",
      rating: 4.3,
      time: "15-25 min",
      offer: "10% OFF"
    },
    {
      name: "Maggie",
      image: HomePageMaggie,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Fast Food",
      price: "₹60",
      rating: 4.1,
      time: "10-15 min"
    },
    {
      name: "Egg Roll",
      image: HomePageEggRoll,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Rolls",
      price: "₹80",
      rating: 4.4,
      time: "20-30 min",
      offer: "Combo Deal"
    },
    {
      name: "Egg Biryani",
      image: HomePageEggBiryani,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Biryani",
      price: "₹180",
      rating: 4.6,
      time: "30-45 min"
    },
    {
      name: "Kokam Sarbat",
      image: HomePageKokamSarbat,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Beverages",
      price: "₹40",
      rating: 4.7,
      time: "10-15 min",
      offer: "Free with meal"
    }
  ];

  const filteredFoodItems = activeCategory === "All" 
    ? foodItems 
    : foodItems.filter(item => item.category === activeCategory);

  const banners = [
    {
      id: 1,
      title: "Buy 1 Get 1 Free",
      subtitle: "Enjoy a free item on your first order – limited time offer!",
      cta: "Order Now",
      link: "/city/thane/eatoor-delights-kalwa-thane/EAT33233428/buy-one-get-one-free",
      bgColor: "linear-gradient(135deg, #FF9A8B 0%, #FF6B95 50%, #FF8E53 100%)",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070",
      badge: "Limited Time"
    },
    {
      id: 2,
      title: "Weekend Special",
      subtitle: "Enjoy 10% off on every order this weekend",
      cta: "Order Now",
      link: "/food-list",
      bgColor: "linear-gradient(135deg, #43CBFF 0%, #9708CC 100%)",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069",
      badge: "Weekend Only"
    },
    {
      id: 3,
      title: "New User Offer",
      subtitle: "Get ₹100 off on your first order with code WELCOME100",
      cta: "Order Now",
      link: "/signup",
      bgColor: "linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)",
      image: "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1974",
      badge: "New Customers"
    }
  ];
  
  if (loading && restaurants.length === 0) {
    return <StripeLoader />;
  }

  const renderRestaurantCard = (restaurant) => (
    <div className="restaurant-card" key={restaurant.restaurant_id}>
      <div className="restaurant-card__header">
        <Link 
          to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`}
          className="restaurant-card__image-link"
        >
          <img 
            src={restaurant.restaurant_image} 
            alt={restaurant.restaurant_name} 
            className="restaurant-card__image"
            loading="lazy"
          />
          <div className="restaurant-card__badges">
            <span className="restaurant-card__price-badge">
              ₹{restaurant.avg_price_range} for two
            </span>
            {restaurant.rating && (
              <span className="restaurant-card__rating-badge">
                <Star size={14} /> {restaurant.rating}
              </span>
            )}
          </div>
        </Link>
        <button className="restaurant-card__wishlist">
          <Heart size={18} />
        </button>
      </div>

      <div className="restaurant-card__body">
        <Link 
          to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`} 
          className="restaurant-card__title-link"
        >
          <h3 className="restaurant-card__title">{restaurant.restaurant_name}</h3>
        </Link>
        
        <div className="restaurant-card__meta">
          <span className="restaurant-card__cuisine">
            {restaurant.item_cuisines}
          </span>
        </div>
        
        <div className="restaurant-card__footer">
          <div className="restaurant-card__delivery-info">
            <span className="restaurant-card__delivery-time">
              <Clock size={14} /> {restaurant.delivery_time || '45 min'}
            </span>
            <span className="restaurant-card__location">
              <MapPin size={14} /> {restaurant.restaurant_location.split(',')[0]}
            </span>
          </div>
          <Link 
            to={`/city/${restaurant?.restaurant_city}/${restaurant?.restaurant_slug}/${restaurant.restaurant_id}`}
            className="restaurant-card__action"
          >
            <ArrowRightCircle size={20} />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">🔥 Hot & Fresh Meals</div>
            <h1>
              <span className="hero-highlight">Homemade</span> food delivered to your 
              <span className="hero-highlight"> doorstep</span>
            </h1>
            <p className="hero-subtitle">
              Discover authentic home-cooked meals from talented chefs in your neighborhood. 
              Real ingredients, real flavors, real love in every bite.
            </p>
            <div className="hero-cta">
              <Link to="/food-list" className="hero-cta__primary">
                <span>Order Now</span>
                <ChevronRight size={18} />
              </Link>
              <Link to="/about-us" className="hero-cta__secondary">
                How it works
              </Link>
            </div>
            
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>200+</strong>
                <span>Happy Customers</span>
              </div>
              <div className="hero-stat">
                <strong>2+</strong>
                <span>Home Chefs</span>
              </div>
              <div className="hero-stat">
                <strong>{resviewdetails?.rating_ratio}</strong>
                <span>Average Rating</span>
              </div>
            </div>
          </div>
          
          <div className="hero-image">
            <img
              src={HomePageThali}
              alt="Delicious homemade thali"
              className="hero-image__main"
              loading="eager"
            />
            <div className="hero-image__floating">
              <div className="floating-badge">
                <div className="floating-badge__icon">
                  <Star size={16} fill="#fff" />
                </div>
                <div className="floating-badge__content">
                  <span className="floating-badge__rating">{resviewdetails?.rating_ratio}</span>
                  <span className="floating-badge__reviews">{resviewdetails?.total_reviews} Reviews</span>
                </div>
              </div>
              
              <div className="floating-card floating-card--delivery">
                <div className="floating-card__icon">
                  <Clock size={16} />
                </div>
                <div className="floating-card__content">
                  <span className="floating-card__title">Fast Delivery</span>
                  <span className="floating-card__subtitle">30-45 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Categories */}
      <section className="categories-section">
        <div className="section-container">
          <div className="categories-scroller">
            {foodCategories.map((category) => (
              <button
                key={category.name}
                className={`category-pill ${activeCategory === category.name ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.name)}
              >
                <span className="category-pill__emoji">{category.icon}</span>
                <span className="category-pill__name">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Food Items */}
      <section className="food-items-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-heading">Popular Near You</h2>
            {/* <div className="slider-controls">
              <button 
                onClick={handleFoodPrev} 
                className={`slider-arrow ${isFoodBeginning ? 'disabled' : ''}`}
                disabled={isFoodBeginning}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={handleFoodNext} 
                className={`slider-arrow ${isFoodEnd ? 'disabled' : ''}`}
                disabled={isFoodEnd}
              >
                <ChevronRight size={24} />
              </button>
            </div> */}
          </div>

          <div className="food-items-grid">
            {filteredFoodItems.slice(0, 8).map((item, index) => (
              <div className="food-item-card" key={index}>
                <div className="food-item-card__image-wrapper">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="food-item-card__image"
                    loading="lazy"
                  />
                  {item.offer && (
                    <div className="food-item-card__offer-badge">
                      <Zap size={12} fill="#fff" />
                      <span>{item.offer}</span>
                    </div>
                  )}
                  <button className="food-item-card__wishlist">
                    <Heart size={18} />
                  </button>
                </div>
                <div className="food-item-card__content">
                  <h3 className="food-item-card__name">{item.name}</h3>
                  <div className="food-item-card__meta">
                    <span className="food-item-card__price">{item.price}</span>
                    <span className="food-item-card__rating">
                      <Star size={14} fill="#FFD700" /> {item.rating}
                    </span>
                  </div>
                  <div className="food-item-card__footer">
                    <span className="food-item-card__time">
                      <Clock size={14} /> {item.time}
                    </span>
                    <Link 
                      to={`/city/thane/eatoor-delights-kalwa-thane/EAT33233428`} 
                      className="food-item-card__button"
                    >
                      Add to cart
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Banner Carousel */}
      <section className="promo-banner-section">
        <div className="section-container">
          <h2 className="section-heading">Special Offers</h2>
          <p className="section-subtitle">Don't miss out on these amazing deals</p>
          
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            spaceBetween={0}
            slidesPerView={1}
            effect="fade"
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            loop={true}
          >
            {banners.map((banner) => (
              <SwiperSlide key={banner.id}>
                <div className="promo-banner">
                  <div className="promo-banner__image">
                    <img src={banner.image} alt={banner.title} loading="lazy" />
                  </div>
                  <div className="promo-banner__content">
                    {banner.badge && (
                      <div className="promo-banner__badge">
                        {banner.badge}
                      </div>
                    )}
                    <h3 className="promo-banner__title">{banner.title}</h3>
                    <p className="promo-banner__subtitle">{banner.subtitle}</p>
                    <Link to={banner.link} className="promo-banner__button">
                      {banner.cta}
                    </Link>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-heading">How HomeEats Works</h2>
          <p className="section-subtitle">Get homemade food in 3 simple steps</p>
          
          <div className="steps-container">
            <div className="step-card">
              <div className="step-card__number">1</div>
              <div className="step-card__content">
                <h3 className="step-card__title">Browse Home Chefs</h3>
                <p className="step-card__description">
                  Discover talented home chefs in your neighborhood offering their specialties
                </p>
              </div>
              <div className="step-card__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.5 1.875a1.125 1.125 0 0 1 2.25 0v8.219c.517.162 1.02.382 1.5.659V3.375a1.125 1.125 0 0 1 2.25 0v10.937a4.505 4.505 0 0 0-3.25 2.373 8.963 8.963 0 0 1 4-.935A.75.75 0 0 0 18 15v-2.266a3.368 3.368 0 0 1 .988-2.37 1.125 1.125 0 0 1 1.591 1.59 1.118 1.118 0 0 0-.329.79v3.006h-.005a6 6 0 0 1-1.752 4.007l-1.736 1.736a6 6 0 0 1-4.242 1.757H10.5a7.5 7.5 0 0 1-7.5-7.5V6.375a1.125 1.125 0 0 1 2.25 0v5.519c.46-.452.965-.832 1.5-1.141V3.375a1.125 1.125 0 0 1 2.25 0v6.526c.495-.1.997-.151 1.5-.151V1.875Z" />
                </svg>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-card__number">2</div>
              <div className="step-card__content">
                <h3 className="step-card__title">Place Your Order</h3>
                <p className="step-card__description">
                  Select your favorite dishes and checkout with secure payment options
                </p>
              </div>
              <div className="step-card__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
                </svg>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-card__number">3</div>
              <div className="step-card__content">
                <h3 className="step-card__title">Enjoy Your Meal</h3>
                <p className="step-card__description">
                  Receive your fresh, homemade food delivered fast or ready for pickup
                </p>
              </div>
              <div className="step-card__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Slider Section */}
      <section className="restaurants-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-heading">Top Home Kitchens Near You</h2>
            {!isMobile && (
              <div className="slider-controls">
                <button 
                  onClick={handleRestaurantsPrev}
                  className={`slider-arrow ${isRestaurantBeginning ? 'disabled' : ''}`}
                  disabled={isRestaurantBeginning}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleRestaurantsNext}
                  className={`slider-arrow ${isRestaurantEnd ? 'disabled' : ''}`}
                  disabled={isRestaurantEnd}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </div>
          
          <div className="restaurants-slider">
            <Swiper
              ref={restaurantsSwiperRef}
              slidesPerView={isMobile ? 1.2 : 3.5}
              spaceBetween={isMobile ? 16 : 24}
              freeMode={true}
              pagination={isMobile ? { clickable: true } : false}
              modules={isMobile ? [FreeMode, Pagination] : [FreeMode, Navigation]}
              onSlideChange={updateRestaurantsNavigationState}
              onSwiper={updateRestaurantsNavigationState}
              breakpoints={{
                320: { slidesPerView: 1.2, spaceBetween: 10 },
                375: { slidesPerView: 1.5 },
                480: { slidesPerView: 2 },
                640: { slidesPerView: 2.5 },
                768: { slidesPerView: 3, spaceBetween: 20 },
                1024: { slidesPerView: 4, spaceBetween: 24 },
                1280: { slidesPerView: 5, spaceBetween: 24 }
              }}
            >
              {restaurants.map((restaurant) => (
                <SwiperSlide key={restaurant.restaurant_id}>
                  {renderRestaurantCard(restaurant)}
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-heading">Loved by Foodies</h2>
          <p className="section-subtitle">What our customers say about us</p>
          
          <div className="testimonials-slider">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              pagination={{ clickable: true }}
              autoplay={{ delay: 6000, disableOnInteraction: false }}
              breakpoints={{
                768: { slidesPerView: 2, spaceBetween: 30 },
                1024: { slidesPerView: 3, spaceBetween: 30 }
              }}
            >
              {restaurantsReview.map((testimonial) => (
                <SwiperSlide key={testimonial.id}>
                  <div className="testimonial-card">
                    <div className="testimonial-card__rating">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={18}
                          fill={i < testimonial.rating ? "#FFD700" : "#DDD"}
                        />
                      ))}
                    </div>
                    <blockquote className="testimonial-card__quote">
                      "{testimonial.comment.split(' ').slice(0, 20).join(' ')}{testimonial.comment.split(' ').length > 20 ? '...' : ''}"
                    </blockquote>
                    <div className="testimonial-card__author">
                      <div className="testimonial-card__author-avatar">
                        {testimonial.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="testimonial-card__author-info">
                        <p className="testimonial-card__author-name">{testimonial.name}</p>
                        <p className="testimonial-card__author-location">{testimonial.location || 'Regular Customer'}</p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2 className="cta-title">Hungry for homemade goodness?</h2>
            <p className="cta-subtitle">
              Join thousands of happy customers enjoying authentic home-cooked meals delivered to their doorstep.
            </p>
            <div className="cta-buttons">
              <Link to="/food-list" className="cta-button cta-button--primary">
                Order Now
              </Link>
              <Link to="/register-your-homechef" className="cta-button cta-button--secondary">
                Become a Home Chef
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;