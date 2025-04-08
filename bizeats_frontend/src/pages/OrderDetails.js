import React, { useState, useEffect } from "react";
import { PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "../assets/css/OrderDetails.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";

const OrderDetails = ({ user, setUser }) => {
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
  const navigate = useNavigate();
  const sessionId = getOrCreateSessionId();

  const fetchCartDetails = async () => {
    try {
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
      
      // console.log("response===",response)

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

  // Function to perform the actual add-to-cart operation
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

    // Log for debugging
    console.log("restaurant_id ===", restaurant_id);
    console.log("currentRestaurantId ===", currentRestaurantId);

    if (currentRestaurantId && currentRestaurantId !== restaurant_id) {
      setShowResetCartModal(true);
      setPendingItem(id);
      return;
    }
    await addItem(id);
  };

  // Called when user confirms the modal (Start A Fresh)
  const handleFreshStart = async () => {
    try {
      await fetchData(API_ENDPOINTS.ORDER.CLEAR_CART, "POST", {
        user_id: user?.user_id || null,
        session_id: sessionId,
      });
      setCart({});
      // After clearing cart, add the pending item
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
    }else{
      updateCartCount(totalItems);
      localStorage.removeItem("cart_count", totalItems);
    }
  }, [cart]);

  const filteredFood = foodData.filter(
    (food) => filter === "all" || food.type === filter
  );
  
  return (
    <div className="food-list-container">
      <h1 className="store-title">{storeDetails.name}</h1>

      <div className="store-details-card">
        <p className="store-info">⏱ {storeDetails.deliveryTime}</p>
        <p className="store-info">📍 {storeDetails.location}</p>
        <p className="store-info">⭐ {storeDetails.rating} / 5</p>
      </div>

      <div className="filter-container">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          🍽 All
        </button>
        <button
          className={`filter-btn ${filter === "Veg" ? "active" : ""}`}
          onClick={() => setFilter("Veg")}
        >
          🥦 Veg
        </button>
        <button
          className={`filter-btn ${filter === "Non-Veg" ? "active" : ""}`}
          onClick={() => setFilter("Non-Veg")}
        >
          🍗 Non-Veg
        </button>
      </div>

      <h2 className="food-list-title">Recommended ({filteredFood.length})</h2>
      <ul className="food-list">
        {filteredFood.map((food) => (
          <li key={food.id} className="food-item">
            <img src={food.image} alt={food.title} className="food-image" />
            <div className="food-details">
              <h3 className="food-title">
                {food.title} {food.type === "veg" ? "🥦" : "🍗"}
              </h3>
              <p className="food-description">{food.description}</p>
              <p className="food-location">📍 {food.location}</p>
              <p className="food-price">₹ {food.price}</p>
              <div className="cart-actions">
                <button
                  className="cart-btn"
                  onClick={() => removeFromCart(food.id)}
                >
                  <MinusCircle size={20} />
                </button>
                <span className="cart-quantity">{cart[food.id] || 0}</span>
                <button
                  className="cart-btn"
                  onClick={() => addToCart(food.id)}
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
          className="view-cart-btn"
          onClick={() => navigate("/cart")}
        >
          <ShoppingCart size={20} />
          View Cart ({totalItems})
        </button>
      )}

      {showResetCartModal && (
        <div className="order-details-modal-overlay">
          <div className="order-details-modal-class">
            <h2>Items already in cart</h2>
            <p>Your cart contains items from another restaurant. Would you like to reset your cart?</p>
            <div className="modal-actions-cart">
              <button onClick={() => setShowResetCartModal(false)}>No</button>
              <button onClick={handleFreshStart}>Yes, A Start Fresh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
