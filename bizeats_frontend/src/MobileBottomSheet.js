import React, { useState, useEffect } from 'react';
import '../src/assets/css/MobileBottomSheet.css';

const MobileBottomSheet = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstagram, setIsInstagram] = useState(false);

  // Detect if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /android|iphone|ipad|ipod|blackberry|windows phone/i;
      return mobileRegex.test(userAgent.toLowerCase());
    };

    setIsMobile(checkMobile());
  }, []);

  // Check for Instagram
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isInstagramBrowser = /instagram/i.test(userAgent.toLowerCase());
    setIsInstagram(isInstagramBrowser);
    
    // Debug logging
    if (isInstagramBrowser) {
      console.log('Running in Instagram browser');
      console.log('User Agent:', userAgent);
    }
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

  // Detect which social media platform the user is on
  const detectSocialMedia = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const ua = userAgent.toLowerCase();
    
    const socialMedia = {
      instagram: /instagram/i.test(ua),
      facebook: /facebook|fbav|fban/i.test(ua),
      twitter: /twitter|tweetdeck/i.test(ua),
      tiktok: /tiktok/i.test(ua),
      snapchat: /snapchat/i.test(ua),
      linkedin: /linkedin/i.test(ua),
      pinterest: /pinterest/i.test(ua),
      reddit: /reddit/i.test(ua),
      whatsapp: /whatsapp/i.test(ua),
      telegram: /telegram/i.test(ua),
      messenger: /messenger/i.test(ua),
      wechat: /micromessenger/i.test(ua),
      youtube: /youtube/i.test(ua),
    };

    return socialMedia;
  };

  // Get the social media name for display
  const getSocialMediaName = () => {
    const socials = detectSocialMedia();
    const activeSocials = Object.entries(socials).filter(([_, active]) => active);
    
    if (activeSocials.length === 0) return null;
    
    const socialNames = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      twitter: 'Twitter/X',
      tiktok: 'TikTok',
      snapchat: 'Snapchat',
      linkedin: 'LinkedIn',
      pinterest: 'Pinterest',
      reddit: 'Reddit',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      messenger: 'Messenger',
      wechat: 'WeChat',
      youtube: 'YouTube',
    };
    
    return socialNames[activeSocials[0][0]] || null;
  };

  // Instagram-specific URL opening
  const openInstagramLink = (url) => {
    return new Promise((resolve, reject) => {
      try {
        // Method 1: Create a hidden anchor and click it
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Get app store link based on device
  const getAppStoreLinks = () => {
    const deviceType = getDeviceType();
    const androidLink = 'https://play.google.com/store/apps/details?id=com.eatoor';
    const iosLink = 'https://apps.apple.com/in/app/eatoor/id6756539381';
    
    // Instagram specific links
    if (isInstagram) {
      if (deviceType === 'android') {
        return {
          primary: `intent://details?id=com.eatoor#Intent;scheme=market;action=android.intent.action.VIEW;end`,
          fallback: androidLink,
          direct: androidLink,
          deepLink: 'market://details?id=com.eatoor'
        };
      } else if (deviceType === 'ios') {
        return {
          primary: iosLink,
          fallback: iosLink,
          direct: iosLink,
          deepLink: 'itms-apps://apps.apple.com/in/app/eatoor/id6756539381'
        };
      }
    }
    
    // Regular links
    if (deviceType === 'android') {
      return {
        primary: androidLink,
        fallback: androidLink,
        direct: androidLink,
        deepLink: 'market://details?id=com.eatoor'
      };
    } else if (deviceType === 'ios') {
      return {
        primary: iosLink,
        fallback: iosLink,
        direct: iosLink,
        deepLink: 'itms-apps://apps.apple.com/in/app/eatoor/id6756539381'
      };
    }
    
    return { primary: '#', fallback: '#', direct: '#', deepLink: '#' };
  };

  // Main function to handle opening URL
  const openAppStore = async () => {
    const links = getAppStoreLinks();
    const deviceType = getDeviceType();
    
    console.log('Attempting to open:', links);
    console.log('Device type:', deviceType);
    console.log('Is Instagram:', isInstagram);

    if (isInstagram) {
      // Instagram specific handling
      if (deviceType === 'android') {
        // Try multiple methods for Android Instagram
        try {
          // Method 1: Try deep link first
          const deepLinkAnchor = document.createElement('a');
          deepLinkAnchor.href = links.deepLink;
          deepLinkAnchor.target = '_blank';
          deepLinkAnchor.style.display = 'none';
          document.body.appendChild(deepLinkAnchor);
          deepLinkAnchor.click();
          document.body.removeChild(deepLinkAnchor);
          
          // Method 2: Try intent after a short delay
          setTimeout(() => {
            const intentAnchor = document.createElement('a');
            intentAnchor.href = links.primary;
            intentAnchor.target = '_blank';
            intentAnchor.style.display = 'none';
            document.body.appendChild(intentAnchor);
            intentAnchor.click();
            document.body.removeChild(intentAnchor);
          }, 300);
          
          // Method 3: Fallback to direct URL if nothing works
          setTimeout(() => {
            window.open(links.fallback, '_blank');
          }, 800);
          
        } catch (error) {
          console.error('Android Instagram navigation failed:', error);
          // Ultimate fallback
          window.open(links.fallback, '_blank');
        }
      } else if (deviceType === 'ios') {
        // iOS Instagram handling
        try {
          // Try App Store link
          const link = document.createElement('a');
          link.href = links.primary;
          link.target = '_blank';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Fallback for iOS
          setTimeout(() => {
            window.location.href = links.primary;
          }, 500);
          
        } catch (error) {
          console.error('iOS Instagram navigation failed:', error);
          window.location.href = links.fallback;
        }
      }
    } else {
      // Non-Instagram handling
      try {
        // Try primary link
        const link = document.createElement('a');
        link.href = links.primary;
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fallback if primary doesn't work
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = links.fallback;
          }
        }, 2000);
      } catch (error) {
        console.error('Navigation failed:', error);
        window.location.href = links.fallback;
      }
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    
    try {
      await openAppStore();
    } catch (error) {
      console.error('Error in handleContinue:', error);
      // Final fallback
      const links = getAppStoreLinks();
      window.open(links.fallback, '_blank');
    }
    
    // Reset loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const handleClose = () => {
    if (isLoading) return;
    
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 400);
  };

  // Don't render on desktop
  if (!isMobile) return null;

  const socialMediaName = getSocialMediaName();
  const isInAppBrowser = Object.values(detectSocialMedia()).some(val => val === true);

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
              disabled={isLoading}
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
                {isInstagram ? 'Open in App Store' : 
                 (isInAppBrowser && socialMediaName ? `Continue on ${socialMediaName} App` : 'Continue on App')}
              </h3>
              
              <p className="bottom-screen-page__description">
                {isInstagram 
                  ? 'Download our app for the best experience' 
                  : (isInAppBrowser && socialMediaName 
                    ? `Get the best experience on our mobile app` 
                    : 'Get the best experience on our mobile app')}
              </p>

              {/* Continue button with loader */}
              <button 
                className={`bottom-screen-page__button ${isLoading ? 'bottom-screen-page__button--loading' : ''}`}
                onClick={handleContinue}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="bottom-screen-page__spinner"></span>
                    Opening App Store...
                  </>
                ) : (
                  <>
                    {isInstagram ? 'Open in App Store' :
                     (isInAppBrowser && socialMediaName ? `Continue on ${socialMediaName}` : 'Continue on App')}
                    <svg className="bottom-screen-page__button-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
              
              {/* Additional help text for Instagram */}
              {isInstagram && (
                <p className="bottom-screen-page__helper-text">
                  ⚡ If the app store doesn't open, tap the three dots (•••) in the top right and select "Open in Safari/Chrome"
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomSheet;