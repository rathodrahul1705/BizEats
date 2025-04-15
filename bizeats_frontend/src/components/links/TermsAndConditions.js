import React from 'react';
import "../../assets/css/links/TermsAndConditions.css";

const TermsAndConditions = () => {
  return (
    <div className="terms">
      <div className="terms__hero">
        <h1>Terms & Conditions</h1>
        <p>Effective Date: April 15, 2025</p>
      </div>

      <div className="terms__container">
        <section>
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>EATOOR</strong>. These Terms & Conditions govern your use of our website, mobile app, and services. By accessing or using EATOOR, you agree to these terms.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>You must be at least 18 years old to use our services or have permission from a legal guardian.</p>
        </section>

        <section>
          <h2>3. User Account</h2>
          <p>
            When creating an account, you agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your login credentials.
          </p>
        </section>

        <section>
          <h2>4. Orders & Payments</h2>
          <p>
            All orders placed through EATOOR are subject to acceptance. Prices and availability of menu items may vary. Payment is required at the time of ordering.
          </p>
        </section>

        <section>
          <h2>5. Cancellation & Refunds</h2>
          <p>
            Please refer to our <a href="/cancellation-refund-policy">Cancellation & Refund Policy</a> for details on cancellations and refunds.
          </p>
        </section>

        <section>
          <h2>6. Prohibited Activities</h2>
          <ul>
            <li>Misusing the platform or posting false information</li>
            <li>Attempting to gain unauthorized access to the system</li>
            <li>Engaging in fraudulent transactions</li>
          </ul>
        </section>

        <section>
          <h2>7. Intellectual Property</h2>
          <p>
            All content on EATOOR, including logos, images, and code, is the property of EATOOR and protected under copyright laws.
          </p>
        </section>

        <section>
          <h2>8. Modifications</h2>
          <p>
            EATOOR reserves the right to modify these terms at any time. Updates will be posted on this page with an updated effective date.
          </p>
        </section>

        <section>
          <h2>9. Contact Us</h2>
          <p>If you have any questions regarding these Terms, please email us at <strong>contact@eatoor.com</strong>.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditions;
