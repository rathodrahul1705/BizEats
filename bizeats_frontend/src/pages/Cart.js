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

const CartOrder = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const sessionId = getOrCreateSessionId();
  const restaurantId = localStorage.getItem("current_order_restaurant_id");

  const [step, setStep] = useState(() => {
    return parseInt(localStorage.getItem("cart_order_current_step")) || 1;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    localStorage.setItem("cart_order_current_step", step.toString());
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

  const calculateDeliveryFee = () => {
    return subtotal > 200 ? 0 : 40;
  };

  const subtotal = calculateSubtotal();
  const totalSavings = calculateTotalSavings();
  const deliveryFee = calculateDeliveryFee();
  const total = subtotal + deliveryFee;

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
    } else {
      handleBackToRestaurant();
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
    setUserSelectedAddress(selectedFullAddress);
    setStep(3);
  };

  const handlePayment = () => navigate(`/payments/${restaurantId}`);

  if (loading && cartItems.length === 0) {
    return <StripeLoader />;
  }

  if (error && cartItems.length === 0) {
    return (
      <div className="cart-order-error-container">
        <p className="cart-order-error-message">{error}</p>
        <button className="cart-order-retry-btn" onClick={fetchCartData}>
          Retry
        </button>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <ul className="cart-order-items-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-order-item-card">
                  <div className="cart-order-item-image-container">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="cart-order-item-image" 
                      loading="lazy"
                    />
                    {item.buy_one_get_one_free && (
                      <div className="cart-order-bogo-tag">
                        <Gift size={14} />
                        <span>BOGO</span>
                      </div>
                    )}
                  </div>
                  <div className="cart-order-item-details">
                    <div className="cart-order-item-header">
                      <h3 className="cart-order-item-title">{item.title}</h3>
                      <button
                        className="cart-order-action-btn delete"
                        onClick={() => deleteItem(item.id, item.item_id)}
                        disabled={loading}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {item.hasDiscount ? (
                      <div className="cart-order-price-container">
                        <span className="cart-order-original-price">₹{item.originalPrice.toFixed(2)}</span>
                        <span className="cart-order-discounted-price">₹{item.price.toFixed(2)}</span>
                        <span className="cart-order-discount-badge">{item.discountPercent}% OFF</span>
                      </div>
                    ) : (
                      <p className="cart-order-item-price">₹{item.price.toFixed(2)}</p>
                    )}
                    <div className="cart-order-item-actions">
                      <button
                        className="cart-order-action-btn decrease"
                        onClick={() => decreaseQuantity(item.id, item.item_id)}
                        disabled={loading || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <MinusCircle size={20} />
                      </button>
                      <span className="cart-order-item-quantity">{item.quantity}</span>
                      <button
                        className="cart-order-action-btn increase"
                        onClick={() => increaseQuantity(item.id, item.item_id)}
                        disabled={loading}
                        aria-label="Increase quantity"
                      >
                        <PlusCircle size={20} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-order-summary-section">
              <div className="cart-order-price-breakdown">
                <div className="cart-order-price-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="cart-order-price-row savings">
                    <span>Total Savings</span>
                    <span>-₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}
                {/* <div className="cart-order-price-row">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}</span>
                </div> */}
                <div className="cart-order-price-row total">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                {/* {deliveryFee > 0 && subtotal < 200 && (
                  <div className="cart-order-delivery-message">
                    Add ₹{(200 - subtotal).toFixed(2)} more to get FREE delivery
                  </div>
                )} */}
              </div>
              <button 
                className="cart-order-proceed-btn" 
                onClick={handleProceed} 
                disabled={loading}
              >
                {user ? "Select Delivery Address" : "Proceed to Checkout"}
              </button>
            </div>
          </>
        );
      case 2:
        return <AddressSelection onAddressSelect={handleAddressSelection} />;
      case 3:
        return (
          <div className="cart-order-review-container">
            {/* <div className="cart-order-delivery-info">
              <MapPin size={18} />
              <div>
                <p className="cart-order-delivery-address">{userSelectedAddress}</p>
                <p className="cart-order-delivery-time">Estimated delivery: {cartItems[0]?.deliveryTime || "30-40 min"}</p>
              </div>
            </div> */}
            <ul className="cart-order-items-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-order-item-card">
                  <div className="cart-order-item-image-container">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="cart-order-item-image" 
                      loading="lazy"
                    />
                    {item.buy_one_get_one_free && (
                      <div className="cart-order-bogo-tag">
                        <Gift size={14} />
                        <span>BOGO</span>
                      </div>
                    )}
                  </div>
                  <div className="cart-order-item-details">
                    <h3 className="cart-order-item-title">{item.title}</h3>
                    {item.hasDiscount ? (
                      <div className="cart-order-price-container">
                        <span className="cart-order-original-price">₹{item.originalPrice.toFixed(2)}</span>
                        <span className="cart-order-discounted-price">₹{item.price.toFixed(2)}</span>
                        <span className="cart-order-discount-badge">{item.discountPercent}% OFF</span>
                      </div>
                    ) : (
                      <p className="cart-order-item-price">₹{item.price.toFixed(2)}</p>
                    )}
                    <div className="cart-order-quantity-badge">
                      Qty: {item.quantity}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-order-summary-section">
              <div className="cart-order-price-breakdown">
                <div className="cart-order-price-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="cart-order-price-row savings">
                    <span>Total Savings</span>
                    <span>-₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}
                {/* <div className="cart-order-price-row">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}</span>
                </div> */}
                <div className="cart-order-price-row total">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <button className="cart-order-proceed-btn" onClick={handlePayment}>
                {isMobile ? "Continue" : "Proceed to Payment"}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="cart-order">
      <Confetti active={confetti} config={{ elementCount: 50, spread: 70 }} />
      
      <div className="cart-order-header">
        <div className="cart-order-header-content">
          {(step > 1 || cartItems.length > 0) && (
            <button 
              className="cart-order-navigation-btn back" 
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="cart-order-title">Your Cart</h2>
        </div>
        
        {cartItems.length > 0 && (
          <div className="cart-order-step-indicator">
            <div className={`cart-order-step ${step >= 1 ? "active" : ""}`}>
              <div className="cart-order-step-content">
                <span className="cart-order-step-icon">
                  {step > 1 ? <CheckCircle size={18} /> : <User size={18} />}
                </span>
                {!isMobile && <span className="cart-order-step-text">Login</span>}
              </div>
            </div>
            <div className="cart-order-step-connector"></div>
            <div className={`cart-order-step ${step >= 2 ? "active" : ""}`}>
              <div className="cart-order-step-content">
                <span className="cart-order-step-icon">
                  {step > 2 ? <CheckCircle size={18} /> : <MapPin size={18} />}
                </span>
                {!isMobile && <span className="cart-order-step-text">Address</span>}
              </div>
            </div>
            <div className="cart-order-step-connector"></div>
            <div className={`cart-order-step ${step >= 3 ? "active" : ""}`}>
              <div className="cart-order-step-content">
                <span className="cart-order-step-icon">
                  <ClipboardCheck size={18} />
                </span>
                {!isMobile && <span className="cart-order-step-text">Review</span>}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {step === 1 && !user && showSignIn && (
        <div className="cart-order-signin-modal-overlay">
          <div className="cart-order-signin-modal">
            <button 
              className="cart-order-close-modal" 
              onClick={() => setShowSignIn(false)}
              aria-label="Close sign in modal"
            >
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

      {cartItems.length === 0 && !loading ? (
        <div className="cart-order-empty-state">
          <div className="cart-order-empty-animation">
            <div className="cart-order-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.707 15.293C4.077 15.923 4.523 17 5.414 17H17M17 17C15.895 17 15 17.895 15 19C15 20.105 15.895 21 17 21C18.105 21 19 20.105 19 19C19 17.895 18.105 17 17 17ZM9 19C9 20.105 8.105 21 7 21C5.895 21 5 20.105 5 19C5 17.895 5.895 17 7 17C8.105 17 9 17.895 9 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h3 className="cart-order-empty-title">Your cart is empty</h3>
          <p className="cart-order-empty-message">
            Looks like you haven't added anything to your cart yet
          </p>
          <button className="cart-order-explore-btn" onClick={() => navigate("/")}>
            Explore Home Kitchens
          </button>
        </div>
      ) : renderStepContent()}
    </div>
  );
};

export default CartOrder;