import React, { useState, useEffect } from "react";
import { Edit, Trash, PlusCircle, X, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import "../assets/css/vendor/CartManagement.css";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const CustomerManagement = () => {
  const { restaurant_id } = useParams();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    contact_number: "",
    is_active: true
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchCustomers();
  }, [restaurant_id]);

  useEffect(() => {
    applyFilters();
  }, [customers, searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.USER.USER_LIST,
        "GET",
        null,
        localStorage.getItem("access")
      );
      
      const customersWithDefaults = (response.users || []).map(customer => ({
        full_name: customer.full_name || '',
        email: customer.email || '',
        contact_number: customer.contact_number || '',
        is_active: customer.is_active !== undefined ? customer.is_active : true,
        id: customer.id
      }));
      
      setCustomers(customersWithDefaults);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...customers];
    
    if (searchTerm) {
      filtered = filtered.filter(customer => {
        const name = customer.full_name || '';
        const email = customer.email || '';
        const phone = customer.contact_number || '';
        
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          phone.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(customer => 
        statusFilter === "active" ? customer.is_active : !customer.is_active
      );
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer.id);
    setFormData({ 
      full_name: customer.full_name,
      email: customer.email,
      contact_number: customer.contact_number,
      is_active: customer.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingCustomer
        ? API_ENDPOINTS.USER.USER_UPDATE(editingCustomer)
        : API_ENDPOINTS.USER.USER_CREATE;

      const method = editingCustomer ? "PUT" : "POST";

      const response = await fetchData(
        endpoint,
        method,
        formData,
        localStorage.getItem("access")
      );

      if (!response) throw new Error(`Failed to ${editingCustomer ? "update" : "add"} customer.`);
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.USER.USER_DELETE(customerId),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      if (response) {
        fetchCustomers();
      } else {
        throw new Error("Failed to delete customer.");
      }
    } catch (error) {
      console.error("Error:", error);
      fetchCustomers();
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading && customers.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="cart-management">
      <div className="cart-management-header">
        <div className="cart-management-header-left">
          <h2>Customer Management</h2>
          <div className="cart-management-results-count">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
          </div>
        </div>
        <div className="cart-management-header-right">
          <button
            className="cart-management-button cart-management-add-btn"
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                full_name: "",
                email: "",
                contact_number: "",
                is_active: true
              });
              setShowModal(true);
            }}
          >
            <PlusCircle size={18} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <div className="cart-management-content">
        {/* Filter Section */}
        <div className="cart-management-filters">
          <div className="cart-management-search-filter-container">
            <div className="cart-management-search">
              <Search size={18} className="cart-management-search-icon" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="cart-management-search-input"
              />
            </div>
            <button 
              className={`cart-management-filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="cart-management-filter-options">
              <div className="cart-management-filter-group">
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="cart-management-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <button 
                className="cart-management-reset-filters"
                onClick={resetFilters}
              >
                Reset All
              </button>
            </div>
          )}
        </div>

        {filteredCustomers.length > 0 ? (
          <>
            <div className="cart-management-table-container">
              <table className="cart-management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.full_name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.contact_number}</td>
                      <td>
                        <span className={`cart-management-status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="cart-management-action-buttons">
                          <button 
                            className="cart-management-edit" 
                            onClick={() => handleEdit(customer)}
                            aria-label="Edit customer"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="cart-management-delete" 
                            onClick={() => handleDelete(customer.id)}
                            aria-label="Delete customer"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="cart-management-pagination">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="cart-management-pagination-button"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`cart-management-pagination-button ${currentPage === number ? 'active' : ''}`}
                >
                  {number}
                </button>
              ))}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="cart-management-pagination-button"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="cart-management-empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h3>No Customers Found</h3>
            <p>{customers.length === 0 ? "Add your first customer" : "No customers match your filters"}</p>
            {customers.length > 0 && (
              <button 
                className="cart-management-reset-filters"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="cart-management-modal-overlay cart-management-show">
          <div className="cart-management-modal-content">
            <button className="cart-management-close-modal" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3>{editingCustomer ? "Edit Customer" : "Add New Customer"}</h3>
            <form onSubmit={handleSubmit}>
              <div className="cart-management-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="cart-management-form-control"
                  name="full_name"
                  placeholder="Customer Name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="cart-management-form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="cart-management-form-control"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="cart-management-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  className="cart-management-form-control"
                  name="contact_number"
                  placeholder="Phone Number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="cart-management-form-group cart-management-checkbox-group">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <label htmlFor="is_active">Active</label>
              </div>

              <div className="cart-management-form-actions">
                <button 
                  type="button" 
                  className="cart-management-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="cart-management-submit-btn"
                >
                  {editingCustomer ? "Update Customer" : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;