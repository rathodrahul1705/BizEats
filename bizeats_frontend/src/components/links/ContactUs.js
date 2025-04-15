import React from 'react';
import "../../assets/css/links/ContactUs.css";
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';

const ContactUs = () => {
  return (
    <div className="contactus">
      <div className="contactus__hero">
        <h1>Contact Us</h1>
        <p>We’d love to hear from you! Let’s talk food, support, or anything else.</p>
      </div>

      <div className="contactus__container">

        <div className="contactus__info">
          <h2>Get in Touch</h2>
          <p><MdLocationOn /> 103/11 Vastu Anand Complex kalwa Thane, India</p>
          <p><MdEmail /> contact@eatoor.com</p>
          <p><MdPhone /> +91 8108662484</p>
        </div>

        <div className="contactus__form">
          <h2>Send Us a Message</h2>
          <form>
            <input type="text" placeholder="Your Name" required />
            <input type="email" placeholder="Your Email" required />
            <textarea placeholder="Your Message" rows="5" required></textarea>
            <button type="submit">Send Message</button>
          </form>
        </div>

      </div>

      {/* Optional: Google Maps Section */}
      {/* <div className="contactus__map">
        <iframe
          title="EATOOR Location"
          src="https://www.google.com/maps/embed?pb=!1m18..."
          frameBorder="0"
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div> */}
    </div>
  );
};

export default ContactUs;
