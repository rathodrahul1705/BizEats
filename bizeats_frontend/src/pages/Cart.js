import React, { useState } from "react";
import { PlusCircle, MinusCircle, Trash2, CheckCircle } from "lucide-react";
import "../assets/css/Cart.css";
import SignIn from "../components/SignIn";
import AddressSelection from "./AddressSelection";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      title: "Classic Breakfast",
      description: "A delicious morning meal with eggs, toast, and coffee.",
      image: require("../assets/img/breakfast_image.webp"),
      price: 12.99,
      quantity: 1,
    },
    {
      id: 2,
      title: "Healthy Lunch",
      description: "A fresh, healthy mix of greens, grilled chicken, and quinoa.",
      image: require("../assets/img/lunch_image.jpg"),
      price: 15.99,
      quantity: 1,
    },
  ]);
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const navigate = useNavigate();

  // Increase Quantity
  const increaseQuantity = (id) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  // Decrease Quantity
  const decreaseQuantity = (id) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === id && item.quantity > 1
            ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove Item
  const removeItem = (id) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // Calculate Total Price
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Handle Proceed to Next Step
  const handleProceed = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty. Please add items before proceeding.");
      return;
    }
    if (step === 1) {
      if (!isSignedIn) {
        setShowSignIn(true);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (!selectedAddress) {
        alert("Please select or add a new address before proceeding.");
      } else {
        setStep(3);
      }
    }
  };

  // Handle Address Selection
  const handleAddressSelection = (address) => {
    setSelectedAddress(address);
    setStep(3);
  };

  // Handle Payment Process
  const handlePayment = () => {
    // Add your payment processing logic here (e.g., redirect to payment gateway)
    // For example, you might navigate to a payment page:
    navigate("/payments");
  };

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

      {/* Step 1: User Login */}
      {step === 1 && !isSignedIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          onSuccess={() => {
            setIsSignedIn(true);
            setShowSignIn(false);
            setStep(2);
          }}
        />
      )}

      {/* Step 2: Address Selection */}
      {step === 2 && isSignedIn && (
        <AddressSelection onAddressSelect={handleAddressSelection} />
      )}

      {/* Step 3: Payment */}
      {step === 3 && selectedAddress && (
        <div>
          <h3>Order Summary</h3>
          <p>
            <strong>Deliver to:</strong> {selectedAddress}
          </p>
          <ul className="cart-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-image" />
                <div className="cart-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-description">{item.description}</p>
                  <p className="cart-item-price">$ {item.price.toFixed(2)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <div className="total-section">
              <span>Total:</span>
              <span>$ {totalPrice.toFixed(2)}</span>
            </div>
            <button className="proceed-btn" onClick={handlePayment}>Proceed to Payment</button>
          </div>
        </div>
      )}

      {/* Empty Cart Section */}
      {cartItems.length === 0 && (
        <div className="empty-cart">
          <img src={require("../assets/img/empty_cart.webp")} alt="Empty Cart" />
          <h3>Your cart is empty!</h3>
          <p>Looks like you haven't added anything yet. Let's fix that!</p>
          <button
            className="add-items-btn"
            onClick={() => (window.location.href = "/food-list")}
          >
            Add Items
          </button>
        </div>
      )}

      {/* Cart Details Section (Always Visible if cart not empty and not in address or payment step) */}
      {cartItems.length > 0 && step !== 3 && step !== 2 && (
        <>
          <ul className="cart-list">
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <img src={item.image} alt={item.title} className="cart-image" />
                <div className="cart-details">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-description">{item.description}</p>
                  <p className="cart-item-price">$ {item.price.toFixed(2)}</p>
                  <div className="cart-actions">
                    <button className="cart-btn" onClick={() => decreaseQuantity(item.id)}>
                      <MinusCircle size={20} />
                    </button>
                    <span className="cart-quantity">{item.quantity}</span>
                    <button className="cart-btn" onClick={() => increaseQuantity(item.id)}>
                      <PlusCircle size={20} />
                    </button>
                    <button className="cart-remove" onClick={() => removeItem(item.id)}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <div className="total-section">
              <span>Total:</span>
              <span>$ {totalPrice.toFixed(2)}</span>
            </div>
            <button className="proceed-btn" onClick={handleProceed}>
              {step === 1 ? "Proceed to Checkout" : step === 2 ? "Select Address" : "Proceed to Payment"}
            </button>
          </div>
        </>
      )}

      {/* Sign-In Popup */}
      {showSignIn && (
        <SignIn onClose={() => setShowSignIn(false)} onSuccess={() => setIsSignedIn(true)} />
      )}
    </div>
  );
};

export default Cart;
