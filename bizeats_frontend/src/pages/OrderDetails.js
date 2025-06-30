import React, { useState, useEffect } from "react";
import { 
  PlusCircle, 
  MinusCircle, 
  ShoppingCart, 
  X, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Share2,
  Gift,
  Clock,
  MapPin,
  Star,
  AlertCircle
} from "lucide-react";
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
import FSSAILogo from '../assets/img/fssai_logo.png';

const checkItemTimingStatus = (item) => {
  if (!item.start_time || !item.end_time) return null;

  const now = new Date();
  const istOffset = 330 * 60 * 1000; // IST offset in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  // Convert current time to HH:MM format in IST
  const currentHours = istTime.getUTCHours().toString().padStart(2, '0');
  const currentMinutes = istTime.getUTCMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  
  if (currentTimeStr < item.start_time) {
    return { status: 'upcoming', time: item.start_time };
  } else if (currentTimeStr > item.end_time) {
    return { status: 'ended', time: item.end_time };
  }
  return null;
};

const OrderDetails = ({ user, setUser }) => {
  const [loading, setLoading] = useState(true);
  const { city, slug, restaurant_id, offer } = useParams();
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
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const sessionId = getOrCreateSessionId();

  const [deals, setDeals] = useState([
    {
      id: 1,
      title: "10% Off",
      description: "On every order",
      icon: "🤑",
      color: "#fff"
    },
    {
      id: 2,
      title: "Free Delivery",
      description: "On orders above ₹399",
      icon: "🏍️",
      color: "#fff"
    },
    {
      id: 3,
      title: "Free Packaging",
      description: "Neat and secure packaging!",
      icon: "📦",
      color: "#fff",
    }    
  ]);

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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showFoodModal) {
        setShowFoodModal(false);
      }
    };

    const handleClickOutside = (e) => {
      if (showFoodModal && e.target.classList.contains('order-details-page-menu-food-modal-overlay')) {
        setShowFoodModal(false);
      }
      if (showShareOptions && !e.target.closest('.order-details-page-menu-share-container')) {
        setShowShareOptions(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFoodModal, showShareOptions]);

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
      const url = API_ENDPOINTS.ORDER.RES_MENU_LIST_BY_RES_ID(restaurant_id, offer);
      const response = await fetchData(url, "GET", null);
  
      if (!response || typeof response !== "object") {
        throw new Error("Invalid response format");
      }
      
      setStoreDetails({
        name: response.restaurant_name || "Unnamed Restaurant",
        restaurant_status: response.restaurant_status ?? "Unknown",
        fssai_number: response.fssai_number ?? "FSSAI not available",
        deliveryTime: `${response.time_required_to_reach_loc || 0} min`,
        location: response.Address || "Location not available",
        rating: response.rating ?? 0,
        minOrder: response.min_order ?? 0,
        openingTime: response.opening_time,
        closingTime: response.closing_time,
        currentKitchenStatus: response.restaurant_current_status?.is_open,
      });
  
      const items = Array.isArray(response.itemlist) ? response.itemlist : [];
  
      setFoodData(
        items.map((item) => ({
          id: item.id,
          title: item.item_name || "Untitled",
          description: item.description || "",
          image: item.item_image || "",
          price: parseFloat(item.item_price) || 0,
          deliveryTime: `${response.time_required_to_reach_loc || 0} min`,
          location: response.Address || "",
          type: item.food_type || "Unknown",
          category: item.category || "Uncategorized",
          availability: item.availability ?? true,
          buy_one_get_one_free: item.buy_one_get_one_free ?? false,
          start_time: item.start_time,
          end_time: item.end_time,
        }))
      );
    } catch (error) {
      console.error("Error fetching order list data:", error.message || error);
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
      return;
    }

    // Check if item is available based on timing
    const timingStatus = checkItemTimingStatus(foodItem);
    if (timingStatus?.status === 'upcoming' || timingStatus?.status === 'ended') {
      return;
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
    (food) => {
      const timingStatus = checkItemTimingStatus(food);
      return (filter === "all" || food.type === filter) && 
             food.availability && 
             (!timingStatus || (timingStatus.status !== 'upcoming' && timingStatus.status !== 'ended'))
    }
  );

  const upcomingFood = foodData.filter(
    (food) => {
      const timingStatus = checkItemTimingStatus(food);
      return food.availability && timingStatus?.status === 'upcoming';
    }
  );

  const endedFood = foodData.filter(
    (food) => {
      const timingStatus = checkItemTimingStatus(food);
      return food.availability && timingStatus?.status === 'ended';
    }
  );

  const openFoodModal = (food) => {
    if (!food.availability || !isShopOpen) return;
    const timingStatus = checkItemTimingStatus(food);
    if (timingStatus?.status === 'upcoming' || timingStatus?.status === 'ended') return;
    setSelectedFood(food);
    setShowFoodModal(true);
  };

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

  const toggleShareOptions = (e) => {
    e.stopPropagation();
    setShowShareOptions(!showShareOptions);
  };

  const shareOnWhatsApp = () => {
    const message = `Check out ${storeDetails.name} on Food Delivery App - ${window.location.origin}/order-details/${restaurant_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/order-details/' + restaurant_id)}&quote=Check out ${storeDetails.name} on Food Delivery App`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const text = `Check out ${storeDetails.name} on Food Delivery App`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + '/order-details/' + restaurant_id)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const checkShopTimings = () => {
      setIsShopOpen(storeDetails?.currentKitchenStatus)
  };

  useEffect(() => {
    checkShopTimings();
    const interval = setInterval(checkShopTimings, 60000);
    return () => clearInterval(interval);
  }, [storeDetails?.restaurant_status, storeDetails?.openingTime, storeDetails?.closingTime, currentTime]);

  if (loading && filteredFood.length === 0) {
    return <StripeLoader />;
  }
  
  return (
    <div className="order-details-page-menu-container">
      <div className="order-details-page-menu-store-header">
        <h1 className="order-details-page-menu-store-title">{storeDetails.name}</h1>
      </div>

      {showShareOptions && (
        <div className="order-details-page-menu-share-container restaurant-share">
          <button 
            className="order-details-page-menu-share-option whatsapp"
            onClick={shareOnWhatsApp}
            title="Share on WhatsApp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>
          <button 
            className="order-details-page-menu-share-option facebook"
            onClick={shareOnFacebook}
            title="Share on Facebook"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
            </svg>
          </button>
          <button 
            className="order-details-page-menu-share-option twitter"
            onClick={shareOnTwitter}
            title="Share on Twitter"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="order-details-page-menu-store-details-card">
        {isShopOpen ? (
          <div className="order-details-page-menu-shop-status-banner open">
            <div className="order-details-page-menu-shop-status-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="order-details-page-menu-shop-status-content">
              <h3 className="order-details-page-menu-shop-status-title">Open Now</h3>
              <p className="order-details-page-menu-shop-status-hours">
                Today's hours: {storeDetails.openingTime} - {storeDetails.closingTime}
              </p>
            </div>
          </div>
        ) : (
          <div className="order-details-page-menu-shop-status-banner closed">
            <div className="order-details-page-menu-shop-status-icon">
              <AlertCircle size={24} />
            </div>
            <div className="order-details-page-menu-shop-status-content">
              <h3 className="order-details-page-menu-shop-status-title">
                {storeDetails.restaurant_status !== 2 ? 'Closed Today' : 'Currently Closed'}
              </h3>
              <p className="order-details-page-menu-shop-status-hours">
                {storeDetails.restaurant_status == 2 && storeDetails.openingTime != null
                  ? `This home kitchen will open at ${storeDetails.openingTime}`
                  : `The home kitchen will open tomorrow`}
              </p>
            </div>
          </div>
        )}

        <div className="order-details-header-subclass">
          <div className="order-details-page-menu-store-info">
            <Clock size={16} />
            <span>{storeDetails.deliveryTime}</span>
          </div>
          <div className="order-details-page-menu-store-info">
            <MapPin size={16} />
            <span>{storeDetails.location}</span>
          </div>
          <div className="order-details-page-menu-store-info">
            <Star size={16} />
            <span>{storeDetails.rating} / 5</span>
          </div>
          {storeDetails.minOrder > 0 && (
            <div className="order-details-page-menu-store-info">
              <span>💰</span>
              <span>Min. Order: ₹{storeDetails.minOrder}</span>
            </div>
          )}
        </div>
      </div>

      <div className="order-details-page-menu-deals-section">
        <div className="order-details-page-menu-deals-header-wrapper">
          <h2 className="order-details-page-menu-deals-title">Deals for You</h2>
          <div className="order-details-page-menu-deals-swiper-wrapper">
            <Swiper
              slidesPerView={1}
              spaceBetween={16}
              modules={[Navigation]}
              className="order-details-page-menu-deals-swiper"
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
                  <div className="order-details-page-menu-deal-card">
                    <div className="order-details-page-menu-deal-inner">
                      <div className="order-details-page-menu-deal-icon">{deal.icon}</div>
                      <div className="order-details-page-menu-deal-content">
                        <h3 className="order-details-page-menu-deal-title">{deal.title}</h3>
                        <p className="order-details-page-menu-deal-description">{deal.description}</p>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>

      <div className="order-details-page-menu-filter-container">
        <button
          className={`order-details-page-menu-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`order-details-page-menu-filter-btn ${filter === "Veg" ? "active" : ""}`}
          onClick={() => setFilter("Veg")}
        >
          🥦 Veg
        </button>
        <button
          className={`order-details-page-menu-filter-btn ${filter === "Non-Veg" ? "active" : ""}`}
          onClick={() => setFilter("Non-Veg")}
        >
          🍗 Non-Veg
        </button>
      </div>

      <div className="order-details-page-menu-categories-container">
        {Object.keys(groupedByCategory).map((category) => (
          <div key={category} className="order-details-page-menu-category-section">
            <div
              className="order-details-page-menu-category-header"
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
              <ul className="order-details-page-menu-food-list">
                {groupedByCategory[category].map((food) => {
                  const timingStatus = checkItemTimingStatus(food);
                  return (
                    <li key={food.id} className="order-details-page-menu-food-item">
                      <div className="order-details-page-menu-food-image-container">
                        <img 
                          src={food.image} 
                          alt={food.title} 
                          className="order-details-page-menu-food-image" 
                          onClick={() => openFoodModal(food)}
                        />
                        {food.buy_one_get_one_free && (
                          <div className="order-details-page-menu-bogo-tag">
                            <Gift size={14} />
                            <span>Buy 1 Get 1 Free</span>
                          </div>
                        )}
                      </div>
                      <div className="order-details-page-menu-food-details">
                        <div className="order-details-page-menu-food-header">
                          <h3 
                            className="order-details-page-menu-food-title"
                            onClick={() => openFoodModal(food)}
                          >
                            {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                          </h3>
                        </div>
                        <p 
                          className="order-details-page-menu-food-description"
                          onClick={() => openFoodModal(food)}
                        >
                          {food.description.length > 100 
                            ? `${food.description.substring(0, 100)}...` 
                            : food.description}
                          {food.description.length > 100 && (
                            <span className="order-details-page-menu-read-more">
                              <span>Read more</span>
                              <ArrowRight size={16} />
                            </span>
                          )}
                        </p>
                        <p className="order-details-page-menu-food-price">₹{food.price}</p>
                        <div className="order-details-page-menu-cart-actions">
                          {cart[food.id] > 0 ? (
                            <>
                              <button
                                className="order-details-page-menu-cart-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(food.id);
                                }}
                              >
                                <MinusCircle size={20} />
                              </button>
                              <span className="order-details-page-menu-cart-quantity">{cart[food.id] || 0}</span>
                              <button
                                className="order-details-page-menu-cart-btn"
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
                              className="order-details-page-menu-add-to-cart-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(food.id);
                              }}
                              disabled={!isShopOpen || timingStatus?.status === 'upcoming' || timingStatus?.status === 'ended'}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      {upcomingFood.length > 0 && (
        <div className="order-details-page-menu-out-of-stock-section">
          <h3 className="order-details-page-menu-out-of-stock-header">Coming Soon</h3>
          <ul className="order-details-page-menu-food-list">
            {upcomingFood.map((food) => {
              const timingStatus = checkItemTimingStatus(food);
              return (
                <li key={food.id} className="order-details-page-menu-food-item order-details-page-menu-food-item-out-of-stock">
                  <div className="order-details-page-menu-food-image-container">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-details-page-menu-food-image order-details-page-menu-food-image-out-of-stock" 
                    />
                    {food.buy_one_get_one_free && (
                      <div className="order-details-page-menu-bogo-tag">
                        <Gift size={14} />
                        <span>Buy 1 Get 1 Free</span>
                      </div>
                    )}
                    {timingStatus?.status === 'upcoming' && (
                      <div className="order-details-page-menu-timing-tag upcoming">
                        <Clock size={12} />
                        <span>Available from {food.start_time}</span>
                      </div>
                    )}
                  </div>
                  <div className="order-details-page-menu-food-details">
                    <h3 className="order-details-page-menu-food-title">
                      {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                    </h3>
                    <p className="order-details-page-menu-food-description">
                      {food.description.length > 100 
                        ? `${food.description.substring(0, 100)}...` 
                        : food.description}
                    </p>
                    <p className="order-details-page-menu-food-price">₹{food.price}</p>
                    <div className="order-details-page-menu-out-of-stock-badge">Available from {food.start_time}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {endedFood.length > 0 && (
        <div className="order-details-page-menu-out-of-stock-section">
          <h3 className="order-details-page-menu-out-of-stock-header">Recently Ended</h3>
          <ul className="order-details-page-menu-food-list">
            {endedFood.map((food) => {
              const timingStatus = checkItemTimingStatus(food);
              return (
                <li key={food.id} className="order-details-page-menu-food-item order-details-page-menu-food-item-out-of-stock">
                  <div className="order-details-page-menu-food-image-container">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-details-page-menu-food-image order-details-page-menu-food-image-out-of-stock" 
                    />
                    {food.buy_one_get_one_free && (
                      <div className="order-details-page-menu-bogo-tag">
                        <Gift size={14} />
                        <span>Buy 1 Get 1 Free</span>
                      </div>
                    )}
                    {timingStatus?.status === 'ended' && (
                      <div className="order-details-page-menu-timing-tag ended">
                        <Clock size={12} />
                        <span>Available until {food.end_time}</span>
                      </div>
                    )}
                  </div>
                  <div className="order-details-page-menu-food-details">
                    <h3 className="order-details-page-menu-food-title">
                      {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                    </h3>
                    <p className="order-details-page-menu-food-description">
                      {food.description.length > 100 
                        ? `${food.description.substring(0, 100)}...` 
                        : food.description}
                    </p>
                    <p className="order-details-page-menu-food-price">₹{food.price}</p>
                    <div className="order-details-page-menu-out-of-stock-badge">Available until {food.end_time}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {foodData.filter(food => !food.availability).length > 0 ? (
          <div className="order-details-page-menu-out-of-stock-section">
            <h3 className="order-details-page-menu-out-of-stock-header">Currently Unavailable</h3>
            <ul className="order-details-page-menu-food-list">
              {foodData
                .filter(food => !food.availability)
                .map((food) => (
                  <li key={food.id} className="order-details-page-menu-food-item order-details-page-menu-food-item-out-of-stock">
                    <div className="order-details-page-menu-food-image-container">
                      <img 
                        src={food.image} 
                        alt={food.title} 
                        className="order-details-page-menu-food-image order-details-page-menu-food-image-out-of-stock" 
                      />
                      {food.buy_one_get_one_free && (
                        <div className="order-details-page-menu-bogo-tag">
                          <Gift size={14} />
                          <span>Buy 1 Get 1 Free</span>
                        </div>
                      )}
                    </div>
                    <div className="order-details-page-menu-food-details">
                      <h3 className="order-details-page-menu-food-title">
                        {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                      </h3>
                      <p className="order-details-page-menu-food-description">
                        {food.description.length > 100 
                          ? `${food.description.substring(0, 100)}...` 
                          : food.description}
                      </p>
                      <p className="order-details-page-menu-food-price">₹{food.price}</p>
                      <div className="order-details-page-menu-out-of-stock-badge">Out of Stock</div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

      {totalItems > 0 && (
        <button
          className="order-details-page-menu-view-cart-btn"
          onClick={() => navigate("/cart")}
          disabled={!isShopOpen}
        >
          <ShoppingCart size={20} />
          View Cart ({totalItems}) • ₹{totalAmount.toFixed(2)}
        </button>
      )}

      {/* FSSAI License Section */}
      <div className="order-details-page-menu-fssai-license">
        <div className="fssai-logo-container">
          <img src={FSSAILogo} alt="FSSAI Logo" className="fssai-logo" />
        </div>
        <p>License No. {storeDetails?.fssai_number}</p>
      </div>

      {showResetCartModal && (
        <div className="order-details-page-menu-reset-cart-modal-overlay">
          <div className="order-details-page-menu-reset-cart-modal">
            <h2>Items already in cart</h2>
            <p>Your cart contains items from another restaurant. Would you like to reset your cart?</p>
            <div className="order-details-page-menu-modal-actions">
              <button onClick={() => setShowResetCartModal(false)}>No</button>
              <button onClick={handleFreshStart} disabled={!isShopOpen}>Yes, Start Fresh</button>
            </div>
          </div>
        </div>
      )}

      {showFoodModal && selectedFood && (
        <div className={`order-details-page-menu-food-modal-overlay ${window.innerWidth <= 768 ? 'mobile' : 'desktop'}`}>
          <div className="order-details-page-menu-food-modal">
            <button className="order-details-page-menu-close-modal-btn" onClick={() => setShowFoodModal(false)}>
              <X size={24} />
            </button>
            <div className="order-details-page-menu-food-modal-content">
              <div className="order-details-page-menu-food-modal-image-container">
                <img 
                  src={selectedFood.image} 
                  alt={selectedFood.title} 
                  className="order-details-page-menu-food-modal-image" 
                />
                {selectedFood.buy_one_get_one_free && (
                  <div className="order-details-page-menu-bogo-tag modal-bogo">
                    <Gift size={16} />
                    <span>Buy 1 Get 1 Free</span>
                  </div>
                )}
              </div>
              <div className="order-details-page-menu-food-modal-details">
                <div className="order-details-page-menu-food-modal-header">
                  <h2 className="order-details-page-menu-food-modal-title">
                    {selectedFood.title} {selectedFood.type === "Veg" ? "🥦" : "🍗"}
                  </h2>
                </div>
                <p className="order-details-page-menu-food-modal-description">{selectedFood.description}</p>
                <div className="order-details-page-menu-food-modal-info">
                  <span>⏱ {selectedFood.deliveryTime}</span>
                  <span className="order-details-page-menu-food-modal-price">₹{selectedFood.price}</span>
                </div>
                {selectedFood.start_time && selectedFood.end_time && (
                  <div className="order-details-page-menu-food-modal-timing">
                    <Clock size={16} />
                    <span>
                      Available from {selectedFood.start_time} to {selectedFood.end_time}
                    </span>
                  </div>
                )}
                <div className="order-details-page-menu-food-modal-actions">
                  <button
                    className="order-details-page-menu-food-modal-cart-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromCart(selectedFood.id);
                    }}
                  >
                    <MinusCircle size={24} />
                  </button>
                  <span className="order-details-page-menu-food-modal-quantity">{cart[selectedFood.id] || 0}</span>
                  <button
                    className="order-details-page-menu-food-modal-cart-btn"
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