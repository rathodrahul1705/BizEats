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
    otp: Array(6).fill(""),
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timer, setTimer] = useState(300);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const handleRegister = async () => {
    const { full_name, email } = formData;
    if (!full_name || !email) {
      setFieldErrors({
        full_name: !full_name ? "Full name is required" : "",
        email: !email ? "Email is required" : "",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchData(API_ENDPOINTS.AUTH.REGISTER, "POST", { full_name, email });

      if (response?.error) {
        setMessage(response.error);
        setMessageType("error");
        return;
      }

      setOtpSent(true);
      setMessage("OTP sent to your email.");
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
      localStorage.setItem("refresh", response.refresh);
      localStorage.setItem("access", response.access);
      localStorage.setItem("is_restaurant_register", JSON.stringify(response.is_restaurant_register));

      setMessage("Login successful!");
      setMessageType("success");
      setIsLoggedIn(true);
      setUser(response.user);
      onClose();

      // Reset only on success
      setFormData({ full_name: "", email: "", otp: Array(6).fill("") });
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
        <button className="close-button" onClick={onClose}><X size={24} /></button>

        <h2 className="signin-title">{isSignUp ? "Create Account 🎉" : "Welcome Back! 👋"}</h2>
        <p className="signin-subtext">
          {isSignUp
            ? "Join us today!"
            : isRegistered
            ? "Registration successful! Please sign in to continue."
            : "Sign in to continue"}
        </p>

        <form className="signin-form">
          {loading && <div className="loading-bar"></div>}

          {!otpSent && !otpExpired && (
            <>
              {isSignUp && (
                <>
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Full Name"
                    className="signin-input"
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                  {fieldErrors.full_name && <p className="input-error">{fieldErrors.full_name}</p>}
                </>
              )}
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="signin-input"
                value={formData.email}
                onChange={handleChange}
              />
              {fieldErrors.email && <p className="input-error">{fieldErrors.email}</p>}
            </>
          )}

          {otpSent && (
            <>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {formData.otp.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="tel"
                    name="otp"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="signin-input otp-input"
                    value={val}
                    onChange={(e) => handleChange(e, idx)}
                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                    maxLength={1}
                  />
                ))}
              </div>
              {fieldErrors.otp && <p className="input-error">{fieldErrors.otp}</p>}
              <p className="timer">
                OTP expires in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
              </p>
              {otpExpired && (
                <button
                  className="resend-otp-button"
                  type="button"
                  onClick={isSignUp ? handleRegister : handleLogin}
                >
                  Resend OTP
                </button>
              )}
            </>
          )}

          {message && <p className={`message ${messageType}`}>{message}</p>}

          <div className="button-group">
            {!otpSent && !otpExpired && !isLoggedIn && !isSignUp && (
              <button type="button" className="signin-button" onClick={handleLogin}>Sign In</button>
            )}

            {!otpSent && !otpExpired && isSignUp && (
              <button type="button" className="signin-button" onClick={handleRegister}>Sign Up</button>
            )}

            {otpSent && !otpExpired && (
              <button type="button" className="signin-button" onClick={handleVerifyOtp}>Verify OTP</button>
            )}
          </div>
        </form>

        <p className="signin-footer">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button className="signup-link" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? " Sign in" : " Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
