import React, { useState } from 'react';
import "../../assets/css/links/ContactUs.css";
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';
import API_ENDPOINTS from "../../components/config/apiConfig";
import fetchData from "../../components/services/apiService";
import StripeLoader from "../../loader/StripeLoader";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback('');

    try {
      const response = await fetchData(API_ENDPOINTS.CONTACT.CONTACT_US, 'POST', formData);

      if (response?.message) {
        setFeedback(response.message);
        setFormData({ name: '', email: '', message: '' });
      } else {
        setFeedback('Unexpected response. Please try again later.');
      }
    } catch (error) {
      const errorMsg = error?.errors
        ? Object.values(error.errors).flat().join(' ')
        : 'An error occurred. Please try again.';
      setFeedback(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contactus">
      <div className="contactus__hero">
        <h1>Contact Us</h1>
        <p>We’d love to hear from you! Let’s talk food, support, or anything else.</p>
      </div>

      <div className="contactus__container">

        <div className="contactus__info">
          <h2>Get in Touch</h2>
          <p><MdLocationOn /> 103/11 Vastu Anand Complex Kalwa, Thane, India</p>
          <p><MdEmail /> contact@eatoor.com</p>
          <p><MdPhone /> +91 8108662484</p>
        </div>

        <div className="contactus__form">
          <h2>Send Us a Message</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <textarea
              name="message"
              placeholder="Your Message"
              rows="5"
              value={formData.message}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <StripeLoader height={20} width={20} /> Sending...
                </div>
              ) : (
                'Send Message'
              )}
            </button>

            {feedback && (
              <p className="contactus__feedback">{feedback}</p>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default ContactUs;
