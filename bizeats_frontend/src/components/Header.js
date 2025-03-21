import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Home, ShoppingCart, LogIn, User, LogOut, Store, Briefcase } from "lucide-react";
import SignIn from "./SignIn";
import "../assets/css/Header.css";

const Header = ({ user, setUser }) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const is_restaurant_register = localStorage.getItem("is_restaurant_register");
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setUser(null);
    setShowDropdown(false);
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="header-container">
      {/* Logo */}
      <Link to="/" className="product-logo">
        <div className="logo">
          Biz<span className="logo-highlight">Eats</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="nav-menu">
        <ul>
          <li>
            <Link to="/" className="nav-link">
              <Home size={20} className="icon" />
              Home
            </Link>
          </li>
          <li>
            <Link to="/register-your-restaurent" className="nav-link">
              <Store size={20} className="icon" />
              Register Restaurent
            </Link>
          </li>
          <li>
            <Link to="/cart" className="nav-link">
              <ShoppingCart size={20} className="icon" />
              Cart
            </Link>
          </li>

          {/* User Authentication Section */}
          <li className="auth-section">
            {user ? (
              <div className="user-menu" ref={dropdownRef}>
                <div
                  className="login-user-info"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <User size={20} className="icon" />
                  <span className="username">{user.full_name}</span>
                </div>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="dropdown-menu">
                    <Link to="/profile" className="dropdown-item">
                      <User size={16} className="icon" /> Profile
                    </Link>

                    {is_restaurant_register === "true" && (
                      <Link to="/vendor-dashboard" className="dropdown-item">
                        <Briefcase size={16} className="icon" /> Business
                      </Link>
                    )}

                    <button onClick={handleLogout} className="dropdown-item logout-btn-header">
                      <LogOut size={16} className="icon" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowSignIn(true)} className="signin-btn">
                <LogIn size={20} className="icon" />
                Sign In
              </button>
            )}
          </li>
        </ul>
      </nav>

      {/* Sign In Modal */}
      {showSignIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          setUser={(userData) => {
            setUser(userData); // Update user state
            setShowSignIn(false); // Close modal
            setShowDropdown(false); // Open Profile & Logout section
          }}
        />
      )}
    </header>
  );
};

export default Header;