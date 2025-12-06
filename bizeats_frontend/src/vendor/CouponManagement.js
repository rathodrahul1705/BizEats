import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../src/assets/css/vendor/CouponManagement.css';
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { useParams, useNavigate } from "react-router-dom";

// Icons
import { 
  FiPlus, FiRefreshCw, FiEdit2, FiTrash2, FiX, 
  FiCheck, FiCalendar, FiTag, FiTruck, FiCreditCard,
  FiPercent, FiDollarSign, FiClock, FiUsers, FiFilter,
  FiSearch, FiChevronDown, FiAlertCircle, FiStar,
  FiPackage, FiGift, FiZap, FiTrendingUp,
  FiUser, FiUserPlus, FiMapPin, FiGlobe
} from 'react-icons/fi';

// Updated Constants
const OFFER_TYPES = {
  COUPON_CODE: 'coupon_code',
  FREE_DELIVERY: 'free_delivery',
  CREDIT: 'credit',
  RESTAURANT_DEAL: 'restaurant_deal',
  AUTO_DISCOUNT: 'auto_discount'
};

const SUB_FILTERS = {
  NEW_USER: 'new_user',
  MINIMUM_AMOUNT: 'minimum_amount',
  SPECIFIC_RESTAURANT: 'specific_restaurant',
  LOCATION_BASED: 'location_based',
  REFERRAL_BONUS: 'referral_bonus',
  CASHBACK: 'cashback'
};

const SUB_FILTER_DISPLAY = {
  [SUB_FILTERS.NEW_USER]: { label: 'New User', icon: <FiUserPlus /> },
  [SUB_FILTERS.MINIMUM_AMOUNT]: { label: 'Minimum Amount', icon: <FiDollarSign /> },
  [SUB_FILTERS.SPECIFIC_RESTAURANT]: { label: 'Specific Restaurant', icon: <FiPackage /> },
  [SUB_FILTERS.LOCATION_BASED]: { label: 'Location Based', icon: <FiMapPin /> },
  [SUB_FILTERS.REFERRAL_BONUS]: { label: 'Referral Bonus', icon: <FiUsers /> },
  [SUB_FILTERS.CASHBACK]: { label: 'Cashback', icon: <FiCreditCard /> }
};

const OFFER_TYPE_DISPLAY = {
  [OFFER_TYPES.COUPON_CODE]: { 
    label: 'Coupon Code', 
    icon: <FiTag />, 
    color: '#FF6B6B',
    subFilters: [SUB_FILTERS.NEW_USER, SUB_FILTERS.MINIMUM_AMOUNT, SUB_FILTERS.SPECIFIC_RESTAURANT]
  },
  [OFFER_TYPES.FREE_DELIVERY]: { 
    label: 'Free Delivery', 
    icon: <FiTruck />, 
    color: '#4ECDC4',
    subFilters: [SUB_FILTERS.NEW_USER, SUB_FILTERS.MINIMUM_AMOUNT, SUB_FILTERS.LOCATION_BASED]
  },
  [OFFER_TYPES.CREDIT]: { 
    label: 'Credit', 
    icon: <FiCreditCard />, 
    color: '#4776E6',
    subFilters: [SUB_FILTERS.NEW_USER, SUB_FILTERS.REFERRAL_BONUS, SUB_FILTERS.CASHBACK]
  },
  [OFFER_TYPES.RESTAURANT_DEAL]: { 
    label: 'Restaurant Deal', 
    icon: <FiPackage />, 
    color: '#FF8E53',
    subFilters: [SUB_FILTERS.SPECIFIC_RESTAURANT]
  },
  [OFFER_TYPES.AUTO_DISCOUNT]: { 
    label: 'Auto Discount', 
    icon: <FiZap />, 
    color: '#9D50BB',
    subFilters: [SUB_FILTERS.NEW_USER, SUB_FILTERS.MINIMUM_AMOUNT]
  }
};

const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed'
};

const CREDIT_TYPES = {
  FIXED_AMOUNT: 'fixed_amount'
};

const STATUS = {
  REJECT: 0,
  APPROVED: 1,
  PENDING_APPROVAL: 2
};

const STATUS_DISPLAY = {
  [STATUS.REJECT]: { label: 'Rejected', color: '#FF4757', bgColor: '#FF475720' },
  [STATUS.APPROVED]: { label: 'Active', color: '#2ED573', bgColor: '#2ED57320' },
  [STATUS.PENDING_APPROVAL]: { label: 'Pending', color: '#FFA502', bgColor: '#FFA50220' }
};

const INITIAL_COUPON_STATE = {
  id: null,
  offer_type: '',
  sub_filter: '',
  code: '',
  discount_type: '',
  discount_value: '',
  minimum_order_amount: 0,
  valid_from: '',
  valid_to: '',
  max_uses: '',
  max_uses_per_user: '',
  times_used: 0,
  is_active: STATUS.PENDING_APPROVAL,
  restaurant: '',
  max_delivery_distance: '',
  max_delivery_fee: '',
  credit_amount: '',
  credit_type: CREDIT_TYPES.FIXED_AMOUNT,
  credit_expiry_days: 30,
};

