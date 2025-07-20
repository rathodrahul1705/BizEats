import React from 'react';
import { 
  FaTimesCircle,
  FaPhoneAlt,
  FaMoneyBillWave,
  FaExchangeAlt,
  FaBan,
  FaQuestionCircle
} from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import "../../assets/css/links/CancellationPolicy.css";

const CancellationPolicy = () => {
  const sections = [
    {
      title: "1. Order Cancellation",
      content: "You can cancel your order within 5 minutes of placing it, provided the restaurant hasn't started preparing it. After this window, cancellations may not be accepted.",
      icon: <FaTimesCircle />
    },
    {
      title: "2. How to Cancel",
      content: "To cancel an order, you can contact our support team immediately via email:",
      email: "contact@eatoor.com",
      icon: <MdEmail />
    },
    {
      title: "3. Refund Eligibility",
      items: [
        "If the restaurant rejects the order",
        "If your order was accepted but not delivered",
        "If you cancel within the 5-minute cancellation window",
        "If there's a proven quality or hygiene issue with the order"
      ],
      icon: <FaMoneyBillWave />
    },
    {
      title: "4. Refund Process",
      content: "Refunds (if eligible) will be processed to the original payment method within 5-7 business days. You'll be notified via email/SMS once processed.",
      icon: <FaExchangeAlt />
    },
    {
      title: "5. No Refund Cases",
      items: [
        "If incorrect address details were provided",
        "If you're not available to receive the order",
        "If the cancellation window has passed and the food is already prepared/delivered"
      ],
      icon: <FaBan />
    },
    {
      title: "6. Need Help?",
      content: "For any issues or clarification, reach out to us at",
      email: "contact@eatoor.com",
      phone: "+91 8108662484",
      icon: <FaQuestionCircle />
    }
  ];

  return (
    <div className="cancel-policy">
      {/* Hero Section */}
      <div className="cancel-policy__hero">
        <div className="cancel-policy__hero-content">
          <h1>Cancellation & Refund Policy</h1>
          <p className="subtitle">Effective Date: April 15, 2025</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="cancel-policy__content">
        {sections.map((section, index) => (
          <section key={index} className="policy-section">
            <div className="section-header">
              <div className="section-icon">
                {section.icon}
              </div>
              <h2>{section.title}</h2>
            </div>
            {section.content && (
              <p>
                {section.content} 
                {section.email && (
                  <a href={`mailto:${section.email}`}>{section.email}</a>
                )}
                {section.phone && (
                  <span> or call <a href={`tel:${section.phone.replace(/\s+/g, '')}`}>{section.phone}</a></span>
                )}
              </p>
            )}
            {section.items && (
              <ul className="policy-list">
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

export default CancellationPolicy;