import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import "../assets/css/SignIn.css";

const SignIn = ({ onClose, setUser }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("modal-open"); // Prevent scrolling & blur background
    return () => document.body.classList.remove("modal-open"); // Remove on close
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (isSignUp) {
      // Sign Up Validations
      if (!formData.full_name) return setMessage("Full Name is required");
      if (!formData.email) return setMessage("Email is required");
      if (!formData.password) return setMessage("Password is required");
      if (formData.password.length < 6) return setMessage("Password must be at least 6 characters");
      if (formData.password !== formData.confirmPassword) return setMessage("Passwords do not match");

      try {
        setLoading(true);
        const response = await fetch("http://127.0.0.1:8000/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();
        setLoading(false);
        if (!response.ok) throw new Error(data.message || "Registration failed");

        setMessage("Registration successful! Please sign in.");
        setMessageType("success");
        setIsSignUp(false);
      } catch (err) {
        setMessage(err.message);
        setMessageType("error");
        setLoading(false);
      }
    } else {
      // Sign In Validations
      if (!formData.email) return setMessage("Email is required");
      if (!formData.password) return setMessage("Password is required");

      try {
        setLoading(true);
        const response = await fetch("http://127.0.0.1:8000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();
        setLoading(false);
        if (!response.ok) throw new Error(data.message || "Login failed");

        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user);
        setMessage("Login successful! Redirecting...");
        setMessageType("success");
        onClose();
      } catch (err) {
        setMessage(err.message);
        setMessageType("error");
        setLoading(false);
      }
    }
  };

  return (
    <div className="signin-container">
      {/* 🔹 Overlay (Blurred Background) */}
      <div className="signin-overlay active" onClick={onClose}></div>

      {/* 🔹 Sign In Modal */}
      <div className="signin-modal active">
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <h2 className="signin-title">{isSignUp ? "Create Account 🎉" : "Welcome Back! 👋"}</h2>
        <p className="signin-subtext">{isSignUp ? "Join us today!" : "Sign in to continue"}</p>

        <form className="signin-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              name="full_name"
              placeholder="Full Name"
              className="signin-input"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="text"
            name="email"
            placeholder="Email"
            className="signin-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="signin-input"
            value={formData.password}
            onChange={handleChange}
            required
          />
          {isSignUp && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="signin-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          )}
          <button type="submit" className="signin-button" disabled={loading}>
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Login"}
          </button>
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
