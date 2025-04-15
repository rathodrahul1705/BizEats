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
  const navigate = useNavigate();
  let user_address = localStorage.getItem("user_full_address");
  let delivery_address_id = localStorage.getItem("selected_address");

  const paymentMethods = [
    { 
      id: "online", 
      name: "Online Payment", 
      icon: <FaCreditCard />, 
      description: "Pay securely with cards, UPI or netbanking" 
    },
    { 
      id: "cod", 
      name: "Cash on Delivery", 
      icon: <FaMoneyBillWave />, 
      description: "Pay by cash/UPI when you receive your order" 
    },
  ];

  const fetchOrderDetails = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.ORDER.GET_ORDER_DETAILS,
        "POST",
        {
          user_id: user?.user_id || null,
          restaurant_id: restaurant_id,
        }
      );

      if (response.status === "success") {
        setRestaurantOrderDetails({
          restaurant_name: response?.restaurant_details?.restaurant_name,
          restaurant_address: response?.restaurant_details?.restaurant_address,
          customer_address: user_address || "No delivery address provided",
          currency: response?.order_summary?.currency,
          number_of_items: response.order_summary.number_of_items,
          total_amount: response.order_summary.total_order_amount,
          delivery_fee: response.order_summary.delivery_fee || 0,
          tax_amount: response.order_summary.tax_amount || 0,
          user_name: user?.full_name
        });
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [user?.user_id, restaurant_id]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentSuccess = (paymentData) => {
    navigate('/payment/success', {
      state: {
        paymentId: paymentData.razorpay_payment_id,
        orderId: paymentData.razorpay_order_id,
        amount: restaurantOrderDetails.total_amount,
        restaurantName: restaurantOrderDetails.restaurant_name,
        restaurant_id: restaurant_id,
        paymentMethod: 'online',
        deliveryAddressId: delivery_address_id,
      }
    });

  };

  const handlePaymentFailure = (error) => {
    console.error('Payment failed:', error);
    navigate('/payment/failed', {
      state: {
        error: error.message || 'Payment failed',
        orderAmount: restaurantOrderDetails.total_amount,
        restaurantName: restaurantOrderDetails.restaurant_name,
        restaurant_id: restaurant_id,
        deliveryAddressId: delivery_address_id,
      }
    });
  };

  const storeOrderDetails = async () => {

    let payment_method = 1
    if(selectedPayment == "cod"){
      payment_method = 5
    }
    const orderData = {
      user_id: user?.user_id,
      restaurant_id: restaurant_id,
      payment_method: payment_method,
      delivery_address_id: delivery_address_id,
      is_takeaway: false,
      special_instructions: "Less spicy please"
    };

    try {
      const response = await fetchData(
        API_ENDPOINTS.ORDER.UPDATE_ORDER_DETAILS,
        "POST",
        orderData
      );
  
      if (response.status === "success") {
        console.log("Order details updated successfully:", response.data);
        return response.data;
      } else {
        console.error("Failed to update order details:", response.message);
        throw new Error(response.message || "Failed to update order details");
      }
    } catch (error) {
      console.error("Error updating order details:", error);
      throw error;
    }
  };

  const updateCartCount = useCallback((count) => {
      localStorage.removeItem("cart_count");
      localStorage.removeItem("cart_current_step");
      localStorage.removeItem("user_full_address");
      localStorage.removeItem("current_order_restaurant_id");
      localStorage.removeItem("selected_address");
      window.dispatchEvent(new Event("storage"));
  }, []);

  const initiatePayment = async () => {
    if (!selectedPayment) {
      alert('Please select a payment method');
      return;
    }
    
    if (selectedPayment === 'cod') {
      let response_data = storeOrderDetails()
      if(response_data){
        updateCartCount(0)
        navigate('/order-confirmation', {
          state: {
            paymentMethod: 'Cash on Delivery',
            amount: restaurantOrderDetails.total_amount,
            restaurantName: restaurantOrderDetails.restaurant_name,
            restaurant_id: restaurant_id,
            deliveryAddressId: delivery_address_id,
          }
        });
      }

    } else {
      await processOnlinePayment();
    }

  };

  const processOnlinePayment = async () => {
    setLoading(true);
    
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Payment gateway failed to load. Please check your internet connection.');
      }
      
      const orderResponse = await fetch(API_ENDPOINTS.PAYMENT.CREATE_ORDER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: restaurantOrderDetails.total_amount * 100, // Convert to paise
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          notes: {
            userId: user?.user_id,
            restaurantId: restaurant_id
          }
        })
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }
      
      const orderData = await orderResponse.json();
      
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_Ler2HqmO4lVND1',
        amount: orderData.amount.toString(),
        currency: orderData.currency,
        name: 'Eatoor',
        description: `Order from ${restaurantOrderDetails.restaurant_name}`,
        order_id: orderData.id,
        handler: handlePaymentSuccess,
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: user?.contact_number || ''
        },
        theme: {
          color: '#3399cc'
        },
        modal: {
          ondismiss: () => {
            handlePaymentFailure(new Error('Payment cancelled by user'));
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      handlePaymentFailure(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigate(-1);

  if (!restaurantOrderDetails) {
    return <StripeLoader />;
  }

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
            <div className="point-marker start"></div>
            <div className="address-details">
              <h3>From</h3>
              <p><strong>{restaurantOrderDetails.restaurant_name}</strong></p>
              <p>{restaurantOrderDetails.restaurant_address}</p>
            </div>
          </div>
          
          <div className="delivery-line"></div>
          
          <div className="address-point">
            <div className="point-marker end"></div>
            <div className="address-details">
              <h3>To</h3>
              <p><strong>{restaurantOrderDetails?.user_name}</strong></p>
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
                className={`payment-method-card ${selectedPayment === method.id ? 'selected' : ''}`}
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
            className={`payment-button ${loading ? 'processing' : ''}`}
            onClick={initiatePayment}
            disabled={!selectedPayment || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : selectedPayment === 'cod' ? (
              'Place Order (Cash on Delivery)'
            ) : (
              'Proceed to Online Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentOption;