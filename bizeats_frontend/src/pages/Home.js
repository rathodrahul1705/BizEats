import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import { ArrowRightCircle } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
// Category Data
const categories = [
  {
    id: 1,
    name: "Breakfast",
    image: require("../assets/img/breakfast_image.webp")
  },
  {
    id: 2,
    name: "Lunch",
    image: require("../assets/img/lunch_image.jpg")
  },
  {
    id: 3,
    name: "Dinner",
    image: require("../assets/img/dinner_image.webp")
  }
];

const foodData = [
  {
    id: 1,
    title: "Classic Breakfast",
    image: require("../assets/img/breakfast_image.webp"),
    deliveryTime: "30 min",
    location: "Downtown Cafe",
    brand: "Cafe Delight", // Added brand name
    price: "99",
  },
  {
    id: 2,
    title: "Healthy Lunch ddddd",
    image: require("../assets/img/lunch_image.jpg"),
    deliveryTime: "25 min",
    location: "Urban Bites",
    brand: "Healthy Eats", // Added brand name
    price: "129",
  },
  {
    id: 3,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "99",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  },
  {
    id: 4,
    title: "Delicious Dinner",
    image: require("../assets/img/dinner_image.webp"),
    deliveryTime: "40 min",
    location: "Gourmet Hub",
    brand: "Gourmet Kitchen", // Added brand name
    price: "149",
  }
];

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Delicious Food, Delivered To You</h1>
          <p>
            Experience top-quality meals from your favorite local restaurants,
            delivered right to your door.
          </p>
          <Link to="/food-list">
            <button className="order-now-btn">Order Now</button>
          </Link>
        </div>
        {/* Featured Categories Section (Section 2) */}
        <div className="restaurants-section">
          <h2 className="section-heading">Browse by Categories</h2>
          <div className="restaurant-list">
            {categories.map((category) => (
              <Link key={category.id} to="/food-list" className="restaurant-link">
                <div className="restaurant-card">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="category-image"
                    width="200"
                    height="150"
                  />
                  <p className="category-name">{category.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </section>

      

      {/* How It Works Section (Section 3) */}
      <section className="how-it-works">
        <h2 className="section-heading">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <span className="stepNumber">1</span>
            <h3> Choose Your Meal</h3>
            <p>Select from a wide variety of cuisines and dishes that suit your taste.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">2</span>
            <h3> Place Your Order</h3>
            <p>Order online easily and enjoy lightning-fast delivery.</p>
          </div>
          <div className="step-card">
            <span className="stepNumber">3</span>
            <h3> Enjoy Your Food</h3>
            <p>Sit back, relax, and savor your meal delivered fresh to your door.</p>
          </div>
        </div>
      </section>


      <section className="foodDataSlider">
        <h2 className="section-heading">Discover best restaurants on Dineout</h2>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}  // Adjust space between slides
          slidesPerView={3.5} 
          navigation
          // pagination={{ clickable: true }}
          // autoplay={{ delay: 3000 }}
          loop={false}
          breakpoints={{
            320: { slidesPerView: 1.5 }, // Mobile (small screens)
            640: { slidesPerView: 2.5 }, // Tablets
            1024: { slidesPerView: 3.5 }, // Desktops
          }}
        >
          {foodData.map((food) => (
          <SwiperSlide>
                  <div className="foodDataBox">
                    <div className="foodDataBoxInner">
                      <img src={food.image} alt={food.title} className="food-image" />
                      <p className="food-price">ITEM AT ₹{food.price}</p> {/* Display price */}
                    </div>
                    <button className="proceed-button">
                      <ArrowRightCircle size={20} />
                    </button>
                    <div className="food-details">
                      <p className="food-name">{food.title}</p>
                      <p className="food-location">📍 {food.location}</p>
                      <p className="food-delivery">⏳ {food.deliveryTime}</p>
                      <p className="food-brand">{food.brand}</p>
                    </div>
                    
                  </div>
          </SwiperSlide>
        ))}
        </Swiper>    
        </section>
    </div>
  );
};

export default Home;
