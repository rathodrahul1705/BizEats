import React from "react";
import { Instagram, Facebook, Twitter, Mail, Phone } from "lucide-react";
import "../assets/css/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__top">
          <div className="footer__logo">
            <img src="/eatoorweb.svg" alt="Eatoor Logo" className="footer__logo-img" />
            <p className="footer__tagline">Delivering deliciousness to your doorstep</p>
          </div>

          <div className="footer__links">
            <div className="footer__column">
              <h3 className="footer__heading">Company</h3>
              <ul className="footer__list">
                <li><a href="/about" className="footer__link">About Us</a></li>
                <li><a href="/careers" className="footer__link">Careers</a></li>
                <li><a href="/blog" className="footer__link">Blog</a></li>
              </ul>
            </div>

            <div className="footer__column">
              <h3 className="footer__heading">Help</h3>
              <ul className="footer__list">
                <li><a href="/contact" className="footer__link">Contact</a></li>
                <li><a href="/faq" className="footer__link">FAQs</a></li>
                <li><a href="/privacy" className="footer__link">Privacy Policy</a></li>
              </ul>
            </div>

            <div className="footer__column">
              <h3 className="footer__heading">Connect</h3>
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
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">&copy; {new Date().getFullYear()} Eatoor. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
