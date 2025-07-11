import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../src/assets/css/vendor/CouponManagement.css';
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { useParams, useNavigate } from "react-router-dom";

// Constants for offer and discount types
const OFFER_TYPES = {
  COUPON_CODE: 'coupon_code',
  AUTOMATIC_DISCOUNT: 'automatic_discount',
  FIRST_TIME_USER: 'first_time_user',
  FREE_DELIVERY: 'free_delivery',
  RESTAURANT_SPECIFIC: 'restaurant_specific'
};

const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed'
};

// Status constants
const STATUS = {
  REJECT: 0,
  APPROVED: 1,
  PENDING_APPROVAL: 2
};

// Status display mapping
const STATUS_DISPLAY = {
  [STATUS.REJECT]: 'Reject',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.PENDING_APPROVAL]: 'Pending Approval'
};

// Initial coupon state
const INITIAL_COUPON_STATE = {
  id: null,
  offer_type: '',
  code: '',
  discount_type: '',
  discount_value: '',
  minimum_order_amount: '',
  valid_from: '',
  valid_to: '',
  max_uses: '',
  max_uses_per_user: '',
  is_active: STATUS.PENDING_APPROVAL, // Default to pending approval
  restaurant: '',
  availableRestaurants: [],
};

// Helper function to format date for datetime-local input
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};

