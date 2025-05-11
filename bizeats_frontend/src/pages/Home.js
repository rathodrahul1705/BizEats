import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import { ArrowRightCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const swiperRef = useRef(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [restaurantsReview, setRestaurantsReview] = useState([]);

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
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, []);

  
  const handlePrev = () => {
    if (swiperRef.current && !isBeginning) {
      swiperRef.current.swiper.slidePrev();
    }
  };

  const handleNext = () => {
    if (swiperRef.current && !isEnd) {
      swiperRef.current.swiper.slideNext();
    }
  };

  const updateNavigationState = () => {
    if (swiperRef.current) {
      setIsBeginning(swiperRef.current.swiper.isBeginning);
      setIsEnd(swiperRef.current.swiper.isEnd);
    }
  };

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

  const banners = [
    {
      id: 1,
      title: "Weekend Special",
      subtitle: "Enjoy 10% off on every order",
      cta: "Order Now",
      link: "/food-list",
      bgColor: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)"
    },
    // {
    //   id: 2,
    //   title: "New User Offer",
    //   subtitle: "Get ₹100 off on your first order",
    //   cta: "Sign Up",
    //   link: "/signup",
    //   bgColor: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)"
    // },
    {
      id: 3,
      title: "Family Combo",
      subtitle: "Special discount on meals for 4 people",
      cta: "Explore",
      link: "/order-details/AJA10010550",
      bgColor: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
    }
  ];
  

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
            <div className="hero-cta">
              <Link to="/food-list">
                <button className="order-now-btn">Order Now</button>
              </Link>
              <Link to="/about-us" className="learn-more-link">
                Learn more about us <ChevronRight size={18} />
              </Link>
            </div>
          </div>
          <div className="hero-image-wrapper">
            <img
              src={HomePageThali}
              alt="Home Food Thali"
              className="hero-thali-image"
            />
            {/* <div className="floating-badge">
              <div className="badge-content">
                <span className="rating">4.9</span>
                <span className="reviews">500+ Reviews</span>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* Promotional Banner Carousel */}
      <section className="promo-banner-section">
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={20}
          slidesPerView={1}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop={true}
        >
          {banners.map((banner) => (
            <SwiperSlide key={banner.id}>
              <div 
                className="promo-banner" 
                style={{ background: banner.bgColor }}
              >
                <div className="banner-content">
                  <h3>{banner.title}</h3>
                  <p>{banner.subtitle}</p>
                  <Link to={banner.link}>
                    <button className="banner-cta">{banner.cta}</button>
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Food Circle Slider */}
      <section className="food-section-slider">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-heading">Popular Food Categories</h2>
            <div className="slider-controls">
              <button 
                onClick={handlePrev} 
                className={`slider-arrow ${isBeginning ? 'disabled' : ''}`}
                disabled={isBeginning}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={handleNext} 
                className={`slider-arrow ${isEnd ? 'disabled' : ''}`}
                disabled={isEnd}
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="food-section-slider__wrapper">
            <Swiper
              ref={swiperRef}
              modules={[Navigation]}
              spaceBetween={20}
              slidesPerView={4}
              onSlideChange={updateNavigationState}
              onSwiper={updateNavigationState}
              touchEventsTarget="container"
              allowTouchMove={true}
              simulateTouch={true}
              breakpoints={{
                320: {
                  slidesPerView: 1.5,
                  spaceBetween: 10,
                },
                480: {
                  slidesPerView: 2.5,
                  spaceBetween: 15,
                },
                640: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },
                768: {
                  slidesPerView: 4,
                  spaceBetween: 20,
                },
                1024: {
                  slidesPerView: 5,
                  spaceBetween: 20,
                },
                1280: {
                  slidesPerView: 6,
                  spaceBetween: 20,
                },
              }}
            >
              {foodItems.map((item, index) => (
                <SwiperSlide key={index}>
                  <Link to={`/order-details/${item?.restaurant_id}`} className="food-section-slider__item">
                    <div className="food-section-slider__image-wrapper">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="food-section-slider__image"
                        loading="lazy"
                      />
                    </div>
                    <p className="food-section-slider__name">{item.name}</p>
                  </Link>
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
              <div className="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" />
                  <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
                </svg>
              </div>
              <h3>Choose Your Meal</h3>
              <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
                </svg>
              </div>
              <h3>Place Your Order</h3>
              <p>Order online easily and enjoy lightning-fast delivery.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
                </svg>
              </div>
              <h3>Enjoy Your Food</h3>
              <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Slider Section */}
      <section className="food-slider-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-heading">Discover the Best Home Kitchens Around You</h2>
            <Link to="/food-list" className="view-all-link">
              View All <ChevronRight size={18} />
            </Link>
          </div>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={3.5}
            navigation
            loop={false}
            autoplay={{ delay: 5000, disableOnInteraction: true }}
            breakpoints={{
              320: { slidesPerView: 1.2 },
              640: { slidesPerView: 2.2 },
              768: { slidesPerView: 2.5 },
              1024: { slidesPerView: 3.5 },
              1280: { slidesPerView: 4 },
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
                        loading="lazy"
                      />
                      <div className="food-badge">
                        <span className="food-price">₹{restaurant.avg_price_range}</span>
                        <span className="food-rating">⭐ {restaurant.rating || '4.5'}</span>
                      </div>
                    </div>
                    <div className="food-details">
                      <div className="food-info">
                        <p className="food-brand">{restaurant.restaurant_name}</p>
                        <p className="food-cuisine">{restaurant.item_cuisines}</p>
                      </div>
                      <div className="food-meta">
                        <p className="food-location">📍 {restaurant.restaurant_location}</p>
                        <p className="food-delivery">⏳ 45 min</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-heading">What Our Customers Say</h2>
          <div className="testimonials-container">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={30}
              slidesPerView={1}
              pagination={{ clickable: true }}
              autoplay={{ delay: 6000, disableOnInteraction: false }}
              breakpoints={{
                768: {
                  slidesPerView: 2,
                  spaceBetween: 30
                },
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 30
                }
              }}
            >
              {restaurantsReview.map((testimonial) => (
                <SwiperSlide key={testimonial.id}>
                  <div className="testimonial-card">
                    <div className="testimonial-rating">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill={i < testimonial.rating ? "#FFD700" : "#DDD"}
                          width="18"
                          height="18"
                        >
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      ))}
                    </div>
                    <p className="testimonial-text">"{testimonial.comment}"</p>
                    <p className="testimonial-author">- {testimonial.name}</p>
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
            <h2>Ready to experience homemade goodness?</h2>
            <p>Join thousands of happy customers enjoying authentic home-cooked meals delivered to their doorstep.</p>
            <div className="cta-buttons">
              <Link to="/food-list">
                <button className="cta-primary">Order Now</button>
              </Link>
              {/* <Link to="/become-chef">
                <button className="cta-secondary">Become a Chef</button>
              </Link> */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;