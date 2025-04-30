import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, MinusCircle, Trash2, CheckCircle, ArrowLeft, User, MapPin, ClipboardCheck } from "lucide-react";
import "../assets/css/Cart.css";
import SignIn from "../components/SignIn";
import AddressSelection from "./AddressSelection";
import { useNavigate } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { getOrCreateSessionId } from "../components/helper/Helper";
import StripeLoader from "../loader/StripeLoader";

const Cart = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const updateCartCount = useCallback(
    (count) => {
      if (count > 0) {
        localStorage.setItem("cart_count", count);
        localStorage.setItem("current_order_restaurant_id", restaurantId);
      } else {
        localStorage.removeItem("cart_count");
        // localStorage.removeItem("current_order_restaurant_id");
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

  const totalPrice = cartItems.reduce((total, item) => total + item.price, 0);

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
      <h2 className="cart-page-title">Secure Checkout</h2>

      <div className="cart-step-indicator">
        <div className={`cart-step ${step >= 1 ? "active" : ""}`}>
          <div className="step-content">
            <span className="step-icon">
              {step > 1 ? <CheckCircle size={18} /> : <User size={18} />}
            </span>
            <span className="step-text">Login</span>
          </div>
        </div>
        <div className={`cart-step ${step >= 2 ? "active" : ""}`}>
          <div className="step-content">
            <span className="step-icon">
              {step > 2 ? <CheckCircle size={18} /> : <MapPin size={18} />}
            </span>
            <span className="step-text">Address</span>
          </div>
        </div>
        <div className={`cart-step ${step >= 3 ? "active" : ""}`}>
          <div className="step-content">
            <span className="step-icon">
              <ClipboardCheck size={18} />
            </span>
            <span className="step-text">Review</span>
          </div>
        </div>
      </div>

      {step > 1 && (
        <button className="cart-navigation-btn back" onClick={handleBack}>
          <ArrowLeft size={20} /> Back
        </button>
      )}

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

      {step === 2 && user && <AddressSelection onAddressSelect={handleAddressSelection} />}

      {step === 3 && userSelectedAddress && (
        <div className="cart-review-container">
          <ul className="cart-items-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-review-item">
                <img src={item.image} alt={item.title} className="cart-review-image" />
                <div className="cart-review-details">
                  <h3 className="cart-review-title">{item.title}</h3>
                  <p className="cart-review-price">₹{item.price}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary-section">
            <div className="cart-total-section">
              <span className="cart_total">Total:</span>
              <span>₹{totalPrice}</span>
            </div>
            <button className="cart-proceed-btn" onClick={handlePayment}>
              Review Order & Confirm
            </button>
          </div>
        </div>
      )}

      {cartItems.length === 0 && !loading && (
        <div className="cart-empty-state">
          <img 
            src={require("../assets/img/empty_cart.webp")} 
            alt="Empty Cart" 
            className="cart-empty-image" 
          />
          <h3 className="cart-empty-title">Your cart's waiting to be filled!</h3>
          <p className="cart-empty-message">
            Check out the homepage for more delicious homemade meals options!
          </p>
          <button className="cart-explore-btn" onClick={() => navigate("/")}>
            Explore home kitchens near you
          </button>
        </div>
      )}

      {cartItems.length > 0 && step !== 3 && step !== 2 && (
        <>
          <ul className="cart-items-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item-card">
                <img src={item.image} alt={item.title} className="cart-item-image" />
                <div className="cart-item-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-price">₹{item.price}</p>
                  <div className="cart-item-actions">
                    <button
                      className="cart-action-btn decrease"
                      onClick={() => decreaseQuantity(item.id, item.item_id)}
                      disabled={loading}
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
                    <button
                      className="cart-action-btn delete"
                      onClick={() => deleteItem(item.id, item.item_id)}
                      disabled={loading}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary-section">
            <div className="cart-total-section">
              <span className="cart_total">Total:</span>
              <span>₹{totalPrice}</span>
            </div>
            <button 
              className="cart-proceed-btn" 
              onClick={handleProceed} 
              disabled={loading}
            >
              {step === 1
                ? "Review Cart & Checkout"
                : step === 2
                ? "Select or Add Address"
                : "Proceed to Payment"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;