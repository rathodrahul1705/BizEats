import React, { useState, useEffect } from "react";
import { PlusCircle, MinusCircle, ShoppingCart, X, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../assets/css/OrderDetails.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";
import StripeLoader from "../loader/StripeLoader";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

const OrderDetails = ({ user, setUser }) => {
  const [loading, setLoading] = useState(true);
  const { restaurant_id } = useParams();
  const [cart, setCart] = useState({});
  const [filter, setFilter] = useState("all");
  const [storeDetails, setStoreDetails] = useState({
    name: "",
    deliveryTime: "",
    location: "",
    rating: 0,
    minOrder: 0,
  });
  const [foodData, setFoodData] = useState([]);
  const [showResetCartModal, setShowResetCartModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [categoryVisibility, setCategoryVisibility] = useState({});
  const [isShopOpen, setIsShopOpen] = useState(true);
  const navigate = useNavigate();
  const sessionId = getOrCreateSessionId();

  const [deals, setDeals] = useState([
    {
      id: 1,
      title: "Free Delivery",
      description: "On orders above ₹100",
      icon: "🏍️",
      color: "#fff"
    },
    // {
    //   id: 2,
    //   title: "Limbu Pani Free",
    //   description: "With every order",
    //   icon: "🍋",
    //   color: "#fff"
    // },
    {
      id: 2,
      title: "10% Off",
      description: "On every order",
      icon: "🤑",
      color: "#fff"
    }
  ]);

  // Check if shop is open (9 AM to 9 PM IST)
  const checkShopTimings = () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 330 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    const currentHour = istTime.getUTCHours();
    
    // Shop is open between 9 AM (9) and 9 PM (21)
    const open = currentHour >= 9 && currentHour < 23;
    setIsShopOpen(open);
  };

  // Initialize all categories as visible by default
  useEffect(() => {
    if (foodData.length > 0) {
      const initialVisibility = {};
      const categories = [...new Set(foodData.map(item => item.category))];
      categories.forEach(category => {
        initialVisibility[category] = true;
      });
      setCategoryVisibility(initialVisibility);
    }
  }, [foodData]);

  useEffect(() => {
    checkShopTimings();
    // Check every minute to update shop status
    const interval = setInterval(checkShopTimings, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showFoodModal) {
        setShowFoodModal(false);
      }
    };

    const handleClickOutside = (e) => {
      if (showFoodModal && e.target.classList.contains('order-food-modal-overlay')) {
        setShowFoodModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFoodModal]);

  const fetchCartDetails = async () => {
    try {
      setLoading(true);
      const response = await fetchData(
        API_ENDPOINTS.ORDER.GET_CART_DETAILS,
        "POST",
        {
          user_id: user?.user_id || null,
          session_id: sessionId,
        }
      );

      if (response.status === "success") {
        const updatedCart = {};
        response.cart_details.forEach((item) => {
          updatedCart[item.item_id] = item.quantity;
        });
        setCart(updatedCart);
      } else {
        console.error("Error fetching cart details:", response.message);
      }
    } catch (error) {
      console.error("Error fetching cart details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDataOrderList = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.ORDER.RES_MENU_LIST_BY_RES_ID(restaurant_id),
        "GET",
        null
      );

      setStoreDetails({
        name: response.restaurant_name,
        deliveryTime: `${response.time_required_to_reach_loc} min`,
        location: response.Address,
        rating: response.rating,
        minOrder: response.min_order || 0,
      });

      setFoodData(
        response.itemlist.map((item) => ({
          id: item.id,
          title: item.item_name,
          description: item.description,
          image: item.item_image,
          price: parseFloat(item.item_price),
          deliveryTime: `${response.time_required_to_reach_loc} min`,
          location: response.Address,
          type: item?.food_type,
          category: item.category,
          availability: item.availability,
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchDataOrderList();
    fetchCartDetails();
  }, [restaurant_id]);

  const addItem = async (id) => {
    if (!isShopOpen) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.ORDER.ADD_TO_CART,
        "POST",
        {
          user_id: user?.user_id || null,
          session_id: sessionId,
          restaurant_id: restaurant_id,
          item_id: id,
          quantity: 1,
          action: "add",
        }
      );

      if (response.status === "success") {
        localStorage.setItem("current_order_restaurant_id", restaurant_id);
        await fetchCartDetails();
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
    }
  };

  const addToCart = async (id) => {
    if (!isShopOpen) return;
    
    const currentRestaurantId = localStorage.getItem("current_order_restaurant_id");
    const foodItem = foodData.find(item => item.id === id);

    if (!foodItem?.availability) {
      return; // Don't proceed if item is out of stock
    }

    if (currentRestaurantId && currentRestaurantId !== restaurant_id) {
      setShowResetCartModal(true);
      setPendingItem(id);
      return;
    }
    await addItem(id);
  };

  const handleFreshStart = async () => {
    try {
      await fetchData(API_ENDPOINTS.ORDER.CLEAR_CART, "POST", {
        user_id: user?.user_id || null,
        session_id: sessionId,
      });
      setCart({});
      await addItem(pendingItem);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
    setShowResetCartModal(false);
    setPendingItem(null);
  };

  const removeFromCart = async (id) => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.ORDER.ADD_TO_CART,
        "POST",
        {
          user_id: user?.user_id || null,
          session_id: sessionId,
          restaurant_id: restaurant_id,
          item_id: id,
          action: "remove",
        }
      );

      if (response.status === "success") {
        await fetchCartDetails();
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
    }
  };

  const totalItems = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const totalAmount = foodData.reduce((sum, food) => {
    return sum + (food.price * (cart[food.id] || 0));
  }, 0);

  const updateCartCount = (count) => {
    localStorage.setItem("cart_count", count);
    window.dispatchEvent(new Event("storage"));
  };

  useEffect(() => {
    if (totalItems) {
      updateCartCount(totalItems);
    } else {
      updateCartCount(totalItems);
      localStorage.removeItem("cart_count", totalItems);
    }
  }, [cart]);

  const filteredFood = foodData.filter(
    (food) => (filter === "all" || food.type === filter) && food.availability
  );

  const openFoodModal = (food) => {
    if (!food.availability || !isShopOpen) return;
    setSelectedFood(food);
    setShowFoodModal(true);
  };

  // Group food items by category and apply filter
  const groupedByCategory = filteredFood.reduce((acc, food) => {
    if (!acc[food.category]) acc[food.category] = [];
    acc[food.category].push(food);
    return acc;
  }, {});

  const toggleCategoryVisibility = (category) => {
    setCategoryVisibility((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (loading && filteredFood.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="order-page-container">
      <div className="order-store-header">
        <h1 className="order-store-title">{storeDetails.name}</h1>
        {!isShopOpen && (
          <div className="order-shop-closed-banner">
            🚫 Shop Closed (Open 9AM-9PM)
          </div>
        )}
      </div>

      <div className="order-store-details-card">
        <p className="order-store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="order-store-info">📍 {storeDetails.location}</p>
        <p className="order-store-info">⭐ {storeDetails.rating} / 5</p>
        {storeDetails.minOrder > 0 && (
          <p className="order-store-info">💰 Min. Order: ₹{storeDetails.minOrder}</p>
        )}
      </div>

      {/* Add Deals Swiper Section */}
      <div className="order-deals-section">
        <div className="order-deals-header-wrapper">
          <h2 className="order-deals-title">Deals for You</h2>

          <div className="order-deals-swiper-wrapper">
            <Swiper
              slidesPerView={1}
              spaceBetween={16}
              modules={[Navigation]}
              className="order-deals-swiper"
              breakpoints={{
                640: {
                  slidesPerView: 2,
                },
                768: {
                  slidesPerView: 3,
                },
              }}
            >
              {deals.map((deal) => (
                <SwiperSlide key={deal.id}>
                  <div className="order-deal-card">
                    <div className="order-deal-inner">
                      <div className="order-deal-icon">{deal.icon}</div>
                      <div className="order-deal-content">
                        <h3 className="order-deal-title">{deal.title}</h3>
                        <p className="order-deal-description">{deal.description}</p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>

      <div className="order-filter-container">
        <button
          className={`order-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`order-filter-btn ${filter === "Veg" ? "active" : ""}`}
          onClick={() => setFilter("Veg")}
        >
          🥦 Veg
        </button>
        <button
          className={`order-filter-btn ${filter === "Non-Veg" ? "active" : ""}`}
          onClick={() => setFilter("Non-Veg")}
        >
          🍗 Non-Veg
        </button>
      </div>

      <div className="order-categories-container">
        {Object.keys(groupedByCategory).map((category) => (
          <div key={category} className="order-category-section">
            <div
              className="order-category-header"
              onClick={() => toggleCategoryVisibility(category)}
            >
              <h3>{category} ({groupedByCategory[category].length})</h3>
              {categoryVisibility[category] ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </div>
            {categoryVisibility[category] && (
              <ul className="order-food-list">
                {groupedByCategory[category].map((food) => (
                  <li key={food.id} className="order-food-item">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-food-image" 
                      onClick={() => openFoodModal(food)}
                    />
                    <div className="order-food-details">
                      <h3 
                        className="order-food-title"
                        onClick={() => openFoodModal(food)}
                      >
                        {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                      </h3>

                      <p 
                        className="order-food-description"
                        onClick={() => openFoodModal(food)}
                      >
                        {food.description.length > 100 
                          ? `${food.description.substring(0, 100)}...` 
                          : food.description}
                        {food.description.length > 100 && (
                          <span className="order-read-more">
                            <span>Read more</span>
                            <ArrowRight size={16} />
                          </span>
                        )}
                      </p>

                      <p className="order-food-price">{food.price}</p>
                      <div className="order-cart-actions">
                        {cart[food.id] > 0 ? (
                          <>
                            <button
                              className="order-cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(food.id);
                              }}
                            >
                              <MinusCircle size={20} />
                            </button>
                            <span className="order-cart-quantity">{cart[food.id] || 0}</span>
                            <button
                              className="order-cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(food.id);
                              }}
                              disabled={!isShopOpen}
                            >
                              <PlusCircle size={20} />
                            </button>
                          </>
                        ) : (
                          <button
                            className="order-add-to-cart-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(food.id);
                            }}
                            disabled={!isShopOpen}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Show out of stock items at the bottom */}
      {foodData.filter(food => !food.availability).length > 0 ? (
          <div className="order-out-of-stock-section">
            <h3 className="order-out-of-stock-header">Currently Unavailable</h3>
            <ul className="order-food-list">
              {foodData
                .filter(food => !food.availability)
                .map((food) => (
                  <li key={food.id} className="order-food-item order-food-item-out-of-stock">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-food-image order-food-image-out-of-stock" 
                    />
                    <div className="order-food-details">
                      <h3 className="order-food-title">
                        {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                      </h3>
                      <p className="order-food-description">
                        {food.description.length > 100 
                          ? `${food.description.substring(0, 100)}...` 
                          : food.description}
                      </p>
                      <p className="order-food-price">{food.price}</p>
                      <div className="order-out-of-stock-badge">Out of Stock</div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

      {totalItems > 0 && (
        <button
          className="order-view-cart-btn"
          onClick={() => navigate("/cart")}
          disabled={!isShopOpen}
        >
          <ShoppingCart size={20} />
          View Cart ({totalItems}) • ₹{totalAmount.toFixed(2)}
        </button>
      )}

      {showResetCartModal && (
        <div className="order-reset-cart-modal-overlay">
          <div className="order-reset-cart-modal">
            <h2>Items already in cart</h2>
            <p>Your cart contains items from another restaurant. Would you like to reset your cart?</p>
            <div className="order-modal-actions">
              <button onClick={() => setShowResetCartModal(false)}>No</button>
              <button onClick={handleFreshStart} disabled={!isShopOpen}>Yes, Start Fresh</button>
            </div>
          </div>
        </div>
      )}

      {showFoodModal && selectedFood && (
        <div className={`order-food-modal-overlay ${window.innerWidth <= 768 ? 'mobile' : 'desktop'}`}>
          <div className="order-food-modal">
            <button className="order-close-modal-btn" onClick={() => setShowFoodModal(false)}>
              <X size={24} />
            </button>
            <div className="order-food-modal-content">
              <img 
                src={selectedFood.image} 
                alt={selectedFood.title} 
                className="order-food-modal-image" 
              />
              <div className="order-food-modal-details">
                <h2 className="order-food-modal-title">
                  {selectedFood.title} {selectedFood.type === "Veg" ? "🥦" : "🍗"}
                </h2>
                <p className="order-food-modal-description">{selectedFood.description}</p>
                <div className="order-food-modal-info">
                  <span>⏱ {selectedFood.deliveryTime}</span>
                  <span className="order-food-modal-price">₹{selectedFood.price}</span>
                </div>
                <div className="order-food-modal-actions">
                  <button
                    className="order-food-modal-cart-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(selectedFood.id);
                    }}
                  >
                    <MinusCircle size={24} />
                  </button>
                  <span className="order-food-modal-quantity">{cart[selectedFood.id] || 0}</span>
                  <button
                    className="order-food-modal-cart-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(selectedFood.id);
                    }}
                    disabled={!isShopOpen}
                  >
                    <PlusCircle size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;