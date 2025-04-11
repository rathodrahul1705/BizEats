import React from "react";
import { Instagram, Facebook, Twitter, Mail, Phone } from "lucide-react";
import "../assets/css/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__top">
          <div className="footer__brand">
            <img src="/eatoorweb.svg" alt="Eatoor Logo" className="footer__logo-img" />
            <p className="footer__tagline">Delivering deliciousness to your doorstep</p>
          </div>

          <div className="footer__info">
            <h3 className="footer__heading">Connect with Us</h3>
            <div className="footer__social">
              <a href="#" className="footer__social-link"><Instagram size={20} /></a>
              <a href="#" className="footer__social-link"><Facebook size={20} /></a>
              <a href="#" className="footer__social-link"><Twitter size={20} /></a>
            </div>
            <div className="footer__contact">
              <a href="mailto:contact@eatoor.com" className="footer__contact-link">
                <Mail size={16} /> contact@eatoor.com
              </a>
              <a href="tel:+918108662484" className="footer__contact-link">
                <Phone size={16} /> +91 8108662484
              </a>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {new Date().getFullYear()} <span className="footer__brand-name">EATOOR</span>. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
