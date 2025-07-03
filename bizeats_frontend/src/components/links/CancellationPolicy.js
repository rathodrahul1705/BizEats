import React from 'react';
import "../../assets/css/links/CancellationPolicy.css";

const CancellationPolicy = () => {
  return (
    <div className="cancel-policy">
      <div className="cancel-policy__hero">
        <h1>Cancellation & Refund Policy</h1>
        <p>Effective Date: April 15, 2025</p>
      </div>

      <div className="cancel-policy__container">
        <section>
          <h2>1. Order Cancellation</h2>
          <p>
            You can cancel your order within <strong>5 minutes</strong> of placing it, provided the restaurant hasn't started preparing it. After this window, cancellations may not be accepted.
          </p>
        </section>

        <section>
          <h2>2. How to Cancel</h2>
          <p>
            To cancel an order, You can contact our support team immediately via email: <a href="mailto:contact@eatoor.com">contact@eatoor.com</a>.
          </p>
        </section>

        <section>
          <h2>3. Refund Eligibility</h2>
          <ul>
            <li>If the restaurant rejects the order.</li>
            <li>If your order was accepted but not delivered.</li>
            <li>If you cancel within the 5-minute cancellation window.</li>
            <li>If there's a proven quality or hygiene issue with the order.</li>
          </ul>
        </section>

        <section>
          <h2>4. Refund Process</h2>
          <p>
            Refunds (if eligible) will be processed to the original payment method within <strong>5-7 business days</strong>. You'll be notified via email/SMS once processed.
          </p>
        </section>

        <section>
          <h2>5. No Refund Cases</h2>
          <ul>
            <li>If incorrect address details were provided.</li>
            <li>If you're not available to receive the order.</li>
            <li>If the cancellation window has passed and the food is already prepared/delivered.</li>
          </ul>
        </section>

        <section>
          <h2>6. Need Help?</h2>
          <p>
            For any issues or clarification, reach out to us at <strong>contact@eatoor.com</strong> or call <strong>+91 8108662484</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default CancellationPolicy;
