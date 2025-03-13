import React, { useState } from "react";
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (isSignUp) {
      // Validation checks
      if (!formData.full_name) {
        setMessage("Full Name is required");
        setMessageType("error");
        return;
      }
      if (!formData.email) {
        setMessage("Email is required");
        setMessageType("error");
        return;
      }
      if (!formData.password) {
        setMessage("Password is required");
        setMessageType("error");
        return;
      }
      if (formData.password.length < 6) {
        setMessage("Password must be at least 6 characters");
        setMessageType("error");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setMessage("Passwords do not match");
        setMessageType("error");
        return;
      }

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

        if (!response.ok) {
          if (data.email) {
            throw new Error(data.email[0]);
          }
          throw new Error(data.message || "Registration failed");
        }

        setMessage("Registration successful! Please sign in.");
        setMessageType("success");
        setIsSignUp(false);
      } catch (err) {
        setMessage(err.message);
        setMessageType("error");
        setLoading(false);
      }
    } else {
      // Login logic
      if (!formData.email) {
        setMessage("Email is required");
        setMessageType("error");
        return;
      }
      if (!formData.password) {
        setMessage("Password is required");
        setMessageType("error");
        return;
      }

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

        if (!response.ok) {
          if (data.email) throw new Error(data.email[0]);
          throw new Error(data.message || "Login failed");
        }

        // Store tokens and user info
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user); // Update state in App.js
        setMessage("Login successful! Redirecting...");
        setMessageType("success");
        onClose(); // Close the modal after successful login
      } catch (err) {
        setMessage(err.message);
        setMessageType("error");
        setLoading(false);
      }
    }
  };

  return (
    <div className="signin-modal active">
      <button className="close-button" onClick={onClose}>
        <X size={24} />
      </button>

      {message && <p className={`message ${messageType}`}>{message}</p>}

      <h2 className="signin-title">
        {isSignUp ? "Create Account 🎉" : "Welcome Back! 👋"}
      </h2>
      <p className="signin-subtext">
        {isSignUp ? "Join us today!" : "Sign in to continue"}
      </p>

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
          placeholder="Email or Phone"
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
  );
};

export default SignIn;
