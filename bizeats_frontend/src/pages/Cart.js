import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, MinusCircle, Trash2, CheckCircle, ArrowLeft, User, MapPin, ClipboardCheck, Gift, X } from "lucide-react";
import "../assets/css/Cart.css";
import SignIn from "../components/SignIn";
import AddressSelection from "./AddressSelection";
import { useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";
import StripeLoader from "../loader/StripeLoader";
import Confetti from 'react-dom-confetti';

const Cart = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confetti, setConfetti] = useState(false);

  const sessionId = getOrCreateSessionId();
  const restaurantId = localStorage.getItem("current_order_restaurant_id");

  const [step, setStep] = useState(() => {
    return parseInt(localStorage.getItem("cart_current_step")) || 1;
  });

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [step]);

  const [userSelectedAddress, setUserSelectedAddress] = useState(
    localStorage.getItem("user_full_address") || null
  );

  useEffect(() => {
    localStorage.setItem("cart_current_step", step.toString());
  }, [step]);

  const fetchCartData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (user?.user_id) {
        await fetchData(API_ENDPOINTS.ORDER.UPDATE_CART_USER, "POST", {
          user_id: user.user_id,
          session_id: sessionId,
          cart_status: 2,
          restaurant_id: restaurantId,
        });
      }

      const response = await fetchData(API_ENDPOINTS.ORDER.GET_CART_ITEM_LIST, "POST", {
        user_id: user?.user_id || null,
        session_id: sessionId,
      });

      if (response?.cart_details) {
        const items = response.cart_details.map((item) => ({
          item_id: item.item_id,
          id: item.id,
          title: item.item_name,
          description: item.item_description,
          buy_one_get_one_free: item.buy_one_get_one_free,
          image: item.item_image,
          quantity: item.quantity,
          price: parseFloat(item.item_price),
          originalPrice: parseFloat(item.original_item_price || item.item_price),
          hasDiscount: item.discount_active === 1,
          discountPercent: item.discount_percent || 0,
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

  const updateCartCount = useCallback(
    (count) => {
      if (count > 0) {
        localStorage.setItem("cart_count", count);
        localStorage.setItem("current_order_restaurant_id", restaurantId);
      } else {
        localStorage.removeItem("cart_count");
      }
      window.dispatchEvent(new Event("storage"));
    },
    [restaurantId]
  );

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const handleCartOperation = async (item_id, id, action) => {
    try {
      setLoading(true);
      
      const response = await fetchData(API_ENDPOINTS.ORDER.ADD_TO_CART, "POST", {
        user_id: user?.user_id || null,
        session_id: sessionId,
        restaurant_id: restaurantId,
        item_id: item_id,
        id: id,
        quantity: action === "add" ? 1 : undefined,
        action: action,
      });

      if (response.status === "success") {
        await fetchCartData();
        if (action === "delete") {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 1000);
        }
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

  const deleteItem = (id, item_id) => {
    handleCartOperation(item_id, id, "delete");
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.price);
    }, 0);
  };

  const calculateTotalSavings = () => {
    return cartItems.reduce((total, item) => {
      if (item.hasDiscount) {
        return total + ((item.originalPrice - item.price));
      }
      return total;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const totalSavings = calculateTotalSavings();

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

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleBackToRestaurant = () => {
    const restaurantId = localStorage.getItem("current_order_restaurant_id");
    if (restaurantId) {
      navigate(`/city/thane/kokan-foods-kalwa-parsik-thane/${restaurantId}`);
    } else {
      navigate("/");
    }
  };

  const handleAddressSelection = (address_id, selectedFullAddress) => {
    let user_full_address = localStorage.getItem("user_full_address");
    setUserSelectedAddress(user_full_address);
    setStep(3);
  };

  const handlePayment = () => navigate(`/payments/${restaurantId}`);

  if (loading && cartItems.length === 0) {
    return <StripeLoader />;
  }

  if (error && cartItems.length === 0) {
    return (
      <div className="cart-error-container">
        <p className="cart-error-message">{error}</p>
        <button className="cart-retry-btn" onClick={fetchCartData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <Confetti active={confetti} config={{ elementCount: 50, spread: 70 }} />
      
      <div className="cart-header">
        <h2 className="cart-page-title">Your Cart</h2>
        {cartItems.length > 0 && (
          <div className="cart-step-indicator">
            <div className={`cart-step ${step >= 1 ? "active" : ""}`}>
              <div className="step-content">
                <span className="step-icon">
                  {step > 1 ? <CheckCircle size={18} /> : <User size={18} />}
                </span>
                <span className="step-text">Login</span>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className={`cart-step ${step >= 2 ? "active" : ""}`}>
              <div className="step-content">
                <span className="step-icon">
                  {step > 2 ? <CheckCircle size={18} /> : <MapPin size={18} />}
                </span>
                <span className="step-text">Address</span>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className={`cart-step ${step >= 3 ? "active" : ""}`}>
              <div className="step-content">
                <span className="step-icon">
                  <ClipboardCheck size={18} />
                </span>
                <span className="step-text">Review</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {(step > 1 || cartItems.length > 0) && (
        <button 
          className="cart-navigation-btn back" 
          onClick={step > 1 ? handleBack : handleBackToRestaurant}
        >
          <ArrowLeft size={20} /> {step > 1 ? "Back" : "Back to Home Kitchen"}
        </button>
      )}

      {step === 1 && !user && showSignIn && (
        <div className="signin-modal-overlay">
          <div className="signin-modal">
            <button className="close-modal" onClick={() => setShowSignIn(false)}>
              <X size={24} />
            </button>
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
          </div>
        </div>
      )}

      {step === 2 && user && <AddressSelection onAddressSelect={handleAddressSelection} />}

      {step === 3 && userSelectedAddress && (
        <div className="cart-review-container">
          <ul className="cart-items-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item-card">
                <div className="cart-item-image-container">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="cart-item-image" 
                  />
                  {item.buy_one_get_one_free && (
                    <div className="bogo-tag">
                      <Gift size={14} />
                      <span>BOGO</span>
                    </div>
                  )}
                </div>
                <div className="cart-item-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  {item.hasDiscount ? (
                    <div className="cart-price-container">
                      <span className="cart-original-price">₹{item.originalPrice.toFixed(2)}</span>
                      <span className="cart-discounted-price">₹{item.price.toFixed(2)}</span>
                      <span className="cart-discount-badge">{item.discountPercent}% OFF</span>
                    </div>
                  ) : (
                    <p className="cart-item-price">₹{item.price.toFixed(2)}</p>
                  )}
                  <div className="quantity-badge">
                    Qty: {item.quantity}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary-section">
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="price-row savings">
                  <span>Total Savings</span>
                  <span>-₹{totalSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
            <button className="cart-proceed-btn" onClick={handlePayment}>
              Review Order
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {cartItems.length === 0 && !loading && (
        <div className="cart-empty-state">
          <div className="empty-cart-animation">
            <div className="empty-cart-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.707 15.293C4.077 15.923 4.523 17 5.414 17H17M17 17C15.895 17 15 17.895 15 19C15 20.105 15.895 21 17 21C18.105 21 19 20.105 19 19C19 17.895 18.105 17 17 17ZM9 19C9 20.105 8.105 21 7 21C5.895 21 5 20.105 5 19C5 17.895 5.895 17 7 17C8.105 17 9 17.895 9 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h3 className="cart-empty-title">Your cart is empty</h3>
          <p className="cart-empty-message">
            Looks like you haven't added anything to your cart yet
          </p>
          <button className="cart-explore-btn" onClick={() => navigate("/")}>
            Explore Home Kitchens
          </button>
        </div>
      )}

      {cartItems.length > 0 && step !== 3 && step !== 2 && (
        <>
          <ul className="cart-items-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item-card">
                <div className="cart-item-image-container">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="cart-item-image" 
                  />
                  {item.buy_one_get_one_free && (
                    <div className="bogo-tag">
                      <Gift size={14} />
                      <span>BOGO</span>
                    </div>
                  )}
                </div>
                <div className="cart-item-details">
                  <div className="cart-item-header">
                    <h3 className="cart-item-title">{item.title}</h3>
                    <button
                      className="cart-action-btn delete"
                      onClick={() => deleteItem(item.id, item.item_id)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {item.hasDiscount ? (
                    <div className="cart-price-container">
                      <span className="cart-original-price">₹{item.originalPrice.toFixed(2)}</span>
                      <span className="cart-discounted-price">₹{item.price.toFixed(2)}</span>
                      <span className="cart-discount-badge">{item.discountPercent}% OFF</span>
                    </div>
                  ) : (
                    <p className="cart-item-price">₹{item.price.toFixed(2)}</p>
                  )}
                  <div className="cart-item-actions">
                    <button
                      className="cart-action-btn decrease"
                      onClick={() => decreaseQuantity(item.id, item.item_id)}
                      disabled={loading || item.quantity <= 1}
                    >
                      <MinusCircle size={20} />
                    </button>
                    <span className="cart-item-quantity">{item.quantity}</span>
                    <button
                      className="cart-action-btn increase"
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
          <div className="cart-summary-section">
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="price-row savings">
                  <span>Total Savings</span>
                  <span>-₹{totalSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="price-row total">
                <span>Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
            <button 
              className="cart-proceed-btn" 
              onClick={handleProceed} 
              disabled={loading}
            >
              {step === 1
                ? "Proceed to Checkout"
                : "Select Delivery Address"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;