import React from 'react';
import "../../assets/css/links/PrivacyPolicy.css";

const PrivacyPolicy = () => {
  return (
    <div className="privacy-policy">
      <div className="privacy-policy__hero">
        <h1>Privacy Policy</h1>
        <p>Last updated: April 15, 2025</p>
      </div>

      <div className="privacy-policy__container">
        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>EATOOR</strong>. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>Personal details (e.g., name, email, phone)</li>
            <li>Order and delivery information</li>
            <li>Location data (with permission)</li>
            <li>Device and browser information</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To process orders and payments</li>
            <li>To communicate updates and offers</li>
            <li>To improve user experience</li>
            <li>To ensure platform security</li>
          </ul>
        </section>

        <section>
          <h2>4. Sharing Your Information</h2>
          <p>
            We do not sell your information. We may share data with trusted partners for payment processing, delivery services, and marketing (only with your consent).
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>We use secure protocols and encryption to protect your information, both online and offline.</p>
        </section>

        <section>
          <h2>6. Cookies</h2>
          <p>We use cookies to enhance your browsing experience. You can manage cookie preferences in your browser settings.</p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You can request to view, modify, or delete your personal data by contacting us at <a href="mailto:contact@eatoor.com">contact@eatoor.com</a>.</p>
        </section>

        <section>
          <h2>8. Changes to This Policy</h2>
          <p>We may update this policy occasionally. Changes will be posted on this page with an updated date.</p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>If you have any questions or concerns about our Privacy Policy, reach out to us at <strong>contact@eatoor.com</strong>.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
