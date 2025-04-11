import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "../assets/css/SignIn.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const SignIn = ({ onClose, setUser = () => {} }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    otp: Array(6).fill(""),
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timer, setTimer] = useState(300);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef([]);

  useEffect(() => {
    document.body.classList.add("modal-open");
    let countdown;
    if (otpSent && timer > 0) {
      countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setOtpExpired(true);
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(countdown);
      document.body.classList.remove("modal-open");
    };
  }, [otpSent, timer]);

  const handleChange = (e, index = null) => {
    const { name, value } = e.target;
    setFieldErrors({});
    setMessage("");

    if (name === "otp") {
      const val = value.replace(/[^0-9]/g, "");
      const updatedOtp = [...formData.otp];
      updatedOtp[index] = val;
      setFormData((prev) => ({ ...prev, otp: updatedOtp }));

      if (val && otpRefs.current[index + 1]) {
        otpRefs.current[index + 1].focus();
      }
    } else if (name === "contact_number") {
      const val = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prevState) => ({ ...prevState, [name]: val }));
    } else {
      setFormData((prevState) => ({ ...prevState, [name]: value }));
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (formData.otp[index]) {
        const updatedOtp = [...formData.otp];
        updatedOtp[index] = "";
        setFormData((prev) => ({ ...prev, otp: updatedOtp }));
      } else if (otpRefs.current[index - 1]) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const handleOtpPaste = (e) => {
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const updatedOtp = [...formData.otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) updatedOtp[i] = char;
    });
    setFormData((prev) => ({ ...prev, otp: updatedOtp }));

    setTimeout(() => {
      const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
      if (otpRefs.current[nextIndex]) otpRefs.current[nextIndex].focus();
    }, 10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otpSent) {
      await handleVerifyOtp();
    } else {
      isSignUp ? await handleRegister() : await handleLogin();
    }
  };

  const handleRegister = async () => {
    const { full_name, email, contact_number } = formData;
    if (!full_name || !email || !contact_number) {
      setFieldErrors({
        full_name: !full_name ? "Full name is required" : "",
        email: !email ? "Email is required" : "",
        contact_number: !contact_number ? "Contact number is required" : 
                         contact_number.length < 10 ? "Contact number must be 10 digits" : "",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchData(API_ENDPOINTS.AUTH.REGISTER, "POST", { 
        full_name, 
        email,
        contact_number 
      });

      if (response?.error) {
        setMessage(response.error);
        setMessageType("error");
        return;
      }

      setOtpSent(true);
      setMessage("OTP sent to your email and mobile.");
      setMessageType("success");
      setIsRegistered(true);
      setOtpExpired(false);
      setTimer(300);
    } catch (err) {
      setMessage("Registration failed.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.email) {
      setFieldErrors({ email: "Email is required" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchData(API_ENDPOINTS.AUTH.LOGIN, "POST", { email: formData.email });

      if (response?.error) {
        setMessage(response.error);
        setMessageType("error");
        return;
      }

      setOtpSent(true);
      setMessage("OTP sent to your email.");
      setMessageType("success");
      setOtpExpired(false);
      setTimer(300);
    } catch (err) {
      setMessage("Login failed.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = formData.otp.join("");
    if (!otp || otp.length < 6) {
      setFieldErrors({ otp: "Please enter a 6-digit OTP" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchData(API_ENDPOINTS.AUTH.VERIFY_OTP, "POST", {
        email: formData.email,
        otp,
      });

      if (response?.error) {
        setMessage(response.error);
        setMessageType("error");
        return;
      }

      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("refresh", response?.refresh);
      localStorage.setItem("access", response?.access);
      localStorage.setItem("is_restaurant_register", response?.is_restaurant_register);

      setMessage("Login successful!");
      setMessageType("success");
      setUser(response.user);
      onClose();

      setFormData({ full_name: "", email: "", contact_number: "", otp: Array(6).fill("") });
      setOtpSent(false);
      setOtpExpired(false);
      setTimer(300);
    } catch (err) {
      setMessage("OTP verification failed.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-overlay active" onClick={onClose}></div>
      <div className="signin-modal active">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="signin-header">
          <h2 className="signin-title">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p className="signin-subtext">
            {isSignUp
              ? "Join us today and get started"
              : "Sign in to access your account"}
          </p>
        </div>

        <div className="signin-footer">
          <p>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              className="toggle-link"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
                setFieldErrors({});
                setOtpSent(false);
              }}
            >
              {isSignUp ? " Sign in" : " Sign up"}
            </button>
          </p>
        </div>
        

        <form className="signin-form" onSubmit={handleSubmit}>
          {loading && <div className="loading-bar"></div>}

          {!otpSent ? (
            <>
              {isSignUp && (
                <div className="input-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    placeholder="Enter your full name"
                    className={`signin-input ${fieldErrors.full_name ? "error" : ""}`}
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                  {fieldErrors.full_name && <span className="input-error">{fieldErrors.full_name}</span>}
                </div>
              )}

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  className={`signin-input ${fieldErrors.email ? "error" : ""}`}
                  value={formData.email}
                  onChange={handleChange}
                />
                {fieldErrors.email && <span className="input-error">{fieldErrors.email}</span>}
              </div>
              
              {isSignUp && (
                <div className="input-group">
                  <label htmlFor="contact_number">Phone Number</label>
                  <input
                    type="tel"
                    id="contact_number"
                    name="contact_number"
                    placeholder="Enter your phone number"
                    className={`signin-input ${fieldErrors.contact_number ? "error" : ""}`}
                    value={formData.contact_number}
                    onChange={handleChange}
                    maxLength={10}
                  />
                  {fieldErrors.contact_number && (
                    <span className="input-error">{fieldErrors.contact_number}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="otp-container">
                <p className="otp-instruction">Enter the 6-digit OTP sent to your email</p>
                <div className="otp-inputs" onPaste={handleOtpPaste}>
                  {formData.otp.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="tel"
                      name="otp"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`signin-input otp-input ${fieldErrors.otp ? "error" : ""}`}
                      value={val}
                      onChange={(e) => handleChange(e, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      maxLength={1}
                    />
                  ))}
                </div>
                {fieldErrors.otp && <span className="input-error">{fieldErrors.otp}</span>}
                <div className="otp-footer">
                  <span className="timer">
                    OTP expires in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                  </span>
                  {otpExpired && (
                    <button
                      type="button"
                      className="resend-link"
                      onClick={isSignUp ? handleRegister : handleLogin}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}

          <button type="submit" className="signin-button">
            {otpSent ? "Verify OTP" : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;