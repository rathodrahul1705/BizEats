import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import "../assets/css/SignIn.css";

const SignIn = ({ onClose, setUser = () => {} }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    otp: Array(6).fill(""), // OTP array for 6 digits
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [otpSent, setOtpSent] = useState(false); // Track if OTP was sent
  const [otpExpired, setOtpExpired] = useState(false); // Track OTP expiration
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [isRegistered, setIsRegistered] = useState(false); // Track if registration is successful
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track if the user has logged in
  const [loading, setLoading] = useState(false); // Track loading state

  // Create an array of refs for OTP input fields
  const otpRefs = useRef([]);

  useEffect(() => {
    document.body.classList.add("modal-open"); // Prevent scrolling & blur background
    let countdown;
    if (otpSent && timer > 0) {
      countdown = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setOtpExpired(true); // Set OTP expired when timer runs out
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(countdown);
      document.body.classList.remove("modal-open"); // Cleanup on close
    };
  }, [otpSent, timer]);

  const handleChange = (e, index) => {
    const { name, value } = e.target;
    if (name === "otp") {
      const updatedOtp = [...formData.otp];
      updatedOtp[index] = value.slice(0, 1); // Limit to 1 character per OTP input
      setFormData((prevState) => ({ ...prevState, otp: updatedOtp }));

      // If value is entered, focus on the next OTP input
      if (value && otpRefs.current[index + 1]) {
        otpRefs.current[index + 1].focus();
      }
    } else {
      setFormData((prevState) => ({ ...prevState, [name]: value }));
    }
  };

  const handleRegister = async () => {
    if (!formData.full_name) return setMessage("Full Name is required");
    if (!formData.email) return setMessage("Email is required");

    setLoading(true); // Set loading state to true

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setMessageType("success");
        setIsRegistered(true); // Mark as registered
      } else {
        setMessage(data.message || "Registration failed.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error occurred while registering.");
      setMessageType("error");
    } finally {
      setLoading(false); // Set loading state back to false
    }
  };

  const handleLogin = async () => {
    if (!formData.email) return setMessage("Email is required");

    setLoading(true); // Set loading state to true

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setMessageType("success");
      } else {
        setMessage(data.message || "Login failed.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error occurred while logging in.");
      setMessageType("error");
    } finally {
      setLoading(false); // Set loading state back to false
    }
  };

  const handleVerifyOtp = async () => {
    const otp = formData.otp.join("");
    if (!otp) return setMessage("OTP is required");

    setLoading(true); // Set loading state to true

    try {
      const response = await fetch("http://127.0.0.1:8000/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otp,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        if (isSignUp) {
          setMessageType("success");
          setIsSignUp(false);
          setIsRegistered(true);
        } else {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('refresh', data.refresh);
          localStorage.setItem('access', data.access);
          setMessage("Login successful!");
          setMessageType("success");
          setIsLoggedIn(true);
          setUser(data.user);
          onClose();
        }
      } else {
        setMessage(data.message || "OTP verification failed.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error occurred while verifying OTP.");
      setMessageType("error");
    } finally {
      setLoading(false); // Set loading state back to false
    }

    // Reset the form data and OTP state after verification
    setFormData({
      full_name: "",
      email: "",
      otp: Array(6).fill(""),
    });

    setOtpSent(false);
    setOtpExpired(false);
    setTimer(300);
  };

  return (
    <div className="signin-container">
      <div className="signin-overlay active" onClick={onClose}></div>

      <div className="signin-modal active">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <h2 className="signin-title">{isSignUp ? "Create Account 🎉" : "Welcome Back! 👋"}</h2>
        <p className="signin-subtext">
          {isSignUp
            ? "Join us today!"
            : isRegistered
            ? "Registration successful! Please sign in to continue."
            : "Sign in to continue"}
        </p>

        <form className="signin-form">
          {/* Show loader when loading */}
          {loading && <div className="loader">Loading...</div>}

          {/* Show registration fields only if OTP hasn't been sent */}
          {!otpSent && !otpExpired && (
            <>
              {isSignUp && (
                <input
                  type="text"
                  name="full_name"
                  placeholder="Full Name"
                  className="signin-input"
                  value={formData.full_name}
                  onChange={(e) => handleChange(e)}
                  required
                />
              )}
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="signin-input"
                value={formData.email}
                onChange={(e) => handleChange(e)}
                required
              />
            </>
          )}

          {otpSent && !otpExpired && (
            <>
              <div className="otp-inputs">
                {formData.otp.map((otpValue, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)} // Set ref for each OTP input
                    type="text"
                    name="otp"
                    placeholder="-"
                    className="signin-input otp-input"
                    value={otpValue}
                    onChange={(e) => handleChange(e, index)}
                    maxLength={1}
                    required
                  />
                ))}
              </div>
              <p className="timer">
                OTP expires in {Math.floor(timer / 60)}:{timer % 60}
              </p>
            </>
          )}

          {/* Show Sign-in button after registration */}
          {!otpSent && !otpExpired && !isLoggedIn && !isSignUp && (
            <div className="button-group">
              <button
                type="button"
                className="signin-button"
                onClick={handleLogin}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Display buttons based on state */}
          <div className="button-group">
            {!otpSent && !otpExpired && isSignUp && (
              <button
                type="button"
                className="signin-button"
                onClick={handleRegister}
              >
                Sign Up
              </button>
            )}
            {otpSent && !otpExpired && (
              <button
                type="button"
                className="signin-button"
                onClick={handleVerifyOtp}
              >
                Verify OTP
              </button>
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