// Helper functions
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
};

const formatDisplayDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid date';
  }
};

// Confirmation Popup Component
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="cm-confirmation-overlay">
      <div className="cm-confirmation-modal">
        <div className="cm-confirmation-icon">
          <FiAlertCircle size={48} />
        </div>
        <h3>Confirm Action</h3>
        <p>{message}</p>
        <div className="cm-confirmation-actions">
          <button className="cm-confirmation-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="cm-confirmation-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmationPopup.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

// Success Popup Component
const SuccessPopup = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="cm-success-overlay">
      <div className="cm-success-modal">
        <div className="cm-success-icon">
          <FiCheck size={48} />
        </div>
        <h3>Success!</h3>
        <p>{message}</p>
      </div>
    </div>
  );
};

SuccessPopup.propTypes = {
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

// Stats Card Component
const StatsCard = ({ icon, label, value, color }) => (
  <div className="cm-stats-card">
    <div className="cm-stats-icon" style={{ backgroundColor: `${color}20`, color }}>
      {icon}
    </div>
    <div className="cm-stats-content">
      <span className="cm-stats-value">{value}</span>
      <span className="cm-stats-label">{label}</span>
    </div>
  </div>
);

StatsCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string
};

// Offer Card Component
const OfferCard = ({ offer, onEdit, onDelete, isAdmin }) => {
  const getDiscountDisplay = () => {
    switch(offer.offer_type) {
      case OFFER_TYPES.FREE_DELIVERY:
        if (offer.sub_filter === SUB_FILTERS.LOCATION_BASED && offer.max_delivery_distance) {
          return (
            <span className="cm-offer-discount free-delivery">
              Free Delivery up to {offer.max_delivery_distance}km
            </span>
          );
        }
        return <span className="cm-offer-discount free-delivery">Free Delivery</span>;
      
      case OFFER_TYPES.CREDIT:
        const creditAmount = offer.credit_amount || offer.discount_value;
        return creditAmount ? (
          <span className="cm-offer-discount credit-offer">
            ₹{parseFloat(creditAmount).toFixed(2)} Credit
          </span>
        ) : null;
      
      default:
        if (!offer.discount_type || !offer.discount_value) return null;
        return (
          <span className="cm-offer-discount">
            {offer.discount_type === DISCOUNT_TYPES.PERCENTAGE 
              ? `${offer.discount_value}% OFF` 
              : `₹${parseFloat(offer.discount_value).toFixed(2)} OFF`}
          </span>
        );
    }
  };

  const getSubFilterDisplay = () => {
    if (!offer.sub_filter) return null;
    const subFilterInfo = SUB_FILTER_DISPLAY[offer.sub_filter];
    if (!subFilterInfo) return null;
    
    return (
      <span className="cm-sub-filter-badge">
        {subFilterInfo.icon}
        <span className="cm-sub-filter-label">{subFilterInfo.label}</span>
      </span>
    );
  };

  const getRestaurantDisplay = () => {
    if (!offer.restaurant_details) return null;
    return (
      <span className="cm-restaurant-badge">
        <FiPackage size={12} />
        <span className="cm-restaurant-name">{offer.restaurant_details.restaurant_name}</span>
      </span>
    );
  };

  const getMinOrderDisplay = () => {
    return offer.minimum_order_amount && parseFloat(offer.minimum_order_amount) > 0
      ? `Min. order: ₹${parseFloat(offer.minimum_order_amount).toFixed(2)}`
      : 'No minimum order';
  };

  const getValidUntilDisplay = () => {
    if (!offer.valid_to) return 'No expiry';
    const date = new Date(offer.valid_to);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <div className="cm-offer-card">
      <div className="cm-offer-header">
        <div className="cm-offer-type">
          <span className="cm-offer-type-icon" style={{ color: OFFER_TYPE_DISPLAY[offer.offer_type]?.color }}>
            {OFFER_TYPE_DISPLAY[offer.offer_type]?.icon}
          </span>
          <span className="cm-offer-type-label">{OFFER_TYPE_DISPLAY[offer.offer_type]?.label}</span>
          {getSubFilterDisplay()}
        </div>
        <div className="cm-offer-status">
          <span 
            className="cm-status-badge"
            style={{
              color: STATUS_DISPLAY[offer.is_active]?.color,
              backgroundColor: STATUS_DISPLAY[offer.is_active]?.bgColor
            }}
          >
            {STATUS_DISPLAY[offer.is_active]?.label}
          </span>
        </div>
      </div>
      
      <div className="cm-offer-content">
        {offer.restaurant_details && (
          <div className="cm-restaurant-display">
            <FiPackage size={14} />
            <span className="cm-restaurant-name">{offer.restaurant_details.restaurant_name}</span>
          </div>
        )}
        
        {offer.offer_type === OFFER_TYPES.COUPON_CODE && offer.code && (
          <div className="cm-coupon-code-display">
            <FiTag size={16} />
            <span className="cm-coupon-code">{offer.code}</span>
            <button 
              className="cm-copy-btn"
              onClick={() => navigator.clipboard.writeText(offer.code)}
            >
              Copy
            </button>
          </div>
        )}
        
        <div className="cm-offer-details">
          {getDiscountDisplay()}
          <div className="cm-offer-meta">
            <span className="cm-meta-item">
              <FiCalendar size={14} />
              {getValidUntilDisplay()}
            </span>
            <span className="cm-meta-item">
              <FiUsers size={14} />
              Used: {offer.times_used || 0}/{offer.max_uses || '∞'}
            </span>
            {offer.max_uses_per_user && (
              <span className="cm-meta-item">
                <FiUser size={14} />
                {offer.max_uses_per_user} per user
              </span>
            )}
          </div>
          <p className="cm-min-order">{getMinOrderDisplay()}</p>
          {offer.is_valid !== undefined && (
            <p className={`cm-validity ${offer.is_valid ? 'cm-valid' : 'cm-invalid'}`}>
              {offer.is_valid ? '✓ Valid' : '✗ Invalid'}
            </p>
          )}
        </div>
      </div>
      
      {isAdmin && (
        <div className="cm-offer-actions">
          <button 
            className="cm-edit-btn"
            onClick={() => onEdit(offer)}
          >
            <FiEdit2 size={16} />
            Edit
          </button>
          <button 
            className="cm-delete-btn"
            onClick={() => onDelete(offer.id)}
          >
            <FiTrash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

OfferCard.propTypes = {
  offer: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool
};

// Updated CouponForm Component
const CouponForm = ({ coupon, setCoupon, onSubmit, onClose, isOpen, apiErrors, isSubmitting, isAdmin, restaurants }) => {  
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!coupon.offer_type) newErrors.offer_type = 'Offer type is required';
    
    switch(coupon.offer_type) {
      case OFFER_TYPES.COUPON_CODE:
        if (!coupon.code) newErrors.code = 'Coupon code is required';
        else if (coupon.code.length > 20) newErrors.code = 'Coupon code cannot exceed 20 characters';
        break;
      
      case OFFER_TYPES.FREE_DELIVERY:
        if (coupon.sub_filter === SUB_FILTERS.LOCATION_BASED) {
          if (!coupon.max_delivery_distance || coupon.max_delivery_distance <= 0) {
            newErrors.max_delivery_distance = 'Please enter a valid delivery distance';
          }
          if (!coupon.max_delivery_fee || coupon.max_delivery_fee < 0) {
            newErrors.max_delivery_fee = 'Please enter a valid delivery fee amount';
          }
        }
        if (coupon.sub_filter === SUB_FILTERS.MINIMUM_AMOUNT && !coupon.minimum_order_amount) {
          newErrors.minimum_order_amount = 'Minimum order amount is required';
        }
        break;
      
      case OFFER_TYPES.CREDIT:
        if (!coupon.credit_amount && !coupon.discount_value) {
          newErrors.credit_amount = 'Credit amount or discount value is required';
        } else if (coupon.credit_amount && coupon.credit_amount <= 0) {
          newErrors.credit_amount = 'Credit amount must be positive';
        }
        if (coupon.credit_expiry_days && (coupon.credit_expiry_days < 1 || coupon.credit_expiry_days > 365)) {
          newErrors.credit_expiry_days = 'Credit expiry must be between 1 and 365 days';
        }
        break;
      
      case OFFER_TYPES.RESTAURANT_DEAL:
        if (!coupon.restaurant) newErrors.restaurant = 'Restaurant selection is required';
        break;
    }
    
    if ([OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTO_DISCOUNT, OFFER_TYPES.CREDIT].includes(coupon.offer_type)) {
      if (!coupon.discount_type) newErrors.discount_type = 'Discount type is required';
      if (!coupon.discount_value || coupon.discount_value <= 0) {
        newErrors.discount_value = 'Discount value must be positive';
      }
      if (coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE && coupon.discount_value > 100) {
        newErrors.discount_value = 'Percentage discount cannot exceed 100%';
      }
    }
    
    if (coupon.valid_from && coupon.valid_to && new Date(coupon.valid_from) >= new Date(coupon.valid_to)) {
      newErrors.valid_to = 'End date must be after start date';
    }
    
    if (coupon.minimum_order_amount < 0) {
      newErrors.minimum_order_amount = 'Minimum order amount cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'offer_type') {
      const resetCoupon = {
        ...INITIAL_COUPON_STATE,
        offer_type: value,
        restaurant: coupon.restaurant,
        is_active: coupon.is_active,
        id: coupon.id
      };
      setCoupon(resetCoupon);
    } else if (name === 'sub_filter') {
      const updatedCoupon = {
        ...coupon,
        [name]: value,
        max_delivery_distance: '',
        max_delivery_fee: '',
        minimum_order_amount: 0
      };
      setCoupon(updatedCoupon);
    } else {
      setCoupon({
        ...coupon,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
      });
    }
    
    if (errors[name]) setErrors({...errors, [name]: null});
    if (apiErrors && apiErrors[name]) setErrors({...apiErrors, [name]: null});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit();
    }
  };

  const allErrors = {...errors, ...apiErrors};

  const renderSubFilterOptions = () => {
    const offerTypeInfo = OFFER_TYPE_DISPLAY[coupon.offer_type];
    if (!offerTypeInfo || !offerTypeInfo.subFilters) return null;

    return (
      <div className="cm-form-group">
        <label>
          <FiFilter className="cm-input-icon" />
          Offer Filter
        </label>
        <div className="cm-sub-filter-selector">
          {offerTypeInfo.subFilters.map(filterKey => (
            <button
              key={filterKey}
              type="button"
              className={`cm-sub-filter-option ${coupon.sub_filter === filterKey ? 'cm-sub-filter-active' : ''}`}
              onClick={() => handleChange({ target: { name: 'sub_filter', value: filterKey } })}
            >
              <span className="cm-sub-filter-icon">
                {SUB_FILTER_DISPLAY[filterKey]?.icon}
              </span>
              <span className="cm-sub-filter-name">{SUB_FILTER_DISPLAY[filterKey]?.label}</span>
            </button>
          ))}
        </div>
        {allErrors.sub_filter && <span className="cm-error-message">{allErrors.sub_filter}</span>}
      </div>
    );
  };

  const renderOfferTypeSpecificFields = () => {
    switch(coupon.offer_type) {
      case OFFER_TYPES.COUPON_CODE:
        return (
          <div className="cm-form-group">
            <label>
              <FiTag className="cm-input-icon" />
              Coupon Code*
            </label>
            <input
              type="text"
              name="code"
              value={coupon.code}
              onChange={handleChange}
              placeholder="e.g. SUMMER20"
              className={allErrors.code ? 'cm-input-error' : ''}
              maxLength="20"
            />
            {allErrors.code && <span className="cm-error-message">{allErrors.code}</span>}
          </div>
        );
      
      case OFFER_TYPES.FREE_DELIVERY:
        if (coupon.sub_filter === SUB_FILTERS.LOCATION_BASED) {
          return (
            <>
              <div className="cm-form-group">
                <label>
                  <FiMapPin className="cm-input-icon" />
                  Max Delivery Distance (km)*
                </label>
                <input
                  type="number"
                  name="max_delivery_distance"
                  value={coupon.max_delivery_distance}
                  onChange={handleChange}
                  placeholder="e.g., 5"
                  step="0.5"
                  min="0.1"
                  className={allErrors.max_delivery_distance ? 'cm-input-error' : ''}
                />
                {allErrors.max_delivery_distance && <span className="cm-error-message">{allErrors.max_delivery_distance}</span>}
              </div>
              
              <div className="cm-form-group">
                <label>
                  <FiDollarSign className="cm-input-icon" />
                  Max Delivery Fee Covered (₹)*
                </label>
                <input
                  type="number"
                  name="max_delivery_fee"
                  value={coupon.max_delivery_fee}
                  onChange={handleChange}
                  placeholder="e.g., 50"
                  step="1"
                  min="0"
                  className={allErrors.max_delivery_fee ? 'cm-input-error' : ''}
                />
                {allErrors.max_delivery_fee && <span className="cm-error-message">{allErrors.max_delivery_fee}</span>}
                <small className="cm-hint">Maximum delivery fee that will be waived</small>
              </div>
            </>
          );
        }
        return null;
      
      case OFFER_TYPES.CREDIT:
        return (
          <>
            <div className="cm-form-group">
              <label>
                <FiCreditCard className="cm-input-icon" />
                Credit Amount (₹)
              </label>
              <input
                type="number"
                name="credit_amount"
                value={coupon.credit_amount}
                onChange={handleChange}
                placeholder="e.g., 100"
                step="1"
                min="0"
                className={allErrors.credit_amount ? 'cm-input-error' : ''}
              />
              {allErrors.credit_amount && <span className="cm-error-message">{allErrors.credit_amount}</span>}
            </div>
            
            <div className="cm-form-group">
              <label>
                <FiClock className="cm-input-icon" />
                Credit Expiry (Days)
              </label>
              <input
                type="number"
                name="credit_expiry_days"
                value={coupon.credit_expiry_days}
                onChange={handleChange}
                placeholder="30"
                step="1"
                min="1"
                max="365"
                className={allErrors.credit_expiry_days ? 'cm-input-error' : ''}
              />
              {allErrors.credit_expiry_days && <span className="cm-error-message">{allErrors.credit_expiry_days}</span>}
              <small className="cm-hint">Credit will expire after this many days from first use</small>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const renderDiscountFields = () => {
    if ([OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTO_DISCOUNT, OFFER_TYPES.CREDIT].includes(coupon.offer_type)) {
      return (
        <>
          <div className="cm-form-group">
            <label>
              {coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 
                <FiPercent className="cm-input-icon" /> : 
                <FiDollarSign className="cm-input-icon" />
              }
              Discount Type*
            </label>
            <div className="cm-radio-group">
              <label className="cm-radio-label">
                <input
                  type="radio"
                  name="discount_type"
                  value={DISCOUNT_TYPES.PERCENTAGE}
                  checked={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE}
                  onChange={handleChange}
                />
                <span className="cm-radio-custom"></span>
                Percentage
              </label>
              <label className="cm-radio-label">
                <input
                  type="radio"
                  name="discount_type"
                  value={DISCOUNT_TYPES.FIXED_AMOUNT}
                  checked={coupon.discount_type === DISCOUNT_TYPES.FIXED_AMOUNT}
                  onChange={handleChange}
                />
                <span className="cm-radio-custom"></span>
                Fixed Amount
              </label>
            </div>
            {allErrors.discount_type && <span className="cm-error-message">{allErrors.discount_type}</span>}
          </div>

          <div className="cm-form-group">
            <label>
              {coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 
                <FiPercent className="cm-input-icon" /> : 
                <FiDollarSign className="cm-input-icon" />
              }
              Discount Value*
            </label>
            <input
              type="number"
              name="discount_value"
              value={coupon.discount_value}
              onChange={handleChange}
              placeholder={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 'e.g. 20' : 'e.g. 5.00'}
              step={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? "1" : "0.01"}
              min="0"
              max={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? "100" : undefined}
              className={allErrors.discount_value ? 'cm-input-error' : ''}
            />
            {allErrors.discount_value && <span className="cm-error-message">{allErrors.discount_value}</span>}
          </div>
        </>
      );
    }
    return null;
  };

  const renderRestaurantField = () => {
    // Show restaurant field for admin always (optional), 
    // and for restaurant deals or specific_restaurant filter (required)
    const showRestaurantField = isAdmin || 
      coupon.offer_type === OFFER_TYPES.RESTAURANT_DEAL ||
      coupon.sub_filter === SUB_FILTERS.SPECIFIC_RESTAURANT;
    
    if (!showRestaurantField) return null;

    const isRequired = coupon.offer_type === OFFER_TYPES.RESTAURANT_DEAL || 
      coupon.sub_filter === SUB_FILTERS.SPECIFIC_RESTAURANT;

    return (
      <div className="cm-form-group">
        <label>
          <FiPackage className="cm-input-icon" />
          Restaurant{isRequired ? '*' : ' (Optional)'}
        </label>
        <select
          name="restaurant"
          value={coupon.restaurant}
          onChange={handleChange}
          className={allErrors.restaurant ? 'cm-input-error' : ''}
        >
          <option value="">{isRequired ? 'Select Restaurant' : 'Select Restaurant (Optional)'}</option>
          {restaurants && restaurants.map(rest => (
            <option key={rest.restaurant_id} value={rest.restaurant_id}>
              {rest.restaurant_name}
            </option>
          ))}
        </select>
        {allErrors.restaurant && <span className="cm-error-message">{allErrors.restaurant}</span>}
        {isAdmin && !isRequired && (
          <small className="cm-hint">Leave empty to create a global offer for all restaurants</small>
        )}
      </div>
    );
  };

  return (
    <div className={`cm-modal-overlay ${isOpen ? 'cm-modal-active' : ''}`}>
      <div className="cm-modal">
        <div className="cm-modal-header">
          <h2>{coupon.id ? 'Edit Offer' : 'Create New Offer'}</h2>
          <button className="cm-close-btn" onClick={onClose} disabled={isSubmitting}>
            <FiX size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="cm-form-grid">
            <div className="cm-form-group">
              <label>
                <FiTag className="cm-input-icon" />
                Offer Type*
              </label>
              <div className="cm-offer-type-selector">
                {Object.entries(OFFER_TYPE_DISPLAY).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`cm-offer-type-option ${coupon.offer_type === key ? 'cm-offer-type-active' : ''}`}
                    onClick={() => handleChange({ target: { name: 'offer_type', value: key } })}
                    disabled={!!coupon.id && coupon.offer_type !== key}
                    style={coupon.offer_type === key ? { 
                      borderColor: value.color,
                      backgroundColor: `${value.color}10`
                    } : {}}
                  >
                    <span className="cm-offer-type-icon" style={{ color: value.color }}>
                      {value.icon}
                    </span>
                    <span className="cm-offer-type-name">{value.label}</span>
                  </button>
                ))}
              </div>
              {allErrors.offer_type && <span className="cm-error-message">{allErrors.offer_type}</span>}
            </div>

            {renderSubFilterOptions()}
            {renderOfferTypeSpecificFields()}
            {renderDiscountFields()}
            {renderRestaurantField()}

            <div className="cm-form-group">
              <label>
                <FiDollarSign className="cm-input-icon" />
                Minimum Order Amount (₹)
              </label>
              <input
                type="number"
                name="minimum_order_amount"
                value={coupon.minimum_order_amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={allErrors.minimum_order_amount ? 'cm-input-error' : ''}
              />
              {allErrors.minimum_order_amount && <span className="cm-error-message">{allErrors.minimum_order_amount}</span>}
              <small className="cm-hint">Set to 0 for no minimum order</small>
            </div>

            <div className="cm-form-group">
              <label>
                <FiCalendar className="cm-input-icon" />
                Valid From
              </label>
              <input
                type="datetime-local"
                name="valid_from"
                value={formatDateForInput(coupon.valid_from)}
                onChange={handleChange}
                className={allErrors.valid_from ? 'cm-input-error' : ''}
              />
              {allErrors.valid_from && <span className="cm-error-message">{allErrors.valid_from}</span>}
            </div>

            <div className="cm-form-group">
              <label>
                <FiCalendar className="cm-input-icon" />
                Valid To
              </label>
              <input
                type="datetime-local"
                name="valid_to"
                value={formatDateForInput(coupon.valid_to)}
                onChange={handleChange}
                className={allErrors.valid_to ? 'cm-input-error' : ''}
              />
              {allErrors.valid_to && <span className="cm-error-message">{allErrors.valid_to}</span>}
            </div>

            <div className="cm-form-group">
              <label>
                <FiUsers className="cm-input-icon" />
                Max Uses (Leave empty for unlimited)
              </label>
              <input
                type="number"
                name="max_uses"
                value={coupon.max_uses}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
              />
              {allErrors.max_uses && <span className="cm-error-message">{allErrors.max_uses}</span>}
            </div>

            <div className="cm-form-group">
              <label>
                <FiUser className="cm-input-icon" />
                Max Uses Per User (Leave empty for unlimited)
              </label>
              <input
                type="number"
                name="max_uses_per_user"
                value={coupon.max_uses_per_user}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
              />
              {allErrors.max_uses_per_user && <span className="cm-error-message">{allErrors.max_uses_per_user}</span>}
            </div>

            {isAdmin && (
              <div className="cm-form-group">
                <label>
                  <FiTrendingUp className="cm-input-icon" />
                  Status*
                </label>
                <select
                  name="is_active"
                  value={coupon.is_active}
                  onChange={handleChange}
                  className={allErrors.is_active ? 'cm-input-error' : ''}
                >
                  <option value={STATUS.APPROVED}>Active</option>
                  <option value={STATUS.REJECT}>Rejected</option>
                  <option value={STATUS.PENDING_APPROVAL}>Pending Approval</option>
                </select>
                {allErrors.is_active && <span className="cm-error-message">{allErrors.is_active}</span>}
              </div>
            )}
          </div>
          
          <div className="cm-modal-actions">
            <button 
              type="button" 
              className="cm-btn cm-btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="cm-btn cm-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="cm-spinner"></span>
                  {coupon.id ? 'Updating...' : 'Creating...'}
                </>
              ) : coupon.id ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CouponForm.propTypes = {
  coupon: PropTypes.object.isRequired,
  setCoupon: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  apiErrors: PropTypes.object,
  isSubmitting: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool,
  restaurants: PropTypes.array
};

// Main CouponManagement Component
const CouponManagement = ({ user }) => {
  const { restaurant_id } = useParams();  
  const [coupons, setCoupons] = useState([]);
  const [coupon, setCoupon] = useState(INITIAL_COUPON_STATE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [apiErrors, setApiErrors] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const navigate = useNavigate();

  const isAdmin = user?.role === "Admin";

  // Calculate stats
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active === STATUS.APPROVED).length,
    pending: coupons.filter(c => c.is_active === STATUS.PENDING_APPROVAL).length,
    expired: coupons.filter(c => {
      if (!c.valid_to) return false;
      return new Date(c.valid_to) < new Date();
    }).length
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = searchTerm === '' || 
      coupon.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      OFFER_TYPE_DISPLAY[coupon.offer_type]?.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (coupon.restaurant_details && coupon.restaurant_details.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && coupon.is_active === STATUS.APPROVED) ||
      (statusFilter === 'pending' && coupon.is_active === STATUS.PENDING_APPROVAL) ||
      (statusFilter === 'rejected' && coupon.is_active === STATUS.REJECT);
    
    return matchesSearch && matchesStatus;
  });

  // Fetch restaurants
  const fetchRestaurants = async () => {
    try {
      if (isAdmin) {
        // Admin can see all restaurants
        const data = await fetchData(
          API_ENDPOINTS.RESTAURANTS.FETCH_ALL,
          "GET",
          null,
          localStorage.getItem("access")
        );
        setRestaurants(data);
      } else if (restaurant_id) {
        // Restaurant user can only see their restaurant
        const data = await fetchData(
          API_ENDPOINTS.RESTAURANTS.FETCH(restaurant_id),
          "GET",
          null,
          localStorage.getItem("access")
        );
        setRestaurants([data]);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      setRestaurants([]);
    }
  };

  // Fetch coupons
  const fetchCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = API_ENDPOINTS.OFFER.FETCH(restaurant_id)
      const data = await fetchData(
        endpoint, 
        "GET", 
        null, 
        localStorage.getItem("access")
      );
      setCoupons(data);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError(err.response?.data?.message || 'Failed to fetch offers. Please try again.');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchRestaurants();
  }, [restaurant_id, isAdmin]);

  const handleSubmit = async () => {
    setApiErrors(null);
    setIsSubmitting(true);
    try {
      const payload = {
        offer_type: coupon.offer_type,
        sub_filter: coupon.sub_filter || null,
        code: coupon.offer_type === OFFER_TYPES.COUPON_CODE ? coupon.code : null,
        discount_type: [OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTO_DISCOUNT, OFFER_TYPES.CREDIT].includes(coupon.offer_type) 
          ? coupon.discount_type 
          : null,
        discount_value: [OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTO_DISCOUNT, OFFER_TYPES.CREDIT].includes(coupon.offer_type) 
          ? parseFloat(coupon.discount_value)
          : null,
        minimum_order_amount: parseFloat(coupon.minimum_order_amount || 0),
        valid_from: coupon.valid_from || null,
        valid_to: coupon.valid_to || null,
        max_uses: coupon.max_uses ? parseInt(coupon.max_uses) : null,
        max_uses_per_user: coupon.max_uses_per_user ? parseInt(coupon.max_uses_per_user) : null,
        is_active: coupon.is_active,
        max_delivery_distance: coupon.offer_type === OFFER_TYPES.FREE_DELIVERY && coupon.sub_filter === SUB_FILTERS.LOCATION_BASED
          ? parseFloat(coupon.max_delivery_distance) 
          : null,
        max_delivery_fee: coupon.offer_type === OFFER_TYPES.FREE_DELIVERY && coupon.sub_filter === SUB_FILTERS.LOCATION_BASED
          ? parseFloat(coupon.max_delivery_fee)
          : null,
        credit_amount: coupon.offer_type === OFFER_TYPES.CREDIT
          ? parseFloat(coupon.credit_amount || coupon.discount_value)
          : null,
        credit_type: coupon.offer_type === OFFER_TYPES.CREDIT
          ? coupon.credit_type
          : null,
        credit_expiry_days: coupon.offer_type === OFFER_TYPES.CREDIT
          ? parseInt(coupon.credit_expiry_days || 30)
          : null,
      };

      // Add restaurant field for admin (optional) or restaurant user (auto-set)
      if (isAdmin && coupon.restaurant) {
        payload.restaurant = coupon.restaurant;
      } else if (!isAdmin && restaurant_id) {
        payload.restaurant = restaurant_id;
      }

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key];
        }
      });

      let response;
      if (coupon.id) {
        response = await fetchData(
          API_ENDPOINTS.OFFER.UPDATE(coupon.id),
          "PUT",
          payload,
          localStorage.getItem("access")
        );
        setCoupons(coupons.map(c => c.id === coupon.id ? response : c));
        setSuccessMessage('Offer updated successfully!');
      } else {
        response = await fetchData(
          API_ENDPOINTS.OFFER.CREATE,
          "POST",
          payload,
          localStorage.getItem("access")
        );
        setCoupons([response, ...coupons]);
        setSuccessMessage('Offer created successfully!');
      }
      
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving offer:', err);
      if (err.response?.data) {
        const backendErrors = err.response.data;
        const formattedErrors = {};

        Object.keys(backendErrors).forEach(key => {
          if (key !== 'message') {
            formattedErrors[key] = Array.isArray(backendErrors[key])
              ? backendErrors[key].join(' ')
              : backendErrors[key];
          }
        });

        setApiErrors(formattedErrors);
        setError(backendErrors.message || 'Failed to save offer. Please check the form for errors.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (couponToEdit) => {
    setCoupon({
      ...couponToEdit,
      restaurant: couponToEdit.restaurant?.restaurant_id || couponToEdit.restaurant || '',
      sub_filter: couponToEdit.sub_filter || '',
      max_delivery_distance: couponToEdit.max_delivery_distance || '',
      max_delivery_fee: couponToEdit.max_delivery_fee || '',
      credit_amount: couponToEdit.credit_amount || '',
      discount_value: couponToEdit.discount_value || '',
      credit_expiry_days: couponToEdit.credit_expiry_days || 30,
      minimum_order_amount: couponToEdit.minimum_order_amount || 0,
    });
    setIsModalOpen(true);
    setApiErrors(null);
    setError(null);
  };

  const handleDeleteClick = (id) => {
    setCouponToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setIsLoading(true);
      await fetchData(
        API_ENDPOINTS.OFFER.DELETE(couponToDelete),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      
      setSuccessMessage('Offer deleted successfully!');
      setCoupons(coupons.filter(c => c.id !== couponToDelete));
    } catch (err) {
      console.error('Error deleting offer:', err);
      setError(err.response?.data?.message || 'Failed to delete offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCoupon({
      ...INITIAL_COUPON_STATE,
      restaurant: isAdmin ? '' : restaurant_id
    });
    setApiErrors(null);
    setError(null);
  };

  const openNewCouponForm = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="cm-container">
      {/* Header */}
      <div className="cm-header">
        <div className="cm-header-content">
          <h1 className="cm-title">
            <FiGift className="cm-title-icon" />
            Offer Management
          </h1>
          <p className="cm-subtitle">
            {isAdmin ? 'Manage offers for all restaurants' : `Manage offers for your restaurant`}
          </p>
        </div>
        
        <div className="cm-header-actions">
          <div className="cm-search-box">
            <FiSearch className="cm-search-icon" />
            <input
              type="text"
              placeholder="Search offers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cm-search-input"
            />
          </div>
          
          <select 
            className="cm-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <button 
            className="cm-btn cm-btn-secondary"
            onClick={() => {
              fetchCoupons();
              fetchRestaurants();
            }}
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? 'cm-spin' : ''} />
            Refresh
          </button>
          
          <button 
            className="cm-btn cm-btn-primary"
            onClick={openNewCouponForm}
            disabled={isLoading}
          >
            <FiPlus />
            Create
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cm-stats-grid">
        <StatsCard 
          icon={<FiGift />} 
          label="Total Offers" 
          value={stats.total}
          color="#4776E6"
        />
        <StatsCard 
          icon={<FiTrendingUp />} 
          label="Active Offers" 
          value={stats.active}
          color="#2ED573"
        />
        <StatsCard 
          icon={<FiClock />} 
          label="Pending Approval" 
          value={stats.pending}
          color="#FFA502"
        />
        <StatsCard 
          icon={<FiAlertCircle />} 
          label="Expired Offers" 
          value={stats.expired}
          color="#FF4757"
        />
      </div>

      {/* Restaurant Filter for Admin */}
      {isAdmin && restaurants.length > 0 && (
        <div className="cm-restaurant-filter">
          <div className="cm-restaurant-filter-header">
            <FiGlobe className="cm-restaurant-filter-icon" />
            <h3>Restaurant Filter</h3>
          </div>
          <div className="cm-restaurant-filter-grid">
            <button 
              className={`cm-restaurant-filter-btn ${!coupon.restaurant ? 'active' : ''}`}
              onClick={() => setCoupon({...coupon, restaurant: ''})}
            >
              All Restaurants
            </button>
            {restaurants.map(rest => (
              <button
                key={rest.restaurant_id}
                className={`cm-restaurant-filter-btn ${coupon.restaurant === rest.restaurant_id ? 'active' : ''}`}
                onClick={() => setCoupon({...coupon, restaurant: rest.restaurant_id})}
              >
                {rest.restaurant_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="cm-alert cm-alert-error">
          <FiAlertCircle />
          <span>{error}</span>
          <button 
            className="cm-alert-close" 
            onClick={() => setError(null)}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <SuccessPopup 
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Offers Grid */}
      {isLoading ? (
        <div className="cm-loading">
          <div className="cm-spinner-large"></div>
          <p>Loading offers...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="cm-empty-state">
          <FiGift size={64} />
          <h3>No offers found</h3>
          <p>{searchTerm || statusFilter !== 'all' ? 'Try changing your search or filters' : 'Create your first offer to get started'}</p>
          <button 
            className="cm-btn cm-btn-primary"
            onClick={openNewCouponForm}
          >
            <FiPlus />
            Create First Offer
          </button>
        </div>
      ) : (
        <div className="cm-offers-grid">
          {filteredCoupons.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <CouponForm
        coupon={coupon}
        setCoupon={setCoupon}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
        isOpen={isModalOpen}
        apiErrors={apiErrors}
        isSubmitting={isSubmitting}
        isAdmin={isAdmin}
        restaurants={restaurants}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmationPopup
          message="Are you sure you want to delete this offer? This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

CouponManagement.propTypes = {
  user: PropTypes.object
};

export default CouponManagement;