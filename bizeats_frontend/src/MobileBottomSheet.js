import React, { useState, useEffect } from 'react';
import '../src/assets/css/MobileBottomSheet.css';

const MobileBottomSheet = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    
    // Return the first active social media
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

  // Get app store link based on device and social media platform
  const getAppStoreLink = () => {
    const deviceType = getDeviceType();
    const socials = detectSocialMedia();
    const isInAppBrowser = Object.values(socials).some(val => val === true);
    
    // App store links
    const androidLink = 'https://play.google.com/store/apps/details?id=com.eatoor';
    const iosLink = 'https://apps.apple.com/in/app/eatoor/id6756539381';
    
    // Special handling for different social media platforms
    if (isInAppBrowser) {
      // Instagram specific handling
      if (socials.instagram && deviceType === 'android') {
        return `intent://details?id=com.eatoor#Intent;scheme=market;action=android.intent.action.VIEW;end`;
      }
      
      // Facebook specific handling
      if (socials.facebook && deviceType === 'android') {
        // Use Facebook's in-app browser handling
        return `https://play.google.com/store/apps/details?id=com.eatoor`;
      }
      
      // TikTok specific handling
      if (socials.tiktok && deviceType === 'android') {
        return `intent://details?id=com.eatoor#Intent;scheme=market;action=android.intent.action.VIEW;end`;
      }
      
      // Twitter/X specific handling
      if (socials.twitter && deviceType === 'android') {
        return `intent://details?id=com.eatoor#Intent;scheme=market;action=android.intent.action.VIEW;end`;
      }
      
      // LinkedIn specific handling
      if (socials.linkedin && deviceType === 'android') {
        return `https://play.google.com/store/apps/details?id=com.eatoor`;
      }
      
      // For iOS, use universal link or App Store link
      if (deviceType === 'ios') {
        return iosLink;
      }
    }
    
    // Default links
    if (deviceType === 'android') {
      return androidLink;
    } else if (deviceType === 'ios') {
      return iosLink;
    }
    return '#';
  };

  // Get fallback link for social media platforms
  const getFallbackLink = () => {
    const deviceType = getDeviceType();
    
    if (deviceType === 'android') {
      return 'https://play.google.com/store/apps/details?id=com.eatoor';
    } else if (deviceType === 'ios') {
      return 'https://apps.apple.com/in/app/eatoor/id6756539381';
    }
    return '#';
  };

  const handleContinue = async () => {
    setIsLoading(true);
    
    // Show loader for at least 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const link = getAppStoreLink();
    const fallbackLink = getFallbackLink();
    const deviceType = getDeviceType();
    const socials = detectSocialMedia();
    const isInAppBrowser = Object.values(socials).some(val => val === true);
    
    if (link !== '#') {
      try {
        // Special handling for Instagram
        if (socials.instagram && deviceType === 'android') {
          // Try intent first
          const anchor = document.createElement('a');
          anchor.href = link;
          anchor.target = '_blank';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          
          // Fallback to Play Store
          setTimeout(() => {
            window.location.href = fallbackLink;
          }, 1500);
          return;
        }
        
        // Special handling for Facebook
        if (socials.facebook && deviceType === 'android') {
          // For Facebook, sometimes direct link works better
          window.location.href = link;
          
          // Fallback if it doesn't work
          setTimeout(() => {
            if (!document.hidden) {
              window.location.href = fallbackLink;
            }
          }, 2000);
          return;
        }
        
        // Special handling for TikTok, Twitter/X, Snapchat
        if ((socials.tiktok || socials.twitter || socials.snapchat) && deviceType === 'android') {
          // Try to open with intent
          const anchor = document.createElement('a');
          anchor.href = link;
          anchor.target = '_blank';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          
          // Fallback
          setTimeout(() => {
            window.location.href = fallbackLink;
          }, 1500);
          return;
        }
        
        // For iOS and other platforms
        if (isInAppBrowser && deviceType === 'ios') {
          // Use a timeout to handle iOS in-app browsers
          window.location.href = link;
          
          // If still in same tab after 3 seconds, try fallback
          setTimeout(() => {
            if (!document.hidden) {
              window.location.href = fallbackLink;
            }
          }, 3000);
          return;
        }
        
        // Default navigation
        window.location.href = link;
        
      } catch (error) {
        console.error('Navigation error:', error);
        // Final fallback
        window.location.href = fallbackLink;
      }
    }
    
    // Reset loading state after navigation attempt
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

  // Get social media name for personalized messaging
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
                {isInAppBrowser && socialMediaName 
                  ? `Continue on ${socialMediaName} App` 
                  : 'Continue on App'}
              </h3>
              
              <p className="bottom-screen-page__description">
                {isInAppBrowser && socialMediaName 
                  ? `Get the best experience on our mobile app` 
                  : 'Get the best experience on our mobile app'}
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
                    Opening App...
                  </>
                ) : (
                  <>
                    {isInAppBrowser && socialMediaName 
                      ? `Continue on ${socialMediaName}` 
                      : 'Continue on App'}
                    <svg className="bottom-screen-page__button-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomSheet;