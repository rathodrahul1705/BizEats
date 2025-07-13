import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaCreditCard, FaMoneyBillWave, FaStore, FaUser, FaTag } from "react-icons/fa";
import { ArrowLeft } from "lucide-react";
import "../assets/css/PaymentOption.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const PaymentOption = ({ user }) => {
  const razorpay_api_key = process.env.REACT_APP_RAZORPAY_API_KEY;
  const { restaurant_id } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [restaurantOrderDetails, setRestaurantOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [postPaymentProcessing, setPostPaymentProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const navigate = useNavigate();

  const user_address = localStorage.getItem("user_full_address") || "No address found";
  const delivery_address_id = localStorage.getItem("selected_address");

  const MINIMUM_ORDER_AMOUNT = 50; // Minimum order amount constant

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

  const calculateOrderTotals = useCallback((baseOrder, coupon = null) => {
    if (!baseOrder || !baseOrder.order_summary) {
      throw new Error("Invalid order data");
    }

    const itemTotal = baseOrder.order_summary.total_order_amount || 0;
    const deliveryFee = baseOrder.estimated_delivery_cost < 20 ? 30 : baseOrder.estimated_delivery_cost;
    const taxAmount = baseOrder.order_summary.tax_amount || 0;
    
    let discountAmount = 0;
    if (coupon) {
      discountAmount = Math.min(coupon.discount_amount, itemTotal);
    }
    
    const totalPayable = itemTotal + deliveryFee + taxAmount - discountAmount;
    
    return {
      restaurant_name: baseOrder.restaurant_details?.restaurant_name || "Unknown Restaurant",
      restaurant_address: baseOrder.restaurant_details?.restaurant_address || "No address",
      customer_address: user_address,
      currency: baseOrder.order_summary?.currency || "INR",
      number_of_items: baseOrder.order_summary?.number_of_items || 0,
      item_total: itemTotal,
      delivery_fee: deliveryFee,
      distance_km: baseOrder.distance_km,
      tax_amount: taxAmount,
      discount: discountAmount,
      total_amount: totalPayable,
      user_name: user?.full_name || "Customer",
    };
  }, [user_address, user]);

  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.GET_ORDER_DETAILS, "POST", {
        user_id: user?.user_id || null,
        restaurant_id,
        delivery_address_id
      });

      if (response.status === "success") {
        const orderTotals = calculateOrderTotals(response, appliedCoupon);
        setRestaurantOrderDetails(orderTotals);
      } else {
        throw new Error(response.message || "Failed to fetch order details");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setRestaurantOrderDetails(null);
    }
  }, [user?.user_id, restaurant_id, delivery_address_id, calculateOrderTotals, appliedCoupon]);

  useEffect(() => {
    if (user?.user_id && restaurant_id) {
      fetchOrderDetails();
    }
  }, [user?.user_id, restaurant_id, fetchOrderDetails]);

  const validateCouponCode = (code) => {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return { valid: false, error: "Please enter a valid coupon code" };
    }
    if (code.length > 20) {
      return { valid: false, error: "Coupon code is too long" };
    }
    return { valid: true };
  };

  const applyCoupon = useCallback(async () => {
    const validation = validateCouponCode(couponCode);
    if (!validation.valid) {
      setCouponError(validation.error);
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError("");

    try {
      const response = await fetchData(API_ENDPOINTS.ORDER.VALIDATE_COUPEN, "POST", {
        code: couponCode.trim(),
        user_id: user?.user_id || null,
        restaurant_id,
        order_amount: restaurantOrderDetails?.item_total || 0,
      });

      if (response?.status === "success") {
        const { discount_amount, final_total_amount, message, code: couponCodeFromResponse } = response;
        
        if (typeof discount_amount !== "number" || discount_amount < 0) {
          throw new Error("Invalid discount amount received");
        }

        const newCoupon = {
          code: couponCodeFromResponse || couponCode.trim(),
          discount_amount,
          final_total_amount: final_total_amount || 0,
          message: message || "Coupon applied successfully",
        };

        setAppliedCoupon(newCoupon);
        setCouponError("");
        setShowCouponInput(false);
      } else {
        const errorMessage = response?.message || 
                           response?.error?.message || 
                           "Invalid coupon code or not applicable";
        setCouponError(errorMessage);
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError(error.message || "Failed to apply coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, user?.user_id, restaurant_id, restaurantOrderDetails, fetchOrderDetails]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  }, [fetchOrderDetails]);

  const toggleCouponInput = useCallback(() => {
    setShowCouponInput(prev => !prev);
    setCouponError("");
    if (showCouponInput) {
      setCouponCode("");
    }
  }, [showCouponInput]);

  const loadRazorpayScript = useCallback(() => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      
      script.onload = () => {
        if (window.Razorpay) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      script.onerror = () => {
        console.error("Failed to load Razorpay script");
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  }, []);

  const validatePaymentData = (paymentData, razorpay_order_id) => {
    if (!paymentData.razorpay_payment_id || !paymentData.razorpay_signature) {
      throw new Error("Invalid payment response data");
    }
    if (!razorpay_order_id) {
      throw new Error("Missing Razorpay order ID");
    }
  };

  const handlePaymentSuccess = useCallback(async (paymentData, razorpay_order_id) => {
    try {
      validatePaymentData(paymentData, razorpay_order_id);
      
      setPostPaymentProcessing(true);
      const storedOrder = await storeOrderDetails("online", razorpay_order_id, paymentData.razorpay_payment_id);
      
      if (!storedOrder?.order_id) {
        throw new Error("Failed to store order details");
      }

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
          payment_type: 2,
          deliveryAddressId: delivery_address_id,
          couponCode: appliedCoupon?.code || null,
        },
      });
    } catch (error) {
      console.error("Order saving failed after payment:", error);
      navigate("/payment/failed", {
        state: {
          error: error.message || "Payment verification failed",
          orderAmount: restaurantOrderDetails?.total_amount,
          restaurantName: restaurantOrderDetails?.restaurant_name,
          restaurant_id,
          deliveryAddressId: delivery_address_id,
          couponCode: appliedCoupon?.code || null,
        },
      });
    } finally {
      setPostPaymentProcessing(false);
    }
  }, [navigate, restaurantOrderDetails, restaurant_id, delivery_address_id, appliedCoupon]);

  const handlePaymentFailure = useCallback((error) => {
    navigate("/payment/failed", {
      state: {
        error: error.message || "Payment failed",
        orderAmount: restaurantOrderDetails?.total_amount,
        restaurantName: restaurantOrderDetails?.restaurant_name,
        restaurant_id,
        deliveryAddressId: delivery_address_id,
        couponCode: appliedCoupon?.code || null,
      },
    });
  }, [navigate, restaurantOrderDetails, restaurant_id, delivery_address_id, appliedCoupon]);

  const validateOrderData = (orderData) => {
    if (!orderData.user_id) throw new Error("User ID is required");
    if (!orderData.restaurant_id) throw new Error("Restaurant ID is required");
    if (!orderData.delivery_address_id) throw new Error("Delivery address is required");
    if (isNaN(orderData.total_amount)) throw new Error("Invalid total amount");
  };

  const storeOrderDetails = useCallback(async (method = "cod", razorpay_order_id = null, razorpay_payment_id = null) => {
    try {
      if (!restaurantOrderDetails) {
        throw new Error("Order details not loaded");
      }

      const payment_type = method === "cod" ? 1 : 2;
      const orderData = {
        user_id: user?.user_id,
        restaurant_id,
        payment_method: 5,
        payment_type,
        delivery_address_id,
        is_takeaway: false,
        special_instructions: "Less spicy please",
        razorpay_order_id,
        razorpay_payment_id,
        delivery_fee: restaurantOrderDetails.delivery_fee,
        total_amount: restaurantOrderDetails.total_amount,
        code: appliedCoupon?.code || null,
        discount_amount: appliedCoupon?.discount_amount || 0,
      };

      validateOrderData(orderData);

      const response = await fetchData(API_ENDPOINTS.ORDER.UPDATE_ORDER_DETAILS, "POST", orderData);
      
      if (response.status !== "success") {
        throw new Error(response.message || "Failed to update order details");
      }

      return response;
    } catch (error) {
      console.error("Error storing order details:", error);
      throw error;
    }
  }, [user?.user_id, restaurant_id, delivery_address_id, restaurantOrderDetails, appliedCoupon]);

  const updateCartCount = useCallback(() => {
    try {
      localStorage.removeItem("cart_count");
      localStorage.removeItem("cart_current_step");
      localStorage.removeItem("user_full_address");
      localStorage.removeItem("selected_address");
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error updating cart count:", error);
    }
  }, []);

  const validatePaymentSelection = () => {
    if (!selectedPayment) {
      throw new Error("Please select a payment method");
    }
    if (!restaurantOrderDetails) {
      throw new Error("Order details not loaded");
    }
  };

  const validateMinimumOrderAmount = () => {
    if (restaurantOrderDetails?.item_total < MINIMUM_ORDER_AMOUNT) {
      throw new setIsOpen(true)
    }
  };

  const initiatePayment = useCallback(async () => {
    try {
      validatePaymentSelection();
      validateMinimumOrderAmount(); // Validate minimum order amount
      setLoading(true);

      if (selectedPayment === "cod") {
        const storedOrder = await storeOrderDetails("cod");
        
        if (!storedOrder?.order_number) {
          throw new Error("Failed to create COD order");
        }

        updateCartCount();
        
        navigate("/order-confirmation", {
          state: {
            paymentMethod: "Cash on Delivery",
            amount: restaurantOrderDetails.total_amount,
            order_number: storedOrder.order_number,
            restaurantName: restaurantOrderDetails.restaurant_name,
            restaurant_id,
            deliveryAddressId: delivery_address_id,
            couponCode: appliedCoupon?.code || null,
          },
        });
      } else {
        await processOnlinePayment();
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      setCouponError(error.message); // Show error in the coupon error section
    } finally {
      setLoading(false);
    }
  }, [selectedPayment, storeOrderDetails, updateCartCount, navigate, restaurantOrderDetails, restaurant_id, delivery_address_id, appliedCoupon]);

  const validateOrderAmount = (amount) => {
    if (!amount || isNaN(amount) || amount < 1) {
      throw new Error("Invalid order amount");
    }
  };

  const processOnlinePayment = useCallback(async () => {
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) throw new Error("Failed to load Razorpay SDK");
      
      validateOrderAmount(restaurantOrderDetails?.total_amount);

      const amount = Math.round(restaurantOrderDetails.total_amount * 100);
      const accessToken = localStorage.getItem("access");
      
      const orderRes = await fetch(API_ENDPOINTS.PAYMENT.CREATE_ORDER, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `order_rcptid_${Date.now()}`,
          notes: {
            userId: user?.user_id,
            restaurantId: restaurant_id,
            couponCode: appliedCoupon?.code || null,
          },
        }),
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Payment order creation failed");
      }

      const orderData = await orderRes.json();

      if (!orderData?.data?.id || !orderData.data.amount) {
        throw new Error("Invalid order data received from server");
      }

      const options = {
        key: razorpay_api_key,
        amount: orderData.data.amount,
        currency: orderData.data.currency || "INR",
        name: "Eatoor",
        description: `Order from ${restaurantOrderDetails.restaurant_name}`,
        order_id: orderData.data.id,
        image: "https://www.eatoor.com/eatoormob.svg",
        handler: (response) => {
          try {
            validatePaymentData(response, orderData.data.id);
            handlePaymentSuccess(response, orderData.data.id);
          } catch (error) {
            handlePaymentFailure(error);
          }
        },
        prefill: {
          name: user?.full_name || "",
          email: user?.email || "",
          contact: user?.contact_number || "",
        },
        theme: {
          color: "#e65c00",
        },
        modal: {
          ondismiss: () => {
            handlePaymentFailure(new Error("Payment cancelled by user"));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Payment processing error:", err);
      handlePaymentFailure(err);
    }
  }, [loadRazorpayScript, restaurantOrderDetails, razorpay_api_key, user, restaurant_id, appliedCoupon, handlePaymentSuccess, handlePaymentFailure]);

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  
  if (!restaurantOrderDetails) return <StripeLoader />;

  return (
    <div className="payment-option-container">

      <div className="eatoor-modal-wrapper">
        {/* <button className="eatoor-modal-trigger" onClick={() => setIsOpen(true)}>
          Open Modal
        </button> */}
        {isOpen && (
          <div className="eatoor-modal-overlay">
            <div className="eatoor-modal-container">
              <span className="eatoor-modal-close" onClick={() => setIsOpen(false)}>
                &times;
              </span>
              <div className="eatoor-modal-notice">
                <svg className="eatoor-modal-icon" viewBox="0 0 24 24">
                  <path fill="#e65c00" d="M12,2L1,21H23M12,6L19.5,19H4.5M11,10V14H13V10M11,16V18H13V16" />
                </svg>
                <span>Minimum order amount should be ₹50</span>
              </div>
              <button className="eatoor-modal-button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

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
              <span className="payment-option-item-value">₹{restaurantOrderDetails.item_total.toFixed(2)}</span>
            </div>
            <div className="payment-option-order-item">
              <span className="payment-option-item-icon">🏍️</span>
              <span className="payment-option-item-label">Delivery Fee | {restaurantOrderDetails.distance_km} kms</span>
              <span className="payment-option-item-value">₹{restaurantOrderDetails.delivery_fee.toFixed(2)}</span>
            </div>
            {restaurantOrderDetails.tax_amount > 0 && (
              <div className="payment-option-order-item">
                <span className="payment-option-item-icon">🧾</span>
                <span className="payment-option-item-label">Tax:</span>
                <span className="payment-option-item-value">₹{restaurantOrderDetails.tax_amount.toFixed(2)}</span>
              </div>
            )}
            {(appliedCoupon?.discount_amount || 0) > 0 && (
              <div className="payment-option-order-item discount">
                <span className="payment-option-item-icon">🎁</span>
                <span className="payment-option-item-label">Coupon Discount:</span>
                <span className="payment-option-item-value">- ₹{restaurantOrderDetails.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="payment-option-coupon-section">
              {!appliedCoupon ? (
                <>
                  {!showCouponInput ? (
                    <button 
                      className="payment-option-have-coupon"
                      onClick={toggleCouponInput}
                    >
                      Have a coupon code?
                    </button>
                  ) : (
                    <div className="payment-option-coupon-input-group">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError("");
                        }}
                        placeholder="Enter coupon code"
                        className="payment-option-coupon-input"
                        maxLength="20"
                      />
                      <button 
                        onClick={applyCoupon}
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="payment-option-coupon-apply"
                      >
                        {isApplyingCoupon ? (
                          <>
                            <span className="payment-option-spinner" />
                            Applying...
                          </>
                        ) : "Apply"}
                      </button>
                      <button 
                        onClick={toggleCouponInput}
                        className="payment-option-coupon-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="payment-option-coupon-applied">
                  <div className="payment-option-coupon-success">
                    <FaTag className="payment-option-coupon-icon" />
                    <span>Coupon Applied: {appliedCoupon.code} (-₹{appliedCoupon.discount_amount.toFixed(2)})</span>
                    {appliedCoupon.message && (
                      <div className="payment-option-coupon-message">{appliedCoupon.message}</div>
                    )}
                  </div>
                  <button 
                    onClick={removeCoupon}
                    className="payment-option-coupon-remove"
                  >
                    Remove
                  </button>
                </div>
              )}
              {couponError && (
                <div className="payment-option-coupon-error">
                  {couponError}
                </div>
              )}
            </div>
          
            <div className="payment-option-order-total">
              <span className="payment-option-total-label">Total Payable:</span>
              <span className="payment-option-total-value">₹{restaurantOrderDetails.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Minimum order amount warning */}
        {restaurantOrderDetails.total_amount < MINIMUM_ORDER_AMOUNT && (
          <div className="payment-option-minimum-error">
            Minimum order amount should be <span className="payment-option-minimum-amount">₹{MINIMUM_ORDER_AMOUNT}</span>.
            Please add more items to proceed.
          </div>
        )}

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
            className={`payment-option-button ${
              loading ? "processing" : 
              restaurantOrderDetails.total_amount < MINIMUM_ORDER_AMOUNT ? "disabled" : ""
            }`}
            onClick={initiatePayment}
            disabled={
              !selectedPayment || 
              loading || 
              postPaymentProcessing || 
              restaurantOrderDetails.total_amount < MINIMUM_ORDER_AMOUNT
            }
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