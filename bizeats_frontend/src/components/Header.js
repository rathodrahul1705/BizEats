import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home, ShoppingCart, LogIn, User, LogOut } from "lucide-react";
import SignIn from "./SignIn";
import "../assets/css/Header.css";

const Header = ({ user, setUser }) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    setUser(null);
    setShowDropdown(false); // Hide dropdown on logout
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

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
            <Link to="/cart" className="nav-link">
              <ShoppingCart size={20} className="icon" />
              Cart
            </Link>
          </li>

          {/* User Authentication Section */}
          <li className="auth-section">
            {user ? (
              <div className="user-menu">
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
