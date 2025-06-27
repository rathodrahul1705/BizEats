import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingCart, LogIn, User, LogOut, Briefcase, Utensils } from "lucide-react";
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
  const accountButtonRef = useRef(null);

  // Handle cart count updates
  useEffect(() => {
    const updateCartCount = () => {
      setCartCount(localStorage.getItem("cart_count") || 0);
    };
    window.addEventListener("storage", updateCartCount);
    return () => window.removeEventListener("storage", updateCartCount);
  }, []);

  // Handle mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setShowDropdown(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          accountButtonRef.current && !accountButtonRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Handle body scroll when dropdown is open
  useEffect(() => {
    if (showDropdown && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDropdown, isMobile]);

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

  const isActive = (path) => location.pathname === path;

  const handleDropdownAction = (path) => {
    setShowDropdown(false);
    if (path === 'logout') {
      handleLogout();
    } else {
      navigate(path);
    }
  };

  const toggleDropdown = (e) => {
    e?.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      {!isMobile ? (
        // Desktop Header
        <header className="header">
          <div className="header__container">
            <Link to="/" className="header__logo">
              <img src="/eatoorweb.svg" alt="EATOOR Logo" className="header__logo-image" />
            </Link>

            <nav className="header__nav">
              <ul className="header__nav-list">
                <li className="header__nav-item">
                  <Link to="/" className={`header__nav-link ${isActive('/') ? 'active' : ''}`}>
                    <Home size={20} className="header__icon" />
                    <span className="header__nav-text">Home</span>
                  </Link>
                </li>

                <li className="header__nav-item">
                  <Link to="/register-your-homechef" className={`header__nav-link ${isActive('/register-your-homechef') ? 'active' : ''}`}>
                    <Utensils size={20} className="header__icon" />
                    <span className="header__nav-text">Partner with us</span>
                  </Link>
                </li>

                <li className="header__nav-item">
                  <Link to="/cart" className={`header__nav-link ${isActive('/cart') ? 'active' : ''}`}>
                    <ShoppingCart size={20} className="header__icon" />
                    <span className="header__nav-text">Cart</span>
                    {cartCount > 0 && <span className="header__cart-count">{cartCount}</span>}
                  </Link>
                </li>
                
                <li className="header__auth-item">
                  {user ? (
                    <div className="header__user-menu" ref={dropdownRef}>
                      <div 
                        className={`header__user-info ${showDropdown ? 'active' : ''}`} 
                        onClick={toggleDropdown}
                        ref={accountButtonRef}
                      >
                        <User size={20} className="header__icon" />
                        <span className="header__username">{user.full_name}</span>
                      </div>
                      {showDropdown && (
                        <div className="header__dropdown">
                          <Link 
                            to="/profile" 
                            className="header__dropdown-item"
                            onClick={() => setShowDropdown(false)}
                          >
                            <User size={16} className="header__dropdown-icon" /> 
                            <span>Profile</span>
                          </Link>
                          {is_restaurant_register === "true" && (
                            <Link 
                              to="/vendor-dashboard" 
                              className="header__dropdown-item"
                              onClick={() => setShowDropdown(false)}
                            >
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
        </header>
      ) : (
        // Mobile Bottom Navigation
        <>
          {showDropdown && (
            <div 
              className="mobile-bottom-nav__overlay" 
              onClick={() => setShowDropdown(false)} 
            />
          )}
          
          <nav className="mobile-bottom-nav">
            <Link 
              to="/" 
              className={`mobile-bottom-nav__item ${isActive('/') ? 'active' : ''}`}
              onClick={() => setShowDropdown(false)}
            >
              <Home size={20} className="mobile-bottom-nav__icon" />
              <span className="mobile-bottom-nav__label">Home</span>
            </Link>
            
            <Link 
              to="/register-your-homechef" 
              className={`mobile-bottom-nav__item ${isActive('/register-your-homechef') ? 'active' : ''}`}
              onClick={() => setShowDropdown(false)}
            >
              <Utensils size={20} className="header__icon" />
              <span className="mobile-bottom-nav__label">Partner</span>
            </Link>
            
            <Link 
              to="/cart" 
              className={`mobile-bottom-nav__item ${isActive('/cart') ? 'active' : ''}`}
              onClick={() => setShowDropdown(false)}
            >
              <div className="mobile-bottom-nav__cart-wrapper">
                <ShoppingCart size={20} className="mobile-bottom-nav__icon" />
                {cartCount > 0 && <span className="mobile-bottom-nav__cart-count">{cartCount}</span>}
              </div>
              <span className="mobile-bottom-nav__label">Cart</span>
            </Link>
            
            {user ? (
              <div 
                ref={accountButtonRef}
                className={`mobile-bottom-nav__item ${showDropdown ? 'active' : ''}`}
                onClick={toggleDropdown}
              >
                <User size={20} className="mobile-bottom-nav__icon" />
                <span className="mobile-bottom-nav__label">Account</span>
              </div>
            ) : (
              <button 
                className={`mobile-bottom-nav__item ${isActive('/signin') ? 'active' : ''}`}
                onClick={() => {
                  setShowSignIn(true);
                  setShowDropdown(false);
                }}
              >
                <LogIn size={20} className="mobile-bottom-nav__icon" />
                <span className="mobile-bottom-nav__label">Sign In</span>
              </button>
            )}
          </nav>

          {showDropdown && (
            <div className="mobile-bottom-nav__dropdown" ref={dropdownRef}>
              <div 
                className="mobile-bottom-nav__dropdown-item"
                onClick={() => handleDropdownAction('/profile')}
              >
                <User size={16} className="mobile-bottom-nav__dropdown-icon" />
                <span>Profile</span>
              </div>
              
              {is_restaurant_register === "true" && (
                <div 
                  className="mobile-bottom-nav__dropdown-item"
                  onClick={() => handleDropdownAction('/vendor-dashboard')}
                >
                  <Briefcase size={16} className="mobile-bottom-nav__dropdown-icon" />
                  <span>Business</span>
                </div>
              )}
              
              <div 
                className="mobile-bottom-nav__dropdown-item mobile-bottom-nav__dropdown-item--logout"
                onClick={() => handleDropdownAction('logout')}
              >
                <LogOut size={16} className="mobile-bottom-nav__dropdown-icon" />
                <span>Logout</span>
              </div>
            </div>
          )}
        </>
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