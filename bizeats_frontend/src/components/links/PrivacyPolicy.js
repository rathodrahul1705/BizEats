import React from 'react';
import { FaShieldAlt, FaCookieBite, FaUserLock, FaEnvelope } from 'react-icons/fa';
import { MdUpdate, MdShare, MdPolicy } from 'react-icons/md';
import { BiData } from 'react-icons/bi';
import "../../assets/css/links/PrivacyPolicy.css";

const PrivacyPolicy = () => {
  const sections = [
    {
      title: "1. Introduction",
      content: "Welcome to EATOOR. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.",
      icon: <MdPolicy />
    },
    {
      title: "2. Information We Collect",
      content: "We may collect the following types of information:",
      items: [
        "Personal details (e.g., name, email, phone)",
        "Order and delivery information",
        "Location data (with permission)",
        "Device and browser information"
      ],
      icon: <BiData />
    },
    {
      title: "3. How We Use Your Information",
      items: [
        "To process orders and payments",
        "To communicate updates and offers",
        "To improve user experience",
        "To ensure platform security"
      ],
      icon: <FaUserLock />
    },
    {
      title: "4. Sharing Your Information",
      content: "We do not sell your information. We may share data with trusted partners for payment processing, delivery services, and marketing (only with your consent).",
      icon: <MdShare />
    },
    {
      title: "5. Data Security",
      content: "We use secure protocols and encryption to protect your information, both online and offline.",
      icon: <FaShieldAlt />
    },
    {
      title: "6. Cookies",
      content: "We use cookies to enhance your browsing experience. You can manage cookie preferences in your browser settings.",
      icon: <FaCookieBite />
    },
    {
      title: "7. Your Rights",
      content: "You can request to view, modify, or delete your personal data by contacting us at",
      email: "contact@eatoor.com",
      icon: <FaUserLock />
    },
    {
      title: "8. Changes to This Policy",
      content: "We may update this policy occasionally. Changes will be posted on this page with an updated date.",
      icon: <MdUpdate />
    },
    {
      title: "9. Contact Us",
      content: "If you have any questions or concerns about our Privacy Policy, reach out to us at",
      email: "contact@eatoor.com",
      icon: <FaEnvelope />
    }
  ];

  return (
    <div className="privacy-policy">
      {/* Hero Section */}
      <div className="privacy-policy__hero">
        <div className="privacy-policy__hero-content">
          <h1>Privacy Policy</h1>
          <p className="subtitle">Last updated: April 15, 2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="privacy-policy__content">
        {sections.map((section, index) => (
          <section key={index} className="privacy-section">
            <div className="section-header">
              <div className="section-icon">
                {section.icon}
              </div>
              <h2>{section.title}</h2>
            </div>
            {section.content && <p>{section.content} {section.email && (
              <a href={`mailto:${section.email}`}>{section.email}</a>
            )}</p>}
            {section.items && (
              <ul className="privacy-list">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default PrivacyPolicy;