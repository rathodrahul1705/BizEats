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
      const newIsMobile = window.innerWidth <= 768;
      if (newIsMobile !== isMobile) {
        setIsMobile(newIsMobile);
        // Close dropdown when switching between mobile and desktop
        setShowDropdown(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          (!accountButtonRef.current || !accountButtonRef.current.contains(event.target))) {
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
      document.body.classList.add('body-no-scroll');
    } else {
      document.body.classList.remove('body-no-scroll');
    }
    return () => document.body.classList.remove('body-no-scroll');
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

  const renderPartnerIcon = () => (
    <svg
      fill="#000000"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className="header__icon"
      width="25"
      height="25"
    >
      <g>
        <path d="M454.313,249.708L512,206.991L462.136,38.939l-256.667,8.226l-24.727,38.398L92.839,64.42L0,256.087l42.289,36.399 
          l-22.328,34.553c-7.052,10.914-9.432,23.92-6.701,36.624c2.73,12.704,10.245,23.583,21.158,30.635 
          c7.963,5.146,17.042,7.804,26.304,7.804c2.438,0,4.887-0.193,7.333-0.565c3.097,11.013,10.047,20.988,20.388,27.67 
          c8.142,5.262,17.282,7.774,26.323,7.774c2.442,0,4.873-0.206,7.278-0.567c3.198,11.44,10.36,21.2,20.423,27.703 
          c8.143,5.262,17.282,7.774,26.323,7.774c15.973,0,31.639-7.845,40.934-22.231l6.634-10.268l38.853,25.758l0.162,0.107 
          c7.963,5.146,17.042,7.805,26.304,7.805c3.43,0,6.887-0.365,10.32-1.102c12.704-2.731,23.583-10.246,30.635-21.158 
          c4.963-7.681,7.476-16.249,7.745-24.785c2.489-0.146,4.985-0.478,7.47-1.012c12.704-2.731,23.583-10.246,30.635-21.158 
          c4.865-7.528,7.504-16.054,7.777-24.787c2.479-0.147,4.963-0.478,7.436-1.01c12.705-2.731,23.584-10.244,30.636-21.158 
          c4.968-7.688,7.481-16.267,7.745-24.811c14.973-0.869,29.358-8.609,38.102-22.144c7.052-10.914,9.432-23.92,6.703-36.624 
          C464.938,264.277,460.578,256.165,454.313,249.708z 
          M223.819,79.562l213.947-6.856l36.06,121.529l-47.959,35.513L242.472,110.338l-52.058,79.011l-0.08,0.123 
          c-4.694,7.26-14.416,9.349-21.676,4.66c-7.26-4.691-9.35-14.415-4.645-21.697L223.819,79.562z 
          M73.986,361.949c-4.694,7.261-14.418,9.35-21.675,4.66c-3.517-2.273-5.939-5.779-6.819-9.873 
          c-0.879-4.094-0.113-8.285,2.161-11.802l32.971-51.027c2.997-4.637,8.043-7.164,13.192-7.164c2.913,0,5.86,0.81,8.484,2.505 
          c3.517,2.273,5.938,5.778,6.818,9.872s0.113,8.286-2.159,11.803L73.986,361.949z 
          M128.011,396.858c-4.694,7.26-14.417,9.348-21.676,4.659c-7.26-4.691-9.35-14.415-4.658-21.675l32.972-51.027 
          c2.997-4.637,8.043-7.164,13.192-7.164c2.913,0,5.86,0.81,8.484,2.506c7.26,4.691,9.35,14.415,4.659,21.675L128.011,396.858z 
          M215.006,380.74l-32.972,51.027c-4.691,7.262-14.415,9.349-21.674,4.659c-3.517-2.273-5.939-5.779-6.818-9.873 
          c-0.88-4.094-0.114-8.285,2.159-11.803l32.972-51.027c2.273-3.517,5.778-5.938,9.872-6.818c1.107-0.237,2.22-0.355,3.324-0.355 
          c2.985,0,5.911,0.857,8.477,2.516C217.607,363.757,219.697,373.48,215.006,380.74z 
          M432.488,292.041c-2.273,3.517-5.778,5.938-9.872,6.818c-4.094,0.881-8.286,0.113-11.802-2.159l-10.939-7.068 
          l-51.028-32.972l-17.892,27.69l10.94,7.07l40.088,25.904c3.517,2.273,5.938,5.778,6.818,9.872s0.113,8.286-2.159,11.803 
          s-5.779,5.939-9.872,6.819c-4.095,0.879-8.285,0.113-11.803-2.159l-51.027-32.972l-17.892,27.69l40.087,25.902 
          c7.26,4.691,9.35,14.414,4.659,21.675c-2.273,3.517-5.779,5.939-9.872,6.819c-4.095,0.879-8.285,0.113-11.802-2.159 
          l-43.558-28.145l-17.892,27.69l32.617,21.076c7.26,4.693,9.351,14.415,4.659,21.676c-2.273,3.517-5.778,5.939-9.872,6.819 
          c-4.068,0.874-8.232,0.122-11.735-2.117l-39.081-25.909l8.443-13.068c14.557-22.529,8.072-52.702-14.457-67.258 
          c-10.349-6.687-22.309-8.922-33.629-7.214c-3.094-11.023-10.046-21.008-20.394-27.695c-10.342-6.682-22.292-8.919-33.605-7.217 
          c-3.199-11.436-10.36-21.192-20.42-27.692c-18.62-12.034-42.458-9.676-58.391,4.224l-21.076-18.14l70.215-144.958 
          l50.897,12.241l-25.527,39.639c-14.557,22.529-8.072,52.701,14.457,67.258c22.506,14.544,52.642,8.083,67.217-14.392 
          l33.979-51.572l175.87,114.508c3.516,2.273,5.938,5.778,6.818,9.872C435.528,284.332,434.761,288.523,432.488,292.041z" />
      </g>
    </svg>
  );  

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
                    {renderPartnerIcon()}
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
              className={`mobile-bottom-nav__item ${isActive('/partner') ? 'active' : ''}`}
              onClick={() => setShowDropdown(false)}
            >
              {renderPartnerIcon()}
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
                className="mobile-bottom-nav__item"
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