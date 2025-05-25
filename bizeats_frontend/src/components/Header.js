import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingCart, LogIn, User, LogOut, Store, Briefcase, Package } from "lucide-react";
import SignIn from "./SignIn";
import "../assets/css/Header.css";

const Header = ({ user, setUser }) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const is_restaurant_register = localStorage.getItem("is_restaurant_register");
  const [cartCount, setCartCount] = useState(localStorage.getItem("cart_count") || 0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(localStorage.getItem("cart_count") || 0);
    };

    window.addEventListener("storage", updateCartCount);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  const handleLogout = () => {
    setUser(null);
    setShowDropdown(false);
    setCartCount(0);
    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("cart_count");
    localStorage.removeItem("is_restaurant_register");
    localStorage.removeItem("session_id");
    localStorage.removeItem("cart_current_step");
    localStorage.removeItem("selected_address");
    localStorage.removeItem("user_full_address");
    navigate("/");
  };

  // Check if current route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {!isMobile ? (
        // Desktop Header
        <header className="header" ref={headerRef}>
          <div className="header__container">
            <Link to="/" className="header__logo">
              <img
                src="/eatoorweb.svg"
                alt="EATOOR Logo"
                className="header__logo-image"
              />
            </Link>

            <nav className="header__nav">
              <ul className="header__nav-list">
                <li className="header__nav-item">
                  <Link to="/" className="header__nav-link">
                    <Home size={20} className="header__icon" />
                    <span className="header__nav-text">Home</span>
                  </Link>
                </li>
                <li className="header__nav-item">
                  <Link to="/cart" className="header__nav-link">
                    <ShoppingCart size={20} className="header__icon" />
                    <span className="header__nav-text">Cart</span>
                    <span className="header__cart-count">{cartCount}</span>
                  </Link>
                </li>

                <li className="header__auth-item">
                  {user ? (
                    <div className="header__user-menu" ref={dropdownRef}>
                      <div
                        className="header__user-info"
                        onClick={() => setShowDropdown(!showDropdown)}
                      >
                        <User size={20} className="header__icon" />
                        <span className="header__username">{user.full_name}</span>
                      </div>

                      {showDropdown && (
                        <div className="header__dropdown">
                          <Link to="/profile" className="header__dropdown-item">
                            <User size={16} className="header__dropdown-icon" /> 
                            <span>Profile</span>
                          </Link>

                          {is_restaurant_register === "true" && (
                            <Link to="/vendor-dashboard" className="header__dropdown-item">
                              <Briefcase size={16} className="header__dropdown-icon" /> 
                              <span>Business</span>
                            </Link>
                          )}

                          <button 
                            onClick={handleLogout} 
                            className="header__dropdown-item header__dropdown-item--logout"
                          >
                            <LogOut size={16} className="header__dropdown-icon" /> 
                            <span>Logout</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowSignIn(true)} 
                      className="header__signin-btn"
                    >
                      <LogIn size={20} className="header__icon" />
                      <span className="header__signin-text">Sign In</span>
                    </button>
                  )}
                </li>
              </ul>
            </nav>
          </div>

          {showSignIn && (
            <SignIn
              onClose={() => setShowSignIn(false)}
              setUser={(userData) => {
                setUser(userData);
                setShowSignIn(false);
                setShowDropdown(false);
              }}
            />
          )}
        </header>
      ) : (
        // Mobile Bottom Navigation
        <nav className="mobile-bottom-nav">
          <Link to="/" className={`mobile-bottom-nav__item ${isActive('/') ? 'active' : ''}`}>
            <Home size={20} className="mobile-bottom-nav__icon" />
            <span className="mobile-bottom-nav__label">Home</span>
          </Link>
          
          <Link to="/cart" className={`mobile-bottom-nav__item ${isActive('/cart') ? 'active' : ''}`}>
            <div className="mobile-bottom-nav__cart-wrapper">
              <ShoppingCart size={20} className="mobile-bottom-nav__icon" />
              {cartCount > 0 && (
                <span className="mobile-bottom-nav__cart-count">{cartCount}</span>
              )}
            </div>
            <span className="mobile-bottom-nav__label">Cart</span>
          </Link>
          
          {user ? (
            <div 
              className={`mobile-bottom-nav__item ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown(!showDropdown)}
              ref={dropdownRef}
            >
              <User size={20} className="mobile-bottom-nav__icon" />
              <span className="mobile-bottom-nav__label">Account</span>
              
              {showDropdown && (
                <div className="mobile-bottom-nav__dropdown">
                  <Link 
                    to="/profile" 
                    className="mobile-bottom-nav__dropdown-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User size={16} className="mobile-bottom-nav__dropdown-icon" />
                    Profile
                  </Link>
                  
                  {is_restaurant_register === "true" && (
                    <Link 
                      to="/vendor-dashboard" 
                      className="mobile-bottom-nav__dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Briefcase size={16} className="mobile-bottom-nav__dropdown-icon" />
                      Business
                    </Link>
                  )}
                  
                  <button 
                    onClick={handleLogout} 
                    className="mobile-bottom-nav__dropdown-item mobile-bottom-nav__dropdown-item--logout"
                  >
                    <LogOut size={16} className="mobile-bottom-nav__dropdown-icon" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="mobile-bottom-nav__item"
              onClick={() => setShowSignIn(true)}
            >
              <LogIn size={20} className="mobile-bottom-nav__icon" />
              <span className="mobile-bottom-nav__label">Sign In</span>
            </button>
          )}
        </nav>
      )}
      
      <div className="header__spacer"></div>
      
      {showSignIn && (
        <SignIn
          onClose={() => setShowSignIn(false)}
          setUser={(userData) => {
            setUser(userData);
            setShowSignIn(false);
            setShowDropdown(false);
          }}
        />
      )}
    </>
  );
};

export default Header;