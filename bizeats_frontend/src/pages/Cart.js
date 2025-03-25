import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, MinusCircle, Trash2, CheckCircle, ArrowLeft } from "lucide-react";
import "../assets/css/Cart.css";
import SignIn from "../components/SignIn";
import AddressSelection from "./AddressSelection";
import { useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";

const Cart = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sessionId = getOrCreateSessionId();
  // Get initial values from localStorage
  const restaurantId = localStorage.getItem("current_order_restaurant_id");
  
  const [step, setStep] = useState(() => {
    return parseInt(localStorage.getItem("cart_current_step")) || 1;
  });

  const [userSelectedAddress, setUserSelectedAddress] = useState(
    localStorage.getItem("user_full_address") || null
  );

  // Save step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart_current_step", step.toString());
  }, [step]);

  // Fetch cart items and update user cart status
  const fetchCartData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First update cart user status if user is logged in
      if (user?.user_id) {
        await fetchData(
          API_ENDPOINTS.ORDER.UPDATE_CART_USER,
          "POST",
          {
            user_id: user.user_id,
            session_id: sessionId,
            cart_status: 2
          }
        );
      }

      // Then fetch cart items
      const response = await fetchData(
        API_ENDPOINTS.ORDER.GET_CART_ITEM_LIST,
        "POST",
        {
          user_id: user?.user_id || null,
          session_id: sessionId,
        }
      );

      if (response?.cart_details) {
        const items = response.cart_details.map((item) => ({
          item_id: item.item_id,
          id: item.id,
          title: item.item_name,
          description: item.item_description,
          image: item.item_image,
          quantity: item.quantity,
          price: parseFloat(item.item_price),
          deliveryTime: `${response.time_required_to_reach_loc} min`,
          location: response.Address,
          restaurant_id: response.restaurant_id,
          type: "all",
        }));
        
        setCartItems(items);
        updateCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } else {
        setCartItems([]);
        updateCartCount(0);
      }
    } catch (err) {
      console.error("Error fetching cart data:", err);
      setError("Failed to load cart items. Please try again.");
      setCartItems([]);
      updateCartCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, sessionId]);

  // Update cart count in localStorage and dispatch event
  const updateCartCount = useCallback((count) => {
    if (count > 0) {
      localStorage.setItem("cart_count", count);
      localStorage.setItem("current_order_restaurant_id", restaurantId);
    } else {
      localStorage.removeItem("cart_count");
      localStorage.removeItem("current_order_restaurant_id");
    }
    window.dispatchEvent(new Event("storage"));
  }, [restaurantId]);

  // Initial data fetch
  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  // Handle cart item operations (add/remove)
  const handleCartOperation = async (item_id, id, action) => {
    try {
      setLoading(true);
      
      const response = await fetchData(
        API_ENDPOINTS.ORDER.ADD_TO_CART,
        "POST",
        {
          user_id: user?.user_id || null,
          session_id: sessionId,
          restaurant_id: restaurantId,
          item_id: item_id,
          id: id,
          quantity: action === "add" ? 1 : undefined,
          action: action,
        }
      );

      if (response.status === "success") {
        await fetchCartData(); // Refresh cart data
      }
    } catch (error) {
      console.error(`Error ${action}ing item from cart:`, error);
      setError(`Failed to ${action} item. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const increaseQuantity = (id, item_id) => handleCartOperation(item_id, id, "add");
  const decreaseQuantity = (id, item_id) => handleCartOperation(item_id, id, "remove");

  // Calculate totals
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Navigation handlers
  const handleProceed = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty. Please add items before proceeding.");
      return;
    }
    
    if (step === 1) {
      if (!user) {
        setShowSignIn(true);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (!userSelectedAddress) {
        alert("Please select or add a new address before proceeding.");
      } else {
        setStep(3);
      }
    }
  };

  const handleBack = () => step > 1 && setStep(step - 1);

  const handleAddressSelection = (address_id, selectedFullAddress) => {
    localStorage.setItem("user_full_address", selectedFullAddress);
    setUserSelectedAddress(selectedFullAddress);
    setStep(3);
  };

  const handlePayment = () => navigate("/payments");

  // Render loading state
  if (loading && cartItems.length === 0) {
    return <div className="cart-container loading">Loading your cart...</div>;
  }

  // Render error state
  if (error && cartItems.length === 0) {
    return (
      <div className="cart-container error">
        <p>{error}</p>
        <button onClick={fetchCartData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2 className="cart-title">Secure Checkout</h2>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? "active" : ""}`}>
          {step > 1 ? <CheckCircle size={18} /> : "1"} Login
        </div>
        <div className={`step ${step >= 2 ? "active" : ""}`}>
          {step > 2 ? <CheckCircle size={18} /> : "2"} Address
        </div>
        <div className={`step ${step >= 3 ? "active" : ""}`}>3 Payment</div>
      </div>

      {/* Back Button */}
      {step > 1 && (
        <button className="cart-back-btn" onClick={handleBack}>
          <ArrowLeft size={20} /> Back
        </button>
      )}

      {/* Step 1: User Login */}
      {step === 1 && !user && showSignIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          onSuccess={() => {
            setShowSignIn(false);
            setStep(2);
          }}
          setUser={(userData) => {
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
          }}
        />
      )}

      {/* Step 2: Address Selection */}
      {step === 2 && user && (
        <AddressSelection onAddressSelect={handleAddressSelection} />
      )}

      {/* Step 3: Payment */}
      {step === 3 && userSelectedAddress && (
        <div className="orderSummaryHolder">
          <h3>Order Summary</h3>
          <p className="subTitleText">
            <strong>Deliver to:</strong> {userSelectedAddress}
          </p>
          <ul className="cart-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-image" />
                <div className="cart-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-description">{item.description}</p>
                  <p className="cart-item-price">₹ {item.price}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <div className="total-section">
              <span>Total:</span>
              <span>₹ {totalPrice}</span>
            </div>
            <button className="proceed-btn" onClick={handlePayment}>
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {/* Empty Cart Section */}
      {cartItems.length === 0 && !loading && (
        <div className="empty-cart">
          <img src={require("../assets/img/empty_cart.webp")} alt="Empty Cart" />
          <h3>Your cart is empty!</h3>
          <p>Looks like you haven't added anything yet. Let's fix that!</p>
          <button
            className="add-items-btn"
            onClick={() => navigate("/food-list")}
          >
            Add Items
          </button>
        </div>
      )}

      {/* Cart Details Section */}
      {cartItems.length > 0 && step !== 3 && step !== 2 && (
        <>
          <ul className="cart-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-image" />
                <div className="cart-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-description">{item.description}</p>
                  <p className="cart-item-price">₹ {item.price}</p>
                  <div className="cart-actions">
                    <button
                      className="cart-btn"
                      onClick={() => decreaseQuantity(item.id, item.item_id)}
                      disabled={loading}
                    >
                      <MinusCircle size={20} />
                    </button>
                    <span className="cart-quantity">{item.quantity}</span>
                    <button
                      className="cart-btn"
                      onClick={() => increaseQuantity(item.id, item.item_id)}
                      disabled={loading}
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <div className="total-section">
              <span>Total:</span>
              <span>₹ {totalPrice}</span>
            </div>
            <button 
              className="proceed-btn" 
              onClick={handleProceed}
              disabled={loading}
            >
              {step === 1
                ? "Proceed to Checkout"
                : step === 2
                ? "Select Address"
                : "Proceed to Payment"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;