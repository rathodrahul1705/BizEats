import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaCreditCard, FaMoneyBillWave } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import "../assets/css/PaymentOption.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const PaymentOption = ({ user }) => {
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
      icon: <FaCreditCard />,
      description: "Pay securely with cards, UPI or netbanking",
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      icon: <FaMoneyBillWave />,
      description: "Pay by cash/UPI when you receive your order",
    },
  ];

  const fetchOrderDetails = async () => {
    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.GET_ORDER_DETAILS, "POST", {
        user_id: user?.user_id || null,
        restaurant_id,
      });

      if (response.status === "success") {
        const { restaurant_details, order_summary } = response;
        setRestaurantOrderDetails({
          restaurant_name: restaurant_details?.restaurant_name || "Unknown Restaurant",
          restaurant_address: restaurant_details?.restaurant_address || "No address",
          customer_address: user_address,
          currency: order_summary?.currency || "INR",
          number_of_items: order_summary?.number_of_items || 0,
          total_amount: order_summary?.total_order_amount || 0,
          delivery_fee: order_summary?.delivery_fee || 0,
          tax_amount: order_summary?.tax_amount || 0,
          user_name: user?.full_name || "Customer",
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  useEffect(() => {
    if (user?.user_id && restaurant_id) {
      fetchOrderDetails();
    }
  }, [user?.user_id, restaurant_id]);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePaymentSuccess = async (paymentData, razorpay_order_id) => {
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
  };

  const handlePaymentFailure = (error) => {
    navigate("/payment/failed", {
      state: {
        error: error.message || "Payment failed",
        orderAmount: restaurantOrderDetails?.total_amount,
        restaurantName: restaurantOrderDetails?.restaurant_name,
        restaurant_id,
        deliveryAddressId: delivery_address_id,
      },
    });
  };

  const storeOrderDetails = async (method = "cod", razorpay_order_id = null, razorpay_payment_id = null) => {
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
    };

    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.UPDATE_ORDER_DETAILS, "POST", orderData);

      if (response.status === "success") {
        return response;
      } else {
        throw new Error(response.message || "Failed to update order details");
      }
    } catch (error) {
      console.error("Error storing order details:", error);
      throw error;
    }
  };

  const updateCartCount = useCallback(() => {
    localStorage.removeItem("cart_count");
    localStorage.removeItem("cart_current_step");
    localStorage.removeItem("user_full_address");
    localStorage.removeItem("current_order_restaurant_id");
    localStorage.removeItem("selected_address");
    window.dispatchEvent(new Event("storage"));
  }, []);

  const initiatePayment = async () => {
    if (!selectedPayment) {
      alert("Please select a payment method");
      return;
    }

    setLoading(true);
    try {
      if (selectedPayment === "cod") {
        setPostPaymentProcessing(true);
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
  };

  const processOnlinePayment = async () => {
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
        key: "rzp_live_mUk0ZYQjZGCxK1",
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
  };

  const handleBack = () => navigate(-1);

  if (!restaurantOrderDetails || postPaymentProcessing) return <StripeLoader />;

  return (
    <div className="payment-page-container">
      <div className="payment-header-container">
        <h1 className="page-title">Payment Details</h1>
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      <div className="payment-container">
        <div className="delivery-route">
          <div className="address-point">
            <div className="point-marker start" />
            <div className="address-details">
              <h3>From</h3>
              <p><strong>{restaurantOrderDetails.restaurant_name}</strong></p>
              <p>{restaurantOrderDetails.restaurant_address}</p>
            </div>
          </div>
          <div className="delivery-line" />
          <div className="address-point">
            <div className="point-marker end" />
            <div className="address-details">
              <h3>To</h3>
              <p><strong>{restaurantOrderDetails.user_name}</strong></p>
              <p>{restaurantOrderDetails.customer_address}</p>
            </div>
          </div>
        </div>

        <div className="order-summary-card">
          <h3>Order Summary</h3>
          <div className="order-details">
            <p><span>⏱</span> Estimated delivery: 30-45 mins</p>
            <p><span>🛒</span> {restaurantOrderDetails.number_of_items} items</p>
            {restaurantOrderDetails.delivery_fee > 0 && (
              <p><span>🚚</span> Delivery fee: ₹{restaurantOrderDetails.delivery_fee}</p>
            )}
            {restaurantOrderDetails.tax_amount > 0 && (
              <p><span>🧾</span> Tax: ₹{restaurantOrderDetails.tax_amount}</p>
            )}
            <p className="order-total">
              <span>Total:</span> ₹{restaurantOrderDetails.total_amount}
            </p>
          </div>
        </div>

        <div className="payment-methods-section">
          <h2>Select Payment Method</h2>
          <div className="payment-methods-grid">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`payment-method-card ${selectedPayment === method.id ? "selected" : ""}`}
                onClick={() => setSelectedPayment(method.id)}
              >
                <div className="method-icon">{method.icon}</div>
                <div className="method-info">
                  <h4>{method.name}</h4>
                  <p>{method.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-actions">
          <button
            className={`payment-button ${loading ? "processing" : ""}`}
            onClick={initiatePayment}
            disabled={!selectedPayment || loading}
          >
            {loading ? (
              <>
                <span className="payment_spinner" />
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
