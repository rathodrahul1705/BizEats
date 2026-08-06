import React, { useState, useEffect } from 'react';
import '../src/assets/css/MobileBottomSheet.css';

const MobileBottomSheet = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|windows phone/i;
      return mobileRegex.test(userAgent.toLowerCase());
    };

    setIsMobile(checkMobile());
  }, []);

  // Show bottom sheet after a short delay
  useEffect(() => {
    if (isMobile) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Detect device type
  const getDeviceType = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/android/i.test(userAgent.toLowerCase())) {
      return 'android';
    }
    if (/iphone|ipad|ipod/i.test(userAgent.toLowerCase())) {
      return 'ios';
    }
    return 'other';
  };

  // Get app store link based on device
  const getAppStoreLink = () => {
    const deviceType = getDeviceType();
    console.log("deviceType====",deviceType)
    
    // Replace with your actual app store URLs
    if (deviceType === 'android') {
      return 'https://play.google.com/store/apps/details?id=com.eatoor';
    } else if (deviceType === 'ios') {
      return 'https://apps.apple.com/in/app/eatoor/id6756539381';
    }
    return '#';
  };

  const handleContinue = () => {
    const link = getAppStoreLink();
    if (link !== '#') {
      window.location.href = link;
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 400);
  };

  // Don't render on desktop
  if (!isMobile) return null;

  return (
    <>
      {isVisible && (
        <div 
          className={`bottom-screen-overlay ${isClosing ? 'bottom-screen-overlay--closing' : ''}`}
          onClick={handleClose}
        >
          <div 
            className={`bottom-screen-page ${isClosing ? 'bottom-screen-page--closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="bottom-screen-page__handle">
              <span className="bottom-screen-page__handle-bar"></span>
            </div>

            {/* Close button */}
            <button 
              className="bottom-screen-page__close"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 18L18 6M6 6L18 18" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Content */}
            <div className="bottom-screen-page__content">
              <div className="bottom-screen-page__icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="8" width="32" height="32" rx="8" fill="#FF6B35" opacity="0.1"/>
                  <path d="M16 24L22 30L34 18" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <h3 className="bottom-screen-page__title">
                Continue on App
              </h3>
              
              <p className="bottom-screen-page__description">
                Get the best experience on our mobile app
              </p>

              {/* Continue button */}
              <button 
                className="bottom-screen-page__button"
                onClick={handleContinue}
              >
                Continue on App
                <svg className="bottom-screen-page__button-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomSheet;