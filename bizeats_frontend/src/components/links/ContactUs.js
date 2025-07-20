import React, { useState } from 'react';
import { MdEmail, MdPhone, MdLocationOn, MdSend } from 'react-icons/md';
import { FaUser, FaEnvelope, FaComment } from 'react-icons/fa';
import API_ENDPOINTS from "../../components/config/apiConfig";
import fetchData from "../../components/services/apiService";
import StripeLoader from "../../loader/StripeLoader";
import "../../assets/css/links/ContactUs.css";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ message: '', type: '' });

    try {
      const response = await fetchData(API_ENDPOINTS.CONTACT.CONTACT_US, 'POST', formData);

      if (response?.message) {
        setFeedback({ message: response.message, type: 'success' });
        setFormData({ name: '', email: '', message: '' });
      } else {
        setFeedback({ message: 'Unexpected response. Please try again later.', type: 'error' });
      }
    } catch (error) {
      const errorMsg = error?.errors
        ? Object.values(error.errors).flat().join(' ')
        : 'An error occurred. Please try again.';
      setFeedback({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contactus">
      {/* Hero Section */}
      <div className="contactus__hero">
        <div className="contactus__hero-content">
          <h1>Contact Us</h1>
          <p className="subtitle">We'd love to hear from you! Let's talk food, support, or anything else.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="contactus__content">
        {/* Contact Info Section */}
        <section className="contactus__section contactus__section--info">
          <h2>Get in Touch</h2>
          <div className="contact-info__items">
            <div className="contact-info__item">
              <div className="contact-info__icon">
                <MdLocationOn />
              </div>
              <div className="contact-info__text">
                <h3>Our Location</h3>
                <p>103/11 Vastu Anand Complex Kalwa, Thane, India</p>
              </div>
            </div>
            <div className="contact-info__item">
              <div className="contact-info__icon">
                <MdEmail />
              </div>
              <div className="contact-info__text">
                <h3>Email Us</h3>
                <p>contact@eatoor.com</p>
              </div>
            </div>
            <div className="contact-info__item">
              <div className="contact-info__icon">
                <MdPhone />
              </div>
              <div className="contact-info__text">
                <h3>Call Us</h3>
                <p>+91 8108662484</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="contactus__section contactus__section--form">
          <h2>Send Us a Message</h2>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <div className="input-icon">
                <FaUser />
              </div>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <div className="input-icon">
                <FaEnvelope />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <div className="input-icon">
                <FaComment />
              </div>
              <textarea
                name="message"
                placeholder="Your Message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <div className="btn-loading">
                  <StripeLoader height={20} width={20} /> Sending...
                </div>
              ) : (
                <>
                  <MdSend className="send-icon" /> Send Message
                </>
              )}
            </button>

            {feedback.message && (
              <div className={`feedback-message ${feedback.type}`}>
                {feedback.message}
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};

export default ContactUs;