import React from 'react';
import { FaInstagram, FaFacebook, FaTwitter } from 'react-icons/fa';
import { MdEmail, MdPhone } from 'react-icons/md';
import { Link } from 'react-router-dom';
import "../assets/css/Footer.css";

const Footer = () => {
  const isMobile = window.innerWidth < 768;

  return (
    <footer className="footer">
      <div className="footer__container">

        <div className="footer__section footer__logo">
          <Link to="/" className="footer__logo-link">
            <img
              src={isMobile ? "/eatoormob.svg" : "/eatoorweb.svg"}
              alt="EATOOR Logo"
              className="footer__logo-image"
            />
          </Link>
        </div>

        <div className="footer__section">
          <h3 className="footer__heading">Quick Links</h3>
          <ul className="footer__links">
            <li><Link to="/about-us" className="footer__link">About Us</Link></li>
            <li><Link to="/contact-us" className="footer__link">Contact Us</Link></li>
            {/* <li><Link to="/pricing" className="footer__link">Pricing</Link></li> */}
            <li><Link to="/privacy-policy" className="footer__link">Privacy Policy</Link></li>
            
            <li><Link to="/terms-and-conditions" className="footer__link">Terms & Conditions</Link></li>
            <li><Link to="/cancellation-refund-policy" className="footer__link">Cancellation / Refund Policy</Link></li>
          </ul>
        </div>

        <div className="footer__section">
          <h3 className="footer__heading">Connect with Us</h3>
          <div className="footer__social">
            <a href="https://www.instagram.com" className="footer__social-link" target="_blank" rel="noopener noreferrer">
              <FaInstagram />
            </a>
            <a href="https://www.facebook.com" className="footer__social-link" target="_blank" rel="noopener noreferrer">
              <FaFacebook />
            </a>
            <a href="https://www.twitter.com" className="footer__social-link" target="_blank" rel="noopener noreferrer">
              <FaTwitter />
            </a>
          </div>
        </div>

        <div className="footer__section">
          <h3 className="footer__heading">Contact Us</h3>
          <div className="footer__contact">
            <a href="mailto:contact@eatoor.com" className="footer__contact-link">
              <MdEmail /> contact@eatoor.com
            </a>
            <a href="tel:+918108662484" className="footer__contact-link">
              <MdPhone /> +91 8108662484
            </a>
          </div>
        </div>

      </div>

      <div className="footer__bottom">
        <p>© 2025 <strong>EATOOR</strong> – All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
