import React from 'react';
import { 
  FaUserShield, 
  FaUserCircle, 
  FaCreditCard, 
  FaExchangeAlt, 
  FaBan,
  FaCopyright,
  FaEdit,
  FaEnvelope
} from 'react-icons/fa';
import { MdPolicy } from 'react-icons/md';
import "../../assets/css/links/TermsAndConditions.css";

const TermsAndConditions = () => {
  const sections = [
    {
      title: "1. Introduction",
      content: "Welcome to EATOOR. These Terms & Conditions govern your use of our website, mobile app, and services. By accessing or using EATOOR, you agree to these terms.",
      icon: <MdPolicy />
    },
    {
      title: "2. User Account",
      content: "When creating an account, you agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your login credentials.",
      icon: <FaUserCircle />
    },
    {
      title: "3. Orders & Payments",
      content: "All orders placed through EATOOR are subject to acceptance. Prices and availability of menu items may vary. Payment is required at the time of ordering.",
      icon: <FaCreditCard />
    },
    {
      title: "4. Cancellation & Refunds",
      content: "Please refer to our",
      link: {
        text: "Cancellation & Refund Policy",
        url: "/cancellation-refund-policy"
      },
      icon: <FaExchangeAlt />
    },
    {
      title: "5. Prohibited Activities",
      items: [
        "Misusing the platform or posting false information",
        "Attempting to gain unauthorized access to the system",
        "Engaging in fraudulent transactions"
      ],
      icon: <FaBan />
    },
    {
      title: "6. Intellectual Property",
      content: "All content on EATOOR, including logos, images, and code, is the property of EATOOR and protected under copyright laws.",
      icon: <FaCopyright />
    },
    {
      title: "7. Modifications",
      content: "EATOOR reserves the right to modify these terms at any time. Updates will be posted on this page with an updated effective date.",
      icon: <FaEdit />
    },
    {
      title: "8. Contact Us",
      content: "If you have any questions regarding these Terms, please email us at",
      email: "contact@eatoor.com",
      icon: <FaEnvelope />
    }
  ];

  return (
    <div className="terms">
      {/* Hero Section */}
      <div className="terms__hero">
        <div className="terms__hero-content">
          <h1>Terms & Conditions</h1>
          <p className="subtitle">Effective Date: April 15, 2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="terms__content">
        {sections.map((section, index) => (
          <section key={index} className="terms-section">
            <div className="section-header">
              <div className="section-icon">
                {section.icon}
              </div>
              <h2>{section.title}</h2>
            </div>
            {section.content && (
              <p>
                {section.content} 
                {section.link && (
                  <a href={section.link.url}>{section.link.text}</a>
                )}
                {section.email && (
                  <a href={`mailto:${section.email}`}>{section.email}</a>
                )}
              </p>
            )}
            {section.items && (
              <ul className="terms-list">
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

export default TermsAndConditions;