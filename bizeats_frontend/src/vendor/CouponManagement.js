import React, { useState, useEffect } from 'react';
import '../../src/assets/css/vendor/CouponManagement.css';
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const CouponForm = ({ coupon, setCoupon, onSubmit, onClose, isOpen, apiErrors }) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!coupon.code) newErrors.code = 'Coupon code is required';
    if (!coupon.discount_type) newErrors.discount_type = 'Discount type is required';
    if (!coupon.discount_value || coupon.discount_value <= 0) 
      newErrors.discount_value = 'Discount value must be positive';
    if (coupon.valid_from && coupon.valid_to && new Date(coupon.valid_from) >= new Date(coupon.valid_to))
      newErrors.valid_to = 'End date must be after start date';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCoupon({
      ...coupon,
      [name]: type === 'checkbox' ? checked : value,
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({...errors, [name]: null});
    }
    if (apiErrors && apiErrors[name]) {
      setErrors({...apiErrors, [name]: null});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine frontend and backend errors
  const allErrors = {...errors, ...apiErrors};

  return (
    <div className={`vendor-coupon-management-modal ${isOpen ? 'vendor-coupon-management-modal-open' : ''}`}>
      <div className="vendor-coupon-management-modal-overlay" onClick={onClose}></div>
      <div className="vendor-coupon-management-modal-content">
        <div className="vendor-coupon-management-modal-header">
          <h2>{coupon.id ? 'Edit Coupon' : 'Add Coupon'}</h2>
          <button className="vendor-coupon-management-close-btn" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="vendor-coupon-management-form-grid">
            <div className="vendor-coupon-management-form-group">
              <label>Coupon Code*</label>
              <input
                type="text"
                name="code"
                value={coupon.code}
                onChange={handleChange}
                placeholder="e.g. SUMMER20"
                className={allErrors.code ? 'vendor-coupon-management-input-error' : ''}
              />
              {allErrors.code && <span className="vendor-coupon-management-error-message">{allErrors.code}</span>}
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Discount Type*</label>
              <select
                name="discount_type"
                value={coupon.discount_type}
                onChange={handleChange}
                className={allErrors.discount_type ? 'vendor-coupon-management-input-error' : ''}
              >
                <option value="">Select Discount Type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
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
                placeholder={coupon.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 5.00'}
                step="0.01"
                min="0"
                className={allErrors.discount_value ? 'vendor-coupon-management-input-error' : ''}
              />
              {allErrors.discount_value && <span className="vendor-coupon-management-error-message">{allErrors.discount_value}</span>}
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Minimum Order Amount</label>
              <input
                type="number"
                name="minimum_order_amount"
                value={coupon.minimum_order_amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Valid From*</label>
              <input
                type="datetime-local"
                name="valid_from"
                value={coupon.valid_from}
                onChange={handleChange}
                className={allErrors.valid_from ? 'vendor-coupon-management-input-error' : ''}
              />
              {allErrors.valid_from && <span className="vendor-coupon-management-error-message">{allErrors.valid_from}</span>}
            </div>

            <div className="vendor-coupon-management-form-group">
              <label>Valid To*</label>
              <input
                type="datetime-local"
                name="valid_to"
                value={coupon.valid_to}
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

            <div className="vendor-coupon-management-checkbox-group">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={coupon.is_active}
                onChange={handleChange}
              />
              <label htmlFor="is_active">Active Coupon</label>
            </div>
          </div>
          <div className="vendor-coupon-management-form-actions">
            <button 
              type="button" 
              className="vendor-coupon-management-cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="vendor-coupon-management-save-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="vendor-coupon-management-spinner"></span>
              ) : coupon.id ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CouponTable = ({ coupons, onEdit, onDelete, isLoading }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="vendor-coupon-management-loading">
        <div className="vendor-coupon-management-spinner"></div>
        <p>Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="vendor-coupon-management-table-container">
      {coupons.length === 0 ? (
        <div className="vendor-coupon-management-empty-state">
          <p>No coupons found. Create your first coupon!</p>
        </div>
      ) : (
        <table className="vendor-coupon-management-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Order</th>
              <th>Valid From</th>
              <th>Valid To</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td>
                  <span className="vendor-coupon-management-coupon-code">{coupon.code}</span>
                </td>
                <td>{coupon.discount_type}</td>
                <td>{coupon.discount_value}</td>
                <td>{coupon.minimum_order_amount || '-'}</td>
                <td>{formatDate(coupon.valid_from)}</td>
                <td>{formatDate(coupon.valid_to)}</td>
                <td>
                  <span className={`vendor-coupon-management-status-badge ${coupon.is_active ? 'vendor-coupon-management-status-active' : 'vendor-coupon-management-status-inactive'}`}>
                    {coupon.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="vendor-coupon-management-actions">
                  <button 
                    className="vendor-coupon-management-edit-btn" 
                    onClick={() => onEdit(coupon)}
                  >
                    Edit
                  </button>
                  <button 
                    className="vendor-coupon-management-delete-btn" 
                    onClick={() => onDelete(coupon.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [coupon, setCoupon] = useState({
    id: null,
    code: '',
    discount_type: '',
    discount_value: '',
    minimum_order_amount: '',
    valid_from: '',
    valid_to: '',
    max_uses: '',
    max_uses_per_user: '',
    is_active: true,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiErrors, setApiErrors] = useState(null);

  // Fetch all coupons
  const fetchCoupons = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchData(API_ENDPOINTS.COUPONS.FETCH, "GET", null, localStorage.getItem("access"));
      setCoupons(data);
    } catch (err) {
      setError('Failed to fetch coupons. Please try again.');
      console.error('Error fetching coupons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    setApiErrors(null);
    try {
      let response;
      if (coupon.id) {
        // Update existing coupon
        response = await fetchData(
          API_ENDPOINTS.COUPONS.UPDATE(coupon.id),
          "PUT",
          coupon,
          localStorage.getItem("access")
        );
        setCoupons(coupons.map(c => c.id === coupon.id ? response : c));
      } else {
        // Create new coupon
        response = await fetchData(
          API_ENDPOINTS.COUPONS.CREATE,
          "POST",
          coupon,
          localStorage.getItem("access")
        );
        setCoupons([...coupons, response]);
      }
      fetchCoupons();
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving coupon:', err);
      if (err.response && err.response.data) {
        // Handle validation errors from backend
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
      } else {
        setError('Failed to save coupon. Please try again.');
      }
      throw err;
    }
  };

  const handleEdit = (couponToEdit) => {
    setCoupon(couponToEdit);
    setIsModalOpen(true);
    setApiErrors(null);
  };

  const showConfirmationModal = (message) => {
    return new Promise((resolve) => {
      const userConfirmed = window.confirm(message);
      resolve(userConfirmed);
    });
  };
  

  const handleDelete = async (id) => {
    try {
      const isConfirmed = await showConfirmationModal("Are you sure you want to delete this coupon?");
      if (!isConfirmed) return;
      await fetchData(
        API_ENDPOINTS.COUPONS.DELETE(id),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      fetchCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      fetchCoupons();
    }
  };

  const resetForm = () => {
    setCoupon({
      id: null,
      code: '',
      discount_type: '',
      discount_value: '',
      minimum_order_amount: '',
      valid_from: '',
      valid_to: '',
      max_uses: '',
      max_uses_per_user: '',
      is_active: true,
    });
    setApiErrors(null);
  };

  const openNewCouponForm = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="vendor-coupon-management">
      <div className="vendor-coupon-management-header">
        <h1>Coupon Management</h1>
        <button 
          className="vendor-coupon-management-add-btn" 
          onClick={openNewCouponForm}
          disabled={isLoading}
        >
          + Add Coupon
        </button>
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

      <CouponTable 
        coupons={coupons} 
        onEdit={handleEdit} 
        onDelete={handleDelete} 
        isLoading={isLoading}
      />

      <CouponForm
        coupon={coupon}
        setCoupon={setCoupon}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
        isOpen={isModalOpen}
        apiErrors={apiErrors}
      />
    </div>
  );
};

export default CouponManagement;