// Confirmation Popup Component
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="confirmation-popup-overlay">
      <div className="confirmation-popup">
        <div className="confirmation-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FFA500" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3>Confirm Action</h3>
        <p>{message}</p>
        <div className="confirmation-buttons">
          <button className="confirmation-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirmation-confirm-btn" onClick={onConfirm}>
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
  return (
    <div className="success-popup-overlay">
      <div className="success-popup">
        <div className="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" />
          </svg>
        </div>
        <h3>Success!</h3>
        <p>{message}</p>
        <button className="success-close-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

SuccessPopup.propTypes = {
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

// Updated CouponForm Component
const CouponForm = ({ coupon, setCoupon, onSubmit, onClose, isOpen, apiErrors, isSubmitting, isAdmin }) => {  
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!coupon.offer_type) newErrors.offer_type = 'Offer type is required';
    
    if (coupon.offer_type === OFFER_TYPES.COUPON_CODE && !coupon.code) {
      newErrors.code = 'Coupon code is required';
    }
    
    if ([OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTOMATIC_DISCOUNT, OFFER_TYPES.FIRST_TIME_USER].includes(coupon.offer_type)) {
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
    
    if (coupon.offer_type === OFFER_TYPES.RESTAURANT_SPECIFIC && !coupon.restaurant) {
      newErrors.restaurant = 'Restaurant selection is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'offer_type') {
      setCoupon({
        ...coupon,
        offer_type: value,
        code: value === OFFER_TYPES.COUPON_CODE ? coupon.code : '',
        discount_type: value === OFFER_TYPES.FREE_DELIVERY ? '' : coupon.discount_type,
        discount_value: value === OFFER_TYPES.FREE_DELIVERY ? '' : coupon.discount_value,
        restaurant: value === OFFER_TYPES.RESTAURANT_SPECIFIC ? coupon.restaurant : ''
      });
    } else {
      setCoupon({
        ...coupon,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
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

  const formattedValidFrom = formatDateForInput(coupon.valid_from);
  const formattedValidTo = formatDateForInput(coupon.valid_to);

  const renderOfferTypeSpecificFields = () => {
    switch(coupon.offer_type) {
      case OFFER_TYPES.COUPON_CODE:
        return (
          <div className="vendor-coupon-management-form-group">
            <label>Coupon Code*</label>
            <input
              type="text"
              name="code"
              value={coupon.code}
              onChange={handleChange}
              placeholder="e.g. SUMMER20"
              className={allErrors.code ? 'vendor-coupon-management-input-error' : ''}
              maxLength="20"
            />
            {allErrors.code && <span className="vendor-coupon-management-error-message">{allErrors.code}</span>}
          </div>
        );
      
      case OFFER_TYPES.RESTAURANT_SPECIFIC:
        return (
          <div className="vendor-coupon-management-form-group">
            <label>Select Restaurant*</label>
            <select
              name="restaurant"
              value={coupon.restaurant}
              onChange={handleChange}
              className={allErrors.restaurant ? 'vendor-coupon-management-input-error' : ''}
            >
              <option value="">Select Restaurant</option>
              {coupon.availableRestaurants?.map(restaurant => (
                <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
              ))}
            </select>
            {allErrors.restaurant && <span className="vendor-coupon-management-error-message">{allErrors.restaurant}</span>}
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderDiscountFields = () => {
    if ([OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTOMATIC_DISCOUNT, OFFER_TYPES.FIRST_TIME_USER].includes(coupon.offer_type)) {
      return (
        <>
          <div className="vendor-coupon-management-form-group">
            <label>Discount Type*</label>
            <select
              name="discount_type"
              value={coupon.discount_type}
              onChange={handleChange}
              className={allErrors.discount_type ? 'vendor-coupon-management-input-error' : ''}
            >
              <option value="">Select Discount Type</option>
              <option value={DISCOUNT_TYPES.PERCENTAGE}>Percentage</option>
              <option value={DISCOUNT_TYPES.FIXED_AMOUNT}>Fixed Amount</option>
            </select>
            {allErrors.discount_type && <span className="vendor-coupon-management-error-message">{allErrors.discount_type}</span>}
          </div>

          <div className="vendor-coupon-management-form-group">
            <label>Discount Value*</label>
            <input
              type="number"
              name="discount_value"
              value={coupon.discount_value}
              onChange={handleChange}
              placeholder={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 'e.g. 20' : 'e.g. 5.00'}
              step={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? "1" : "0.01"}
              min="0"
              max={coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE ? "100" : undefined}
              className={allErrors.discount_value ? 'vendor-coupon-management-input-error' : ''}
            />
            {allErrors.discount_value && <span className="vendor-coupon-management-error-message">{allErrors.discount_value}</span>}
          </div>
        </>
      );
    }
    return null;
  };

  const renderStatusField = () => {
    if (isAdmin) {
      return (
        <div className="vendor-coupon-management-form-group">
          <label>Status*</label>
          <select
            name="is_active"
            value={coupon.is_active}
            onChange={handleChange}
            className={allErrors.is_active ? 'vendor-coupon-management-input-error' : ''}
          >
            <option value={STATUS.APPROVED}>Approved</option>
            <option value={STATUS.REJECT}>Reject</option>
            <option value={STATUS.PENDING_APPROVAL}>Pending Approval</option>
          </select>
          {allErrors.is_active && <span className="vendor-coupon-management-error-message">{allErrors.is_active}</span>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`vendor-coupon-management-modal ${isOpen ? 'vendor-coupon-management-modal-open' : ''}`}>
      <div className="vendor-coupon-management-modal-overlay" onClick={onClose}></div>
      <div className="vendor-coupon-management-modal-content">
        <div className="vendor-coupon-management-modal-header">
          <h2>{coupon.id ? 'Edit Offer' : 'Create New Offer'}</h2>
          <button className="vendor-coupon-management-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="vendor-coupon-management-form-grid">
            <div className="vendor-coupon-management-form-group">
              <label>Offer Type*</label>
              <select
                name="offer_type"
                value={coupon.offer_type}
                onChange={handleChange}
                className={allErrors.offer_type ? 'vendor-coupon-management-input-error' : ''}
                disabled={!!coupon.id}
              >
                <option value="">Select Offer Type</option>
                <option value={OFFER_TYPES.COUPON_CODE}>Coupon Code</option>
                {/* <option value={OFFER_TYPES.AUTOMATIC_DISCOUNT}>Automatic Discount</option> */}
                {/* <option value={OFFER_TYPES.FIRST_TIME_USER}>First-time User Offer</option> */}
                {/* <option value={OFFER_TYPES.FREE_DELIVERY}>Free Delivery</option> */}
                {/* <option value={OFFER_TYPES.RESTAURANT_SPECIFIC}>Restaurant-specific Deal</option> */}
              </select>
              {allErrors.offer_type && <span className="vendor-coupon-management-error-message">{allErrors.offer_type}</span>}
            </div>

            {renderOfferTypeSpecificFields()}
            {renderDiscountFields()}

            {(coupon.offer_type === OFFER_TYPES.FREE_DELIVERY || coupon.offer_type === OFFER_TYPES.COUPON_CODE) && (
              <div className="vendor-coupon-management-form-group">
                <label>Minimum Order Amount</label>
                <input
                  type="number"
                  name="minimum_order_amount"
                  value={coupon.minimum_order_amount}
                  onChange={handleChange}
                  placeholder="0.00 (leave empty for no minimum)"
                  step="0.01"
                  min="0"
                />
              </div>
            )}

            <div className="vendor-coupon-management-form-group">
              <label>Valid From</label>
              <input
                type="datetime-local"
                name="valid_from"
                value={formattedValidFrom}
                onChange={handleChange}
                className={allErrors.valid_from ? 'vendor-coupon-management-input-error' : ''}
              />
              {allErrors.valid_from && <span className="vendor-coupon-management-error-message">{allErrors.valid_from}</span>}
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Valid To</label>
              <input
                type="datetime-local"
                name="valid_to"
                value={formattedValidTo}
                onChange={handleChange}
                className={allErrors.valid_to ? 'vendor-coupon-management-input-error' : ''}
              />
              {allErrors.valid_to && <span className="vendor-coupon-management-error-message">{allErrors.valid_to}</span>}
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Max Uses (Leave empty for unlimited)</label>
              <input
                type="number"
                name="max_uses"
                value={coupon.max_uses}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
              />
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Max Uses Per User (Leave empty for unlimited)</label>
              <input
                type="number"
                name="max_uses_per_user"
                value={coupon.max_uses_per_user}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
              />
            </div>

            {renderStatusField()}
          </div>
          <div className="vendor-coupon-management-form-actions">
            <button 
              type="button" 
              className="vendor-menu-management-button vendor-menu-management-add-item" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="vendor-menu-management-button vendor-menu-management-add-item"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="vendor-coupon-management-spinner"></span>
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
  isSubmitting: PropTypes.bool,
  isAdmin: PropTypes.bool
};

// Updated CouponTable Component
const CouponTable = ({ coupons, onEdit, onDelete, isLoading, isAdmin }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getOfferTypeLabel = (type) => {
    switch(type) {
      case OFFER_TYPES.COUPON_CODE: return 'Coupon Code';
      case OFFER_TYPES.AUTOMATIC_DISCOUNT: return 'Auto Discount';
      case OFFER_TYPES.FIRST_TIME_USER: return 'First-time User';
      case OFFER_TYPES.FREE_DELIVERY: return 'Free Delivery';
      case OFFER_TYPES.RESTAURANT_SPECIFIC: return 'Restaurant Deal';
      default: return type;
    }
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.offer_type === OFFER_TYPES.FREE_DELIVERY) {
      return 'Free Delivery';
    }
    if (!coupon.discount_type || !coupon.discount_value) return 'N/A';
    
    return coupon.discount_type === DISCOUNT_TYPES.PERCENTAGE 
      ? `${coupon.discount_value}%` 
      : `₹${parseFloat(coupon.discount_value).toFixed(2)}`;
  };

  const getMinOrderDisplay = (amount) => {
    return amount ? `₹${parseFloat(amount).toFixed(2)}` : 'None';
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case STATUS.APPROVED: return 'vendor-coupon-management-status-active';
      case STATUS.INACTIVE: return 'vendor-coupon-management-status-inactive';
      case STATUS.PENDING_APPROVAL: return 'vendor-coupon-management-status-pending';
      default: return 'vendor-coupon-management-status-inactive';
    }
  };

  if (isLoading) {
    return (
      <div className="vendor-coupon-management-loading">
        <div className="vendor-coupon-management-spinner"></div>
        <p>Loading offers...</p>
      </div>
    );
  }

  return (
    <div className="vendor-coupon-management-table-container">
      {coupons.length === 0 ? (
        <div className="vendor-coupon-management-empty-state">
          <p>No offers found. Create your first offer!</p>
        </div>
      ) : (
        <table className="vendor-coupon-management-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Code/Name</th>
              <th>Discount</th>
              <th>Min Order</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td>{getOfferTypeLabel(coupon.offer_type)}</td>
                <td>
                  {coupon.offer_type === OFFER_TYPES.COUPON_CODE ? (
                    <span className="vendor-coupon-management-coupon-code">{coupon.code || 'N/A'}</span>
                  ) : coupon.offer_type === OFFER_TYPES.RESTAURANT_SPECIFIC ? (
                    <span className="vendor-coupon-management-vendor-name">
                      {coupon.restaurant?.restaurant_name || 'Restaurant Deal'}
                    </span>
                  ) : (
                    <span className="vendor-coupon-management-offer-name">{getOfferTypeLabel(coupon.offer_type)}</span>
                  )}
                </td>
                <td>{getDiscountDisplay(coupon)}</td>
                <td>{getMinOrderDisplay(coupon.minimum_order_amount)}</td>
                <td>{formatDate(coupon.valid_from)}</td>
                <td>{formatDate(coupon.valid_to)}</td>
                <td>
                  <span className={`vendor-coupon-management-status-badge ${getStatusBadgeClass(coupon.is_active)}`}>
                    {STATUS_DISPLAY[coupon.is_active] || 'Unknown'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="vendor-coupon-management-actions">
                    <button 
                      className="vendor-coupon-management-edit-btn" 
                      onClick={() => onEdit(coupon)}
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button 
                      className="vendor-coupon-management-delete-btn" 
                      onClick={() => onDelete(coupon.id)}
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

CouponTable.propTypes = {
  coupons: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isAdmin: PropTypes.bool
};

// Main CouponManagement Component with status handling
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
  const navigate = useNavigate();

  const isAdmin = user?.role === "Admin";

  // Fetch all coupons
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
      setError(err.response?.data?.message || 'Failed to fetch coupons. Please try again.');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [restaurant_id, isAdmin]);

  const handleSubmit = async () => {
    setApiErrors(null);
    setIsSubmitting(true);
    try {
      const payload = {
        offer_type: coupon.offer_type,
        restaurant: restaurant_id,
        code: coupon.offer_type === OFFER_TYPES.COUPON_CODE ? coupon.code : undefined,
        discount_type: [OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTOMATIC_DISCOUNT, OFFER_TYPES.FIRST_TIME_USER].includes(coupon.offer_type) 
          ? coupon.discount_type 
          : undefined,
        discount_value: [OFFER_TYPES.COUPON_CODE, OFFER_TYPES.AUTOMATIC_DISCOUNT, OFFER_TYPES.FIRST_TIME_USER].includes(coupon.offer_type) 
          ? parseFloat(coupon.discount_value)
          : undefined,
        minimum_order_amount: coupon.minimum_order_amount ? parseFloat(coupon.minimum_order_amount) : undefined,
        valid_from: coupon.valid_from || undefined,
        valid_to: coupon.valid_to || undefined,
        max_uses: coupon.max_uses ? parseInt(coupon.max_uses) : undefined,
        max_uses_per_user: coupon.max_uses_per_user ? parseInt(coupon.max_uses_per_user) : undefined,
        is_active: coupon.is_active // Using is_active instead of status for backward compatibility
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

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
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleEdit = (couponToEdit) => {
    setCoupon({
      ...couponToEdit,
      restaurant: couponToEdit.restaurant?.restaurant_id || couponToEdit.restaurant || '',
      availableRestaurants: coupon.availableRestaurants,
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
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setCouponToDelete(null);
  };

  const resetForm = () => {
    setCoupon(INITIAL_COUPON_STATE);
    setApiErrors(null);
    setError(null);
  };

  const openNewCouponForm = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const dismissSuccessMessage = () => {
    setSuccessMessage(null);
  };

  return (
    <div className="vendor-coupon-management">
      <div className="vendor-coupon-management-header">
        <h1>Offer Management</h1>
        <div className="vendor-coupon-management-header-actions">
          <button 
            className="vendor-menu-management-button vendor-menu-management-add-item" 
            onClick={openNewCouponForm}
            disabled={isLoading}
          >
            + Create New Offer
          </button>
          <button 
            className="vendor-menu-management-button vendor-menu-management-add-item"
            onClick={fetchCoupons}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="vendor-coupon-management-error">
          {error}
          <button 
            className="vendor-coupon-management-error-dismiss" 
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <SuccessPopup 
          message={successMessage}
          onClose={dismissSuccessMessage}
        />
      )}

      <CouponTable 
        coupons={coupons} 
        onEdit={handleEdit} 
        onDelete={handleDeleteClick} 
        isLoading={isLoading || isSubmitting}
        isAdmin={isAdmin}
      />

      <CouponForm
        coupon={coupon}
        setCoupon={setCoupon}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
        isOpen={isModalOpen}
        apiErrors={apiErrors}
        isSubmitting={isSubmitting}
        isAdmin={isAdmin}
      />

      {showDeleteConfirm && (
        <ConfirmationPopup
          message="Are you sure you want to delete this offer? This action cannot be undone."
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
};

export default CouponManagement;