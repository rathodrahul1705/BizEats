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
  Facebook,
  Twitter,
  Instagram,
  Mail
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
  const [showShareOptions, setShowShareOptions] = useState(false);
  const navigate = useNavigate();
  const sessionId = getOrCreateSessionId();

  const [deals, setDeals] = useState([
    {
      id: 1,
      title: "Free Delivery",
      description: "On orders above ₹200",
      icon: "🏍️",
      color: "#fff"
    },
    {
      id: 2,
      title: "Free Chaas",
      description: "With every order",
      icon: "🥛",
      color: "#fff"
    },
    {
      id: 3,
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
    const open = currentHour >= 7 && currentHour < 22;
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

  const toggleShareOptions = (e) => {
    e.stopPropagation();
    setShowShareOptions(!showShareOptions);
  };

  const shareOnWhatsApp = (food) => {
    const message = `Check out ${food.title} from ${storeDetails.name} - Only ₹${food.price}\n\n${window.location.origin}/order-details/${restaurant_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareOnFacebook = (food) => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/order-details/' + restaurant_id)}&quote=Check out ${food.title} from ${storeDetails.name} - Only ₹${food.price}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = (food) => {
    const text = `Check out ${food.title} from ${storeDetails.name} - Only ₹${food.price}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + '/order-details/' + restaurant_id)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnInstagram = () => {
    // Note: Instagram doesn't support direct sharing from web, this will open the app if installed
    alert("Please share from the Instagram app by copying the link");
  };

  const shareViaEmail = (food) => {
    const subject = `Check out ${food.title} from ${storeDetails.name}`;
    const body = `I found this delicious ${food.title} from ${storeDetails.name} for just ₹${food.price}.\n\nCheck it out: ${window.location.origin}/order-details/${restaurant_id}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  if (loading && filteredFood.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="order-details-page-menu-container">
      <div className="order-details-page-menu-store-header">
        <h1 className="order-details-page-menu-store-title">{storeDetails.name}</h1>
        {!isShopOpen && (
          <div className="order-details-page-menu-shop-closed-banner">
            🚫 Shop Closed (Open 9AM-10PM)
          </div>
        )}
      </div>

      <div className="order-details-page-menu-store-details-card">
        <p className="order-details-page-menu-store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="order-details-page-menu-store-info">📍 {storeDetails.location}</p>
        <p className="order-details-page-menu-store-info">⭐ {storeDetails.rating} / 5</p>
        {storeDetails.minOrder > 0 && (
          <p className="order-details-page-menu-store-info">💰 Min. Order: ₹{storeDetails.minOrder}</p>
        )}
      </div>

      {/* Add Deals Swiper Section */}
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
                {groupedByCategory[category].map((food) => (
                  <li key={food.id} className="order-details-page-menu-food-item">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-details-page-menu-food-image" 
                      onClick={() => openFoodModal(food)}
                    />
                    <div className="order-details-page-menu-food-details">
                      <div className="order-details-page-menu-food-header">
                        <h3 
                          className="order-details-page-menu-food-title"
                          onClick={() => openFoodModal(food)}
                        >
                          {food.title} {food.type === "Veg" ? "🥦" : "🍗"}
                        </h3>
                        {/* <button 
                          className="order-details-page-menu-share-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFood(food);
                            toggleShareOptions(e);
                          }}
                        >
                          <Share2 size={16} />
                        </button> */}
                      </div>

                      {showShareOptions && selectedFood?.id === food.id && (
                        <div className="order-details-page-menu-share-container">
                          <button 
                            className="order-details-page-menu-share-option whatsapp"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareOnWhatsApp(food);
                              setShowShareOptions(false);
                            }}
                            title="Share on WhatsApp"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                          <button 
                            className="order-details-page-menu-share-option facebook"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareOnFacebook(food);
                              setShowShareOptions(false);
                            }}
                            title="Share on Facebook"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                            </svg>
                          </button>
                          <button 
                            className="order-details-page-menu-share-option twitter"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareOnTwitter(food);
                              setShowShareOptions(false);
                            }}
                            title="Share on Twitter"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                          </button>
                          <button 
                            className="order-details-page-menu-share-option instagram"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareOnInstagram(food);
                              setShowShareOptions(false);
                            }}
                            title="Share on Instagram"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#E1306C">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          </button>
                          <button 
                            className="order-details-page-menu-share-option email"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareViaEmail(food);
                              setShowShareOptions(false);
                            }}
                            title="Share via Email"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#EA4335">
                              <path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z"/>
                            </svg>
                          </button>
                        </div>
                      )}

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
          <div className="order-details-page-menu-out-of-stock-section">
            <h3 className="order-details-page-menu-out-of-stock-header">Currently Unavailable</h3>
            <ul className="order-details-page-menu-food-list">
              {foodData
                .filter(food => !food.availability)
                .map((food) => (
                  <li key={food.id} className="order-details-page-menu-food-item order-details-page-menu-food-item-out-of-stock">
                    <img 
                      src={food.image} 
                      alt={food.title} 
                      className="order-details-page-menu-food-image order-details-page-menu-food-image-out-of-stock" 
                    />
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
              <img 
                src={selectedFood.image} 
                alt={selectedFood.title} 
                className="order-details-page-menu-food-modal-image" 
              />
              <div className="order-details-page-menu-food-modal-details">
                <div className="order-details-page-menu-food-modal-header">
                  <h2 className="order-details-page-menu-food-modal-title">
                    {selectedFood.title} {selectedFood.type === "Veg" ? "🥦" : "🍗"}
                  </h2>
                  {/* <button 
                    className="order-details-page-menu-share-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleShareOptions(e);
                    }}
                  >
                    <Share2 size={20} />
                  </button> */}
                </div>

                {showShareOptions && (
                  <div className="order-details-page-menu-share-container modal-share">
                    <button 
                      className="order-details-page-menu-share-option whatsapp"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareOnWhatsApp(selectedFood);
                        setShowShareOptions(false);
                      }}
                    >
                      <span>WhatsApp</span>
                    </button>
                    <button 
                      className="order-details-page-menu-share-option facebook"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareOnFacebook(selectedFood);
                        setShowShareOptions(false);
                      }}
                    >
                      <span>Facebook</span>
                    </button>
                    <button 
                      className="order-details-page-menu-share-option twitter"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareOnTwitter(selectedFood);
                        setShowShareOptions(false);
                      }}
                    >
                      <span>Twitter</span>
                    </button>
                    <button 
                      className="order-details-page-menu-share-option instagram"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareOnInstagram(selectedFood);
                        setShowShareOptions(false);
                      }}
                    >
                      <span>Instagram</span>
                    </button>
                    <button 
                      className="order-details-page-menu-share-option email"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareViaEmail(selectedFood);
                        setShowShareOptions(false);
                      }}
                    >
                      <span>Email</span>
                    </button>
                  </div>
                )}

                <p className="order-details-page-menu-food-modal-description">{selectedFood.description}</p>
                <div className="order-details-page-menu-food-modal-info">
                  <span>⏱ {selectedFood.deliveryTime}</span>
                  <span className="order-details-page-menu-food-modal-price">₹{selectedFood.price}</span>
                </div>
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