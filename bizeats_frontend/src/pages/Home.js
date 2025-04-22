import React, { useState, useEffect, useRef } from "react";
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

  // console.log("restaurants===",restaurants[0]?.restaurant_id)

  // Food Items Data
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

      {/* Food Circle Slider */}
      <section className="food-section-slider">
        <div className="section-container">
            <h2 className="section-heading">Popular Food Categories</h2>

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
                  slidesPerView: 4,
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
                      <p className="food-location">📍 {restaurant.restaurant_location}</p>
                      <p className="food-delivery">⏳ 45</p>
                      <p className="food-delivery">{restaurant.item_cuisines}</p>
                      <p className="food-brand">{restaurant.restaurant_name}</p>
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