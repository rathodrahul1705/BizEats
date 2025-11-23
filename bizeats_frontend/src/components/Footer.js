import React from 'react';
import { FaInstagram, FaFacebook, FaYoutube } from 'react-icons/fa';
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';
import { Link } from 'react-router-dom';
import "../assets/css/Footer.css";

// Import app store badges - make sure these images are in your assets folder
import AppStoreBadge from "../assets/img/app-store-badge.jpg";
import PlayStoreBadge from "../assets/img/play-store-badge.png";

const Footer = () => {
  const TwitterXIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1227" width="1em" height="1em" fill="currentColor">
      <path d="M685.5 529.5L1170 0H1064L627 480.5L250 0H0L509 690L0 1227H106L573 720.5L963 1227H1200L685.5 529.5Z" />
    </svg>
  );

  return (
    <footer className="footer">
      {/* Desktop Footer (hidden on mobile) */}
      <div className="footer__desktop">
        <div className="footer__container">
          <div className="footer__section footer__logo-section">
            <Link to="/" className="footer__logo-link">
              <img
                src="/eatoorweb.svg"
                alt="EATOOR Logo"
                className="footer__logo-image"
                loading="lazy"
              />
            </Link>
            <p className="footer__tagline">
              Delivering delicious experiences to your doorstep
            </p>
            <div className="footer__social">
              <a href="https://www.instagram.com/eatoor.official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61575132847349" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <FaFacebook />
              </a>
              <a href="https://x.com/eatoor_official" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
                <TwitterXIcon />
              </a>
            </div>
          </div>

          <div className="footer__section">
            <h3 className="footer__heading">Quick Links</h3>
            <ul className="footer__links">
              <li><Link to="/about-us">About Us</Link></li>
              <li><Link to="/contact-us">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions">Terms & Conditions</Link></li>
              <li><Link to="/cancellation-refund-policy">Cancellation Policy</Link></li>
            </ul>
          </div>

          <div className="footer__section">
            <h3 className="footer__heading">Contact Us</h3>
            <div className="footer__contact-info">
              <a href="mailto:contact@eatoor.com">
                <MdEmail /> contact@eatoor.com
              </a>
              <a href="tel:+918108662484">
                <MdPhone /> +91 8108662484
              </a>
              <div className="footer__address">
                <MdLocationOn /> Thane, Mumbai
              </div>
            </div>
          </div>

          {/* Updated Section: App Downloads instead of Newsletter */}
          <div className="footer__section">
            <h3 className="footer__heading">Download Our App</h3>
            <p className="footer__download-text">
              Get the best experience on mobile
            </p>
            <div className="footer__app-downloads">
              <a 
                href="https://apps.apple.com/app/eatoor" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer__app-link"
              >
                <img 
                  src={AppStoreBadge} 
                  alt="Download on the App Store" 
                  className="footer__app-badge"
                />
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=com.eatoor" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="footer__app-link"
              >
                <img 
                  src={PlayStoreBadge} 
                  alt="Get it on Google Play" 
                  className="footer__app-badge"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="footer__web-bottom">
          <div className="footer__copyright-mobile">
            © {new Date().getFullYear()} EATOOR. All rights reserved.
          </div>
        </div>
      </div>

      {/* Mobile Footer (hidden on desktop) */}
      <div className="footer__mobile">
        <div className="footer__mobile-top">
          <div className="footer__logo-mobile">
            <Link to="/">
              <img 
                src="/eatoormob.svg" 
                alt="EATOOR Logo" 
                className="footer__logo-image"
                loading="lazy"
              />
            </Link>
          </div>
          
          <div className="footer__social-mobile">
            <a href="https://www.instagram.com/eatoor.official/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61575132847349" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook />
            </a>
            <a href="https://x.com/eatoor_official" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
              <TwitterXIcon />
            </a>
          </div>
        </div>

        <div className="footer__mobile-accordion">
          <details className="footer__accordion-item">
            <summary className="footer__accordion-header">
              Quick Links
              <span className="footer__accordion-icon">+</span>
            </summary>
            <ul className="footer__mobile-links">
              <li><Link to="/about-us">About Us</Link></li>
              <li><Link to="/contact-us">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-and-conditions">Terms & Conditions</Link></li>
              <li><Link to="/cancellation-refund-policy">Cancellation Policy</Link></li>
            </ul>
          </details>

          <details className="footer__accordion-item">
            <summary className="footer__accordion-header">
              Contact Info
              <span className="footer__accordion-icon">+</span>
            </summary>
            <div className="footer__mobile-contact">
              <a href="mailto:contact@eatoor.com">
                <MdEmail /> contact@eatoor.com
              </a>
              <a href="tel:+918108662484">
                <MdPhone /> +91 8108662484
              </a>
              <div className="footer__mobile-address">
                <MdLocationOn /> Thane, Mumbai
              </div>
            </div>
          </details>

          <details className="footer__accordion-item">
            <summary className="footer__accordion-header">
              Working Hours
              <span className="footer__accordion-icon">+</span>
            </summary>
            <div className="footer__mobile-hours">
              <p><strong>Monday - Sunday</strong></p>
              <p>10:00 AM - 10:00 PM</p>
            </div>
          </details>
        </div>

        {/* Updated Mobile Section: App Downloads instead of Newsletter */}
        <div className="footer__mobile-apps">
          <h4>Download Our App</h4>
          <p className="footer__mobile-apps-text">Get the best experience on mobile</p>
          <div className="footer__mobile-app-badges">
            <a 
              href="https://apps.apple.com/app/eatoor" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer__mobile-app-link"
            >
              <img 
                src={AppStoreBadge} 
                alt="Download on the App Store" 
                className="footer__mobile-app-badge"
              />
            </a>
            <a 
              href="https://play.google.com/store/apps/details?id=com.eatoor" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="footer__mobile-app-link"
            >
              <img 
                src={PlayStoreBadge} 
                alt="Get it on Google Play" 
                className="footer__mobile-app-badge"
              />
            </a>
          </div>
        </div>

        <div className="footer__mobile-bottom">
          <div className="footer__copyright-mobile">
            © {new Date().getFullYear()} EATOOR. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;