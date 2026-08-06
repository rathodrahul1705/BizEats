import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/css/Home.css";
import { 
  ArrowRightCircle, ChevronLeft, ChevronRight, Star, Clock, 
  MapPin, Heart, Zap, Download, Smartphone, Play, Sparkles, 
  ShoppingBag, Phone, Mail, Instagram, Facebook, Twitter, 
  Youtube, Truck, Coffee, UtensilsCrossed, Award, ShieldCheck,
  ThumbsUp, Users, ChefHat, Clock as ClockIcon, 
  Search, Menu, X, Plus, Minus, CheckCircle, 
  TrendingUp, Flame, Crown, Gift, Rocket 
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { Navigation, Pagination, Autoplay, EffectFade, FreeMode } from "swiper/modules";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";
import QRCodeImage from "../assets/img/qr-code-download.png";
import MobileScreen from "../assets/img/mobile_screen_v1.png";
import AppStoreBadge from "../assets/img/app-store-badge.jpg";
import PlayStoreBadge from "../assets/img/play-store-badge.png";
import HomePageUpma from "../assets/img/home_page_upma.avif";
import HomePagePoha from "../assets/img/home_page_poha.png";
import HomePageMaggie from "../assets/img/home_page_maggie.webp";
import HomePageEggRoll from "../assets/img/home_page_egg_roll.avif";
import HomePageChickenBiryani from "../assets/img/home_page_chicken_biryani.avif";
import HomePageEggBiryani from "../assets/img/home_page_egg_biryani.jpg";
import HomePageGulabJamun from "../assets/img/home_page_gulab_jamun.jpg";
import HomePageKokamSarbat from "../assets/img/homa_page_kokam_sarbat.jpg";
import HomePageChickeThali from "../assets/img/banjara_chicken_thali.png";
import HomePageMasalaChaas from "../assets/img/masala_chaas.png";

const Home = () => {
  const navigate = useNavigate();
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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);

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
        setRestaurants(response.data.KitchenList);
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

  const handleOrderNow = () => {
    navigate('/home-kitchens');
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
      price: "₹100",
      rating: 4.8,
      time: "30-45 min",
      description: "Authentic Hyderabadi chicken biryani with aromatic spices",
      reviews: 234
    },
    {
      name: "Gulab Jamun",
      image: HomePageGulabJamun,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Desserts",
      price: "₹10",
      rating: 4.5,
      time: "15-20 min",
      description: "Soft, spongy milk dumplings in sugar syrup",
      reviews: 189
    },
    {
      name: "Upma",
      image: HomePageUpma,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Snacks",
      price: "₹50",
      rating: 4.2,
      time: "20-30 min",
      description: "Traditional South Indian breakfast with vegetables",
      reviews: 156
    },
    {
      name: "Poha",
      image: HomePagePoha,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Snacks",
      price: "₹45",
      rating: 4.3,
      time: "15-25 min",
      description: "Flattened rice with peanuts, curry leaves and spices",
      reviews: 201
    },
    {
      name: "Maggie",
      image: HomePageMaggie,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Fast Food",
      price: "₹60",
      rating: 4.1,
      time: "10-15 min",
      description: "Classic instant noodles with vegetables and cheese",
      reviews: 312
    },
    {
      name: "Egg Roll",
      image: HomePageEggRoll,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Rolls",
      price: "₹80",
      rating: 4.4,
      time: "20-30 min",
      description: "Crispy egg roll with fresh veggies and sauce",
      reviews: 178,
      offer: "Combo Deal"
    },
    {
      name: "Egg Biryani",
      image: HomePageEggBiryani,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Biryani",
      price: "₹100",
      rating: 4.6,
      time: "30-45 min",
      description: "Flavorful egg biryani with basmati rice and spices",
      reviews: 267
    },
    {
      name: "Kokam Sarbat",
      image: HomePageKokamSarbat,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Beverages",
      price: "₹40",
      rating: 4.6,
      time: "10-15 min",
      description: "Refreshing kokam drink with mint and spices",
      reviews: 143
    },
    {
      name: "Masala Chaas",
      image: HomePageMasalaChaas,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Beverages",
      price: "₹15",
      rating: 4.6,
      time: "10-15 min",
      description: "Spiced buttermilk with roasted cumin and black salt",
      reviews: 198
    },
    {
      name: "Chicken Thali",
      image: HomePageChickeThali,
      restaurant_id: restaurants[0]?.restaurant_id,
      category: "Thalis",
      price: "₹100",
      rating: 4.6,
      time: "30-45 min",
      description: "Complete meal with chicken curry, rice, roti and salad",
      reviews: 223
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
      cta: "Download App",
      link: "/",
      bgColor: "linear-gradient(135deg, #FF9A8B 0%, #FF6B95 50%, #FF8E53 100%)",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070",
      badge: "Limited Time"
    },
    {
      id: 2,
      title: "Weekend Special",
      subtitle: "Enjoy combo offer on order this weekend",
      cta: "Download App",
      link: "/",
      bgColor: "linear-gradient(135deg, #43CBFF 0%, #9708CC 100%)",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069",
      badge: "Weekend Only"
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
          <div className="restaurant-card__image-container">
            <img 
              src={restaurant.restaurant_image} 
              alt={restaurant.restaurant_name} 
              className="restaurant-card__image"
              loading="lazy"
            />
            <div className="restaurant-card__image-overlay"></div>
          </div>
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
      {/* Order Now Floating Button - Only on Mobile */}
      <div className="order-now-fixed-container">
        <button onClick={handleOrderNow} className="order-now-floating-btn">
          <ShoppingBag size={20} />
          <span className="order-now-text">Order Now</span>
        </button>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <Sparkles size={16} />
                <span>🔥 Trending Now</span>
              </div>
              <h1 className="hero-title">
                <span className="hero-highlight">Delicious</span> food delivered 
                <span className="hero-highlight"> fast & fresh</span>
              </h1>
              <p className="hero-subtitle">
                Order from the best restaurants in your city. Quick delivery, great prices, 
                and amazing food right at your doorstep.
              </p>
              
              <div className="hero-actions">
                <button onClick={handleOrderNow} className="hero-primary-btn">
                  Order Now <ArrowRightCircle size={20} />
                </button>
                <button onClick={() => setShowVideoModal(true)} className="hero-secondary-btn">
                  <Play size={20} /> Watch Demo
                </button>
              </div>

              <div className="hero-download-buttons">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.eatoor" 
                  className="download-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={PlayStoreBadge} alt="Get on Google Play" />
                </a>
                <a 
                  href="https://apps.apple.com/in/app/eatoor/id6756539381" 
                  className="download-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={AppStoreBadge} alt="Download on App Store" />
                </a>
              </div>
              
              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>5000+</strong>
                  <span>Happy Customers</span>
                </div>
                <div className="hero-stat">
                  <strong>50+</strong>
                  <span>Restaurants</span>
                </div>
                <div className="hero-stat">
                  <strong>{resviewdetails?.rating_ratio || '4.5'}</strong>
                  <span>Average Rating</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-qr-card">
                <div className="hero-qr-card__header">
                  <div className="hero-qr-card__icon">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <h4>Download App</h4>
                    <p>Scan to get started</p>
                  </div>
                </div>
                <img src={QRCodeImage} alt="QR Code" className="hero-qr-card__qr" />
                <div className="hero-qr-card__badges">
                  <img src={PlayStoreBadge} alt="Google Play" />
                  <img src={AppStoreBadge} alt="App Store" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
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

      {/* Featured Foods */}
      <section className="featured-foods">
        <div className="section-container">
          <div className="section-header">
            <div className="section-header__content">
              <h2 className="section-heading">Popular Dishes</h2>
              <p className="section-subtitle">Most loved items from our kitchens</p>
            </div>
            <div className="slider-controls">
              <button 
                className={`slider-arrow ${isFoodBeginning ? 'disabled' : ''}`}
                onClick={handleFoodPrev}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                className={`slider-arrow ${isFoodEnd ? 'disabled' : ''}`}
                onClick={handleFoodNext}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <Swiper
            ref={foodSwiperRef}
            modules={[Navigation, FreeMode]}
            spaceBetween={20}
            slidesPerView={1}
            freeMode={true}
            onSlideChange={updateFoodNavigationState}
            onSwiper={(swiper) => updateFoodNavigationState(swiper)}
            breakpoints={{
              480: { slidesPerView: 2, spaceBetween: 16 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 24 },
            }}
            className="food-swiper"
          >
            {filteredFoodItems.map((item, index) => (
              <SwiperSlide key={index}>
                <div className="food-card">
                  <div className="food-card__image-wrapper">
                    <img src={item.image} alt={item.name} className="food-card__image" />
                    {item.offer && (
                      <div className="food-card__offer-badge">
                        <Zap size={14} /> {item.offer}
                      </div>
                    )}
                    <button 
                      className="food-card__quick-view"
                      onClick={() => { setSelectedFood(item); setShowFoodModal(true); }}
                    >
                      Quick View
                    </button>
                  </div>
                  <div className="food-card__content">
                    <div className="food-card__header">
                      <h3 className="food-card__name">{item.name}</h3>
                      <span className="food-card__price">{item.price}</span>
                    </div>
                    <div className="food-card__meta">
                      <div className="food-card__rating">
                        <Star size={16} fill="#FFD700" stroke="#FFD700" />
                        <span>{item.rating}</span>
                        <span className="food-card__reviews">({item.reviews})</span>
                      </div>
                      <div className="food-card__time">
                        <Clock size={14} /> {item.time}
                      </div>
                    </div>
                    <button onClick={handleOrderNow} className="food-card__order-btn">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Food Quick View Modal */}
      {showFoodModal && selectedFood && (
        <div className="food-modal" onClick={() => setShowFoodModal(false)}>
          <div className="food-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="food-modal__close" onClick={() => setShowFoodModal(false)}>×</button>
            <div className="food-modal__image">
              <img src={selectedFood.image} alt={selectedFood.name} />
            </div>
            <div className="food-modal__body">
              <h3 className="food-modal__name">{selectedFood.name}</h3>
              <div className="food-modal__rating">
                <Star size={18} fill="#FFD700" stroke="#FFD700" />
                <span>{selectedFood.rating}</span>
                <span className="food-modal__reviews">({selectedFood.reviews} reviews)</span>
              </div>
              <p className="food-modal__description">{selectedFood.description}</p>
              <div className="food-modal__details">
                <div className="food-modal__detail">
                  <Clock size={16} />
                  <span>{selectedFood.time}</span>
                </div>
                <div className="food-modal__detail">
                  <span className="food-modal__price">{selectedFood.price}</span>
                </div>
              </div>
              <button onClick={() => { handleOrderNow(); setShowFoodModal(false); }} className="food-modal__order-btn">
                Order Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Banner */}
      <section className="promo-section">
        <div className="section-container">
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            spaceBetween={0}
            slidesPerView={1}
            effect="fade"
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            loop={true}
            className="promo-swiper"
          >
            {banners.map((banner) => (
              <SwiperSlide key={banner.id}>
                <div className="promo-card" style={{ background: banner.bgColor }}>
                  <div className="promo-card__content">
                    {banner.badge && <span className="promo-card__badge">{banner.badge}</span>}
                    <h3 className="promo-card__title">{banner.title}</h3>
                    <p className="promo-card__subtitle">{banner.subtitle}</p>
                    <button onClick={handleOrderNow} className="promo-card__btn">
                      {banner.cta} <ArrowRightCircle size={18} />
                    </button>
                  </div>
                  <div className="promo-card__image">
                    <img src={banner.image} alt={banner.title} />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Restaurants */}
      <section className="restaurants-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-header__content">
              <h2 className="section-heading">Top Restaurants</h2>
              <p className="section-subtitle">Best dining spots in your city</p>
            </div>
            <div className="slider-controls">
              <button 
                className={`slider-arrow ${isRestaurantBeginning ? 'disabled' : ''}`}
                onClick={handleRestaurantsPrev}
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                className={`slider-arrow ${isRestaurantEnd ? 'disabled' : ''}`}
                onClick={handleRestaurantsNext}
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <Swiper
            ref={restaurantsSwiperRef}
            modules={[Navigation, FreeMode]}
            spaceBetween={20}
            slidesPerView={1}
            freeMode={true}
            onSlideChange={updateRestaurantsNavigationState}
            onSwiper={(swiper) => updateRestaurantsNavigationState(swiper)}
            breakpoints={{
              480: { slidesPerView: 2, spaceBetween: 16 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 24 },
            }}
            className="restaurants-swiper"
          >
            {restaurants.slice(0, 8).map((restaurant) => (
              <SwiperSlide key={restaurant.restaurant_id}>
                {renderRestaurantCard(restaurant)}
              </SwiperSlide>
            ))}
          </Swiper>
          
          <div className="view-all-container">
            <button onClick={handleOrderNow} className="view-all-btn">
              View All Restaurants
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-header__content">
              <h2 className="section-heading">How It Works</h2>
              <p className="section-subtitle">3 simple steps to get your food</p>
            </div>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-card__icon-wrapper">
                <div className="step-card__number">1</div>
                <div className="step-card__icon">
                  <Search size={32} />
                </div>
              </div>
              <h3 className="step-card__title">Find Food</h3>
              <p className="step-card__description">Explore restaurants and browse delicious dishes</p>
            </div>
            
            <div className="step-card">
              <div className="step-card__icon-wrapper">
                <div className="step-card__number">2</div>
                <div className="step-card__icon">
                  <ShoppingBag size={32} />
                </div>
              </div>
              <h3 className="step-card__title">Order & Pay</h3>
              <p className="step-card__description">Select your items and checkout securely</p>
            </div>
            
            <div className="step-card">
              <div className="step-card__icon-wrapper">
                <div className="step-card__number">3</div>
                <div className="step-card__icon">
                  <Truck size={32} />
                </div>
              </div>
              <h3 className="step-card__title">Enjoy Meal</h3>
              <p className="step-card__description">Get your food delivered hot and fresh</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header text-center">
            <div className="section-header__content">
              <h2 className="section-heading">What Our Customers Say</h2>
              <p className="section-subtitle">Real reviews from real food lovers</p>
            </div>
          </div>
          
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={24}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            breakpoints={{
              768: { slidesPerView: 2, spaceBetween: 24 },
              1024: { slidesPerView: 3, spaceBetween: 24 }
            }}
            className="testimonials-swiper"
          >
            {restaurantsReview.slice(0, 6).map((testimonial, index) => (
              <SwiperSlide key={testimonial.id || index}>
                <div className="testimonial-card">
                  <div className="testimonial-card__rating">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16}
                        fill={i < testimonial.rating ? "#FFD700" : "#E5E7EB"}
                        stroke={i < testimonial.rating ? "#FFD700" : "#E5E7EB"}
                      />
                    ))}
                  </div>
                  <p className="testimonial-card__text">
                    "{testimonial.comment.split(' ').slice(0, 25).join(' ')}{testimonial.comment.split(' ').length > 25 ? '...' : ''}"
                  </p>
                  <div className="testimonial-card__author">
                    <div className="testimonial-card__avatar">
                      {testimonial.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="testimonial-card__name">{testimonial.name || 'Anonymous'}</p>
                      <p className="testimonial-card__location">{testimonial.location || 'Food Lover'}</p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* App Download CTA */}
      <section className="app-download-cta">
        <div className="section-container">
          <div className="app-download-cta__content">
            <div className="app-download-cta__text">
              <h2>Get the Eatoor App</h2>
              <p>Order faster, get exclusive deals, and track your delivery in real-time</p>
              <div className="app-download-cta__features">
                <div className="app-download-cta__feature">
                  <CheckCircle size={20} />
                  <span>Exclusive app-only discounts</span>
                </div>
                <div className="app-download-cta__feature">
                  <CheckCircle size={20} />
                  <span>Real-time order tracking</span>
                </div>
                <div className="app-download-cta__feature">
                  <CheckCircle size={20} />
                  <span>One-tap reordering</span>
                </div>
              </div>
              <div className="app-download-cta__buttons">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.eatoor" 
                  className="download-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={PlayStoreBadge} alt="Google Play" />
                </a>
                <a 
                  href="https://apps.apple.com/in/app/eatoor/id6756539381" 
                  className="download-button"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={AppStoreBadge} alt="App Store" />
                </a>
              </div>
            </div>
            <div className="app-download-cta__visual">
              <div className="phone-mockup">
                <div className="phone-mockup__screen">
                  <img src={MobileScreen} alt="App Preview" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="section-container">
          <div className="final-cta__content">
            <h2 className="final-cta__title">Ready to satisfy your cravings?</h2>
            <p className="final-cta__subtitle">Order now and get 20% off on your first order</p>
            <button onClick={handleOrderNow} className="final-cta__btn">
              Order Now <Rocket size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="video-modal" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal__close" onClick={() => setShowVideoModal(false)}>×</button>
            <div className="video-modal__video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/fq4iT7bWaHQ?autoplay=1"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;