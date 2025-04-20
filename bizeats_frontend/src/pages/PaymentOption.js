import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaCreditCard, FaMoneyBillWave, FaStore, FaUser } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import "../assets/css/PaymentOption.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const PaymentOption = ({ user }) => {
  const razorpay_api_key = process.env.REACT_APP_RAZORPAY_API_KEY;
  const { restaurant_id } = useParams();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [restaurantOrderDetails, setRestaurantOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [postPaymentProcessing, setPostPaymentProcessing] = useState(false);
  const navigate = useNavigate();

  const user_address = localStorage.getItem("user_full_address") || "No address found";
  const delivery_address_id = localStorage.getItem("selected_address");

  const paymentMethods = [
    {
      id: "online",
      name: "Online Payment",
      icon: <FaCreditCard className="payment-option-payment-icon" />,
      description: "Pay securely with cards, UPI or netbanking",
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      icon: <FaMoneyBillWave className="payment-option-payment-icon" />,
      description: "Pay by cash/UPI when you receive your order",
    },
  ];

  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.GET_ORDER_DETAILS, "POST", {
        user_id: user?.user_id || null,
        restaurant_id,
      });

      if (response.status === "success") {
        const { restaurant_details, order_summary } = response;
        const itemTotal = order_summary?.total_order_amount || 0;
        const deliveryFee = itemTotal > 100 ? 0 : 20;
        const taxAmount = order_summary?.tax_amount || 0;
        const discount = Math.round((itemTotal + deliveryFee + taxAmount) * 0.10);
        const totalPayable = itemTotal + deliveryFee + taxAmount - discount;
      
        setRestaurantOrderDetails({
          restaurant_name: restaurant_details?.restaurant_name || "Unknown Restaurant",
          restaurant_address: restaurant_details?.restaurant_address || "No address",
          customer_address: user_address,
          currency: order_summary?.currency || "INR",
          number_of_items: order_summary?.number_of_items || 0,
          item_total: itemTotal,
          delivery_fee: deliveryFee,
          tax_amount: taxAmount,
          discount,
          total_amount: totalPayable,
          user_name: user?.full_name || "Customer",
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  }, [user?.user_id, restaurant_id, user_address]);

  useEffect(() => {
    if (user?.user_id && restaurant_id) {
      fetchOrderDetails();
    }
  }, [user?.user_id, restaurant_id, fetchOrderDetails]);

  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const handlePaymentSuccess = useCallback(async (paymentData, razorpay_order_id) => {
    try {
      setPostPaymentProcessing(true);
      const storedOrder = await storeOrderDetails("online", razorpay_order_id, paymentData.razorpay_payment_id);
      if (storedOrder) {
        updateCartCount();
        navigate("/payment/success", {
          state: {
            paymentId: paymentData.razorpay_payment_id,
            eatoor_order_id: storedOrder.order_id,
            eatoor_order_number: storedOrder.order_number,
            orderId: razorpay_order_id,
            razorpay_signature: paymentData.razorpay_signature,
            amount: restaurantOrderDetails.total_amount,
            restaurantName: restaurantOrderDetails.restaurant_name,
            restaurant_id,
            paymentMethod: "online",
            deliveryAddressId: delivery_address_id,
          },
        });
      }
    } catch (error) {
      console.error("Order saving failed after payment:", error);
    } finally {
      setPostPaymentProcessing(false);
    }
  }, [navigate, restaurantOrderDetails, restaurant_id, delivery_address_id]);

  const handlePaymentFailure = useCallback((error) => {
    navigate("/payment/failed", {
      state: {
        error: error.message || "Payment failed",
        orderAmount: restaurantOrderDetails?.total_amount,
        restaurantName: restaurantOrderDetails?.restaurant_name,
        restaurant_id,
        deliveryAddressId: delivery_address_id,
      },
    });
  }, [navigate, restaurantOrderDetails, restaurant_id, delivery_address_id]);

  const storeOrderDetails = useCallback(async (method = "cod", razorpay_order_id = null, razorpay_payment_id = null) => {
    const payment_method = method === "cod" ? 5 : 1;
    const orderData = {
      user_id: user?.user_id,
      restaurant_id,
      payment_method,
      delivery_address_id,
      is_takeaway: false,
      special_instructions: "Less spicy please",
      razorpay_order_id,
      razorpay_payment_id,
      delivery_fee: restaurantOrderDetails.delivery_fee, // Added delivery_fee here
    };

    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.UPDATE_ORDER_DETAILS, "POST", orderData);
      if (response.status === "success") {
        return response;
      }
      throw new Error(response.message || "Failed to update order details");
    } catch (error) {
      console.error("Error storing order details:", error);
      throw error;
    }
  }, [user?.user_id, restaurant_id, delivery_address_id, restaurantOrderDetails]);

  const updateCartCount = useCallback(() => {
    localStorage.removeItem("cart_count");
    localStorage.removeItem("cart_current_step");
    localStorage.removeItem("user_full_address");
    localStorage.removeItem("current_order_restaurant_id");
    localStorage.removeItem("selected_address");
    window.dispatchEvent(new Event("storage"));
  }, []);

  const initiatePayment = useCallback(async () => {
    if (!selectedPayment) {
      alert("Please select a payment method");
      return;
    }

    setLoading(true);
    try {
      if (selectedPayment === "cod") {
        await storeOrderDetails("cod");
        updateCartCount();
        navigate("/order-confirmation", {
          state: {
            paymentMethod: "Cash on Delivery",
            amount: restaurantOrderDetails.total_amount,
            restaurantName: restaurantOrderDetails.restaurant_name,
            restaurant_id,
            deliveryAddressId: delivery_address_id,
          },
        });
      } else {
        await processOnlinePayment();
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPayment, storeOrderDetails, updateCartCount, navigate, restaurantOrderDetails, restaurant_id, delivery_address_id]);

  const processOnlinePayment = useCallback(async () => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error("Failed to load Razorpay SDK");

      const orderRes = await fetch(API_ENDPOINTS.PAYMENT.CREATE_ORDER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: restaurantOrderDetails.total_amount,
          currency: "INR",
          receipt: `order_rcptid_${Date.now()}`,
          notes: {
            userId: user?.user_id,
            restaurantId: restaurant_id,
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.message || "Payment order creation failed");
      }

      const orderData = await orderRes.json();

      const options = {
        key: razorpay_api_key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eatoor",
        description: `Order from ${restaurantOrderDetails.restaurant_name}`,
        order_id: orderData.id,
        image: "https://www.eatoor.com/eatoormob.svg",
        handler: (response) => handlePaymentSuccess(response, orderData.id),
        prefill: {
          name: user?.full_name,
          email: user?.email,
          contact: user?.contact_number,
        },
        theme: {
          color: "#e65c00",
        },
        modal: {
          ondismiss: () => handlePaymentFailure(new Error("Payment cancelled")),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      handlePaymentFailure(err);
    }
  }, [loadRazorpayScript, restaurantOrderDetails, razorpay_api_key, user, restaurant_id, handlePaymentSuccess, handlePaymentFailure]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  if (!restaurantOrderDetails) return <StripeLoader />;

  return (
    <div className="payment-option-container">
      {postPaymentProcessing && (
        <div className="payment-option-overlay-loader">
          <div className="payment-option-verifying-box">
            <div className="payment-option-verify-spinner" />
            <p>Payment Verifying...</p>
          </div>
        </div>
      )}

    <div className="payment-option-header-wrapper">
        <h1 className="payment-option-page-title">Payment Details</h1>
        <button className="payment-option-back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      <div className="payment-option-content">
        <div className="payment-option-delivery-route">
          <div className="payment-option-address-point">
            <div className="payment-option-point-icon">
              <FaStore className="payment-option-store-icon" />
            </div>
            <div className="payment-option-address-details">
              <h3>From</h3>
              <p><strong>{restaurantOrderDetails.restaurant_name}</strong></p>
              <p>{restaurantOrderDetails.restaurant_address}</p>
            </div>
          </div>
          <div className="payment-option-delivery-line" />
          <div className="payment-option-address-point">
            <div className="payment-option-point-icon">
              <FaUser className="payment-option-user-icon" />
            </div>
            <div className="payment-option-address-details">
              <h3>To</h3>
              <p><strong>{restaurantOrderDetails.user_name}</strong></p>
              <p>{restaurantOrderDetails.customer_address}</p>
            </div>
          </div>
        </div>

        <div className="payment-option-order-summary-card">
          <h3>Order Summary</h3>
          <div className="payment-option-order-details">
            <div className="payment-option-order-item">
              <span className="payment-option-item-icon">🛒</span>
              <span className="payment-option-item-label">{restaurantOrderDetails.number_of_items} items</span>
            </div>
            <div className="payment-option-order-item">
              <span className="payment-option-item-icon">📦</span>
              <span className="payment-option-item-label">Item Total:</span>
              <span className="payment-option-item-value">₹{restaurantOrderDetails.item_total}</span>
            </div>
            <div className="payment-option-order-item">
              <span className="payment-option-item-icon">🏍️</span>
              <span className="payment-option-item-label">Delivery Fee:</span>
              <span className="payment-option-item-value">₹{restaurantOrderDetails.delivery_fee}</span>
            </div>
            {restaurantOrderDetails.tax_amount > 0 && (
              <div className="payment-option-order-item">
                <span className="payment-option-item-icon">🧾</span>
                <span className="payment-option-item-label">Tax:</span>
                <span className="payment-option-item-value">₹{restaurantOrderDetails.tax_amount}</span>
              </div>
            )}
            <div className="payment-option-order-item discount">
              <span className="payment-option-item-icon">🎁</span>
              <span className="payment-option-item-label">Discount (10%):</span>
              <span className="payment-option-item-value">- ₹{restaurantOrderDetails.discount}</span>
            </div>
            <div className="payment-option-order-total">
              <span className="payment-option-total-label">Total Payable:</span>
              <span className="payment-option-total-value">₹{restaurantOrderDetails.total_amount}</span>
            </div>
          </div>
        </div>

        <div className="payment-option-methods-section">
          <h2>Select Payment Method</h2>
          <div className="payment-option-methods-grid">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`payment-option-method-card ${selectedPayment === method.id ? "selected" : ""}`}
                onClick={() => setSelectedPayment(method.id)}
              >
                <div className="payment-option-method-icon">{method.icon}</div>
                <div className="payment-option-method-info">
                  <h4>{method.name}</h4>
                  <p>{method.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-option-actions">
          <button
            className={`payment-option-button ${loading ? "processing" : ""}`}
            onClick={initiatePayment}
            disabled={!selectedPayment || loading}
          >
            {loading ? (
              <>
                <span className="payment-option-spinner" />
                Processing...
              </>
            ) : selectedPayment === "cod" ? (
              "Place Order (Cash on Delivery)"
            ) : (
              "Proceed to Online Payment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentOption;