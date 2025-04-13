import React, { useState, useEffect } from "react";
import { PlusCircle, MinusCircle, ShoppingCart, X, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../assets/css/OrderDetails.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";
import StripeLoader from "../loader/StripeLoader";

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
  });
  const [foodData, setFoodData] = useState([]);
  const [showResetCartModal, setShowResetCartModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const navigate = useNavigate();
  const sessionId = getOrCreateSessionId();

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
    const currentRestaurantId = localStorage.getItem("current_order_restaurant_id");

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
    (food) => filter === "all" || food.type === filter
  );

  const openFoodModal = (food) => {
    setSelectedFood(food);
    setShowFoodModal(true);
  };

  if (loading && filteredFood.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="order-page-container">
      <h1 className="order-store-title">{storeDetails.name}</h1>

      <div className="order-store-details-card">
        <p className="order-store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="order-store-info">📍 {storeDetails.location}</p>
        <p className="order-store-info">⭐ {storeDetails.rating} / 5</p>
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

      <h2 className="order-food-list-title">Recommended ({filteredFood.length})</h2>
      <ul className="order-food-list">
        {filteredFood.map((food) => (
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

              <p className="order-food-price">₹{food.price}</p>
              <div className="order-cart-actions">
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
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {totalItems > 0 && (
        <button
          className="order-view-cart-btn"
          onClick={() => navigate("/cart")}
        >
          <ShoppingCart size={20} />
          View Cart ({totalItems})
        </button>
      )}

      {showResetCartModal && (
        <div className="order-reset-cart-modal-overlay">
          <div className="order-reset-cart-modal">
            <h2>Items already in cart</h2>
            <p>Your cart contains items from another restaurant. Would you like to reset your cart?</p>
            <div className="order-modal-actions">
              <button onClick={() => setShowResetCartModal(false)}>No</button>
              <button onClick={handleFreshStart}>Yes, Start Fresh</button>
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