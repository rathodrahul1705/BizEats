import React from 'react';
import "../../assets/css/links/AboutUs.css";

const AboutUs = () => {
  return (
    <div className="aboutus">
      <div className="aboutus__hero">
        <h1>About EATOOR</h1>
        <p>Delicious Homemade Meals, Just Around the Corner.</p>
      </div>

      <div className="aboutus__content">
        <section className="aboutus__section">
          <h2>Who We Are</h2>
          <p>
            EATOOR is a homegrown food delivery platform committed to connecting local kitchens and food vendors with hungry customers. 
            Born out of a passion for great food and convenience, we are redefining how people enjoy meals—fresh, fast, and full of flavor.
          </p>
        </section>

        <section className="aboutus__section aboutus__section--image">
          <img src="/eatoorweb.svg" alt="Food delivery" />
        </section>

        <section className="aboutus__section">
          <h2>Our Mission</h2>
          <p>
            To empower local food businesses by providing them a digital space to thrive, and to ensure customers receive quality meals from their favorite kitchens with speed and trust.
          </p>
        </section>

        <section className="aboutus__section">
          <h2>Why Choose EATOOR?</h2>
          <ul className="aboutus__list">
            <li>🚀 Fast & Reliable Deliveries</li>
            <li>👨‍🍳 Authentic Home-Cooked Meals</li>
            <li>💡 Transparent Pricing</li>
            <li>📍 Hyperlocal Vendors</li>
            <li>❤️ Customer-First Support</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
