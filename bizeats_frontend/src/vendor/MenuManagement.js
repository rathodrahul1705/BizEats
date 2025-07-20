import React, { useState, useEffect } from "react";
import { Edit, Trash, PlusCircle, X, Menu, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import "../assets/css/vendor/MenuManagement.css";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const MenuManagement = () => {
  const { restaurant_id } = useParams();
  const [activeTab, setActiveTab] = useState("menu");
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [addons, setAddons] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    item_price: "",
    description: "",
    category: "",
    item_image: null,
    spice_level: "Mild",
    preparation_time: "",
    serving_size: "Small",
    availability: true,
    stock_quantity: "",
    cuisines: [],
    food_type: "Veg",
    buy_one_get_one_free: false,
    start_time: "",
    end_time: "",
    category_id: "",
    discount_percent: 0,
    discount_active: false
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_active: true
  });  

  // Addon form state
  const [addonForm, setAddonForm] = useState({
    name: "",
    price: "",
    description: "",
    is_active: true
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [bogoFilter, setBogoFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const cuisinesList = ["Indian", "Chinese", "Italian", "Mexican", "American"];
  const servingSizes = ["Small", "Medium", "Large"];
  const foodTypes = ["Veg", "Non-Veg"];

  useEffect(() => {
    fetchAllData();
  }, [restaurant_id]);

  useEffect(() => {
    applyFilters();
  }, [menuItems, searchTerm, availabilityFilter, bogoFilter, discountFilter]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMenuItems(),
        fetchCategories(),
        fetchAddons()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_MENUE_LIST(restaurant_id),
        "GET",
        null,
        localStorage.getItem("access")
      );
      setMenuItems(response.length > 0 ? response : []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_CATEGORY_GET(restaurant_id),
        "GET",
        null,
        localStorage.getItem("access")
      );
      setCategories(response.length > 0 ? response : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAddons = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_ADDONS(restaurant_id),
        "GET",
        null,
        localStorage.getItem("access")
      );
      setAddons(response.length > 0 ? response : []);
    } catch (error) {
      console.error("Error fetching addons:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...menuItems];
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (availabilityFilter !== "all") {
      filtered = filtered.filter(item => 
        availabilityFilter === "available" ? item.availability : !item.availability
      );
    }
    
    if (bogoFilter !== "all") {
      filtered = filtered.filter(item => 
        bogoFilter === "bogo" ? item.buy_one_get_one_free : !item.buy_one_get_one_free
      );
    }
    
    if (discountFilter !== "all") {
      filtered = filtered.filter(item => 
        discountFilter === "discounted" ? (item.discount_active && item.discount_percent > 0) : 
        (!item.discount_active || item.discount_percent <= 0)
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "category" && { category_id: value }),
    }));
  };

  const handleCategoryChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCategoryForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddonForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, item_image: e.target.files[0] }));
  };

  const handleCuisineChange = (e) => {
    const selectedCuisines = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, cuisines: selectedCuisines }));
  };

  const handleEditItem = (item) => {
    setEditingItem(item.id);
    setFormData({ 
      ...item,
      cuisines: item.cuisines || [],
      buy_one_get_one_free: item.buy_one_get_one_free || false,
      discount_percent: item.discount_percent || 0,
      discount_active: item.discount_active || false,
      category_id: item.category_id || ""
    });
    setShowModal(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {        
        if (key === "cuisines") {
          formData.cuisines.forEach((cuisine) => formDataToSend.append("cuisines[]", cuisine));
        } else if (key === "availability") {
          formDataToSend.append(key, formData[key] ? "1" : "0");
        } else if (key === "buy_one_get_one_free") {
          formDataToSend.append(key, formData[key] ? "1" : "0");
        } else if (key === "discount_active") {
          formDataToSend.append(key, formData[key] ? "1" : "0");
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      const endpoint = editingItem
        ? API_ENDPOINTS.RESTAURANT.RES_MENUE_UPDATE(editingItem, restaurant_id)
        : API_ENDPOINTS.RESTAURANT.RES_MENUE_STORE(restaurant_id);

      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("access")}`
        }
      });

      if (!response.ok) throw new Error(`Failed to ${editingItem ? "update" : "add"} menu item.`);
      setShowModal(false);
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_MENUE_DELETE(itemId, restaurant_id),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      if (response) {
        fetchMenuItems();
      } else {
        throw new Error("Failed to delete menu item.");
      }
    } catch (error) {
      console.error("Error:", error);
      fetchMenuItems();
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(categoryForm).forEach(key => {
        if (key === "is_active") {
          formDataToSend.append(key, categoryForm[key] ? "1" : "0");
        } else {
          formDataToSend.append(key, categoryForm[key]);
        }
      });

      formDataToSend.append("restaurant_id", restaurant_id);
      const response = await fetch(API_ENDPOINTS.RESTAURANT.RES_CATEGORY_STORE(categoryForm.id), {
        method: categoryForm.id ? "PUT" : "POST",
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("access")}`
        }
      });

      if (!response.ok) throw new Error("Failed to add category");
      
      setCategoryForm({
        name: "",
        description: "",
        is_active: true
      });
      setShowModal(false)
      fetchCategories();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_CATEGORY_DELETE(categoryId),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      if (response) {
        fetchCategories();
      } else {
        throw new Error("Failed to delete category.");
      }
    } catch (error) {
      console.error("Error:", error);
      fetchCategories();
    }
  };

  const handleSubmitAddon = async (e) => {
    e.preventDefault();
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_ADDON_STORE(restaurant_id),
        "POST",
        addonForm,
        localStorage.getItem("access")
      );
      
      setAddonForm({
        name: "",
        price: "",
        description: "",
        is_active: true
      });
      fetchAddons();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDeleteAddon = async (addonId) => {
    if (!window.confirm("Are you sure you want to delete this addon?")) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.RES_ADDON_DELETE(addonId, restaurant_id),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      if (response) {
        fetchAddons();
      } else {
        throw new Error("Failed to delete addon.");
      }
    } catch (error) {
      console.error("Error:", error);
      fetchAddons();
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAvailabilityFilter("all");
    setBogoFilter("all");
    setDiscountFilter("all");
  };

  const calculateDiscountedPrice = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;
    return (price * (1 - discountPercent / 100)).toFixed(2);
  };

  if (loading && menuItems.length === 0 && categories.length === 0 && addons.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="vendor-menu-management">
      <div className="vendor-menu-management-header">
        <h2>Menu Management</h2>
        <div className="vendor-menu-management-header-actions">
          <div className="vendor-menu-management-tabs">
            <button
              className={`vendor-menu-management-tab ${activeTab === "menu" ? "active" : ""}`}
              onClick={() => setActiveTab("menu")}
            >
              Menu Items
            </button>
            <button
              className={`vendor-menu-management-tab ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => setActiveTab("categories")}
            >
              Categories
            </button>
            <button
              className={`vendor-menu-management-tab ${activeTab === "addons" ? "active" : ""}`}
              onClick={() => setActiveTab("addons")}
            >
              Add-ons
            </button>
          </div>
          
          {activeTab === "menu" && (
            <button
              className="vendor-menu-management-button vendor-menu-management-add-item"
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  item_name: "",
                  item_price: "",
                  description: "",
                  category: "",
                  item_image: null,
                  spice_level: "Mild",
                  preparation_time: "",
                  serving_size: "Small",
                  availability: true,
                  stock_quantity: "",
                  cuisines: [],
                  food_type: "Veg",
                  buy_one_get_one_free: false,
                  start_time: "",
                  end_time: "",
                  category_id: "",
                  discount_percent: 0,
                  discount_active: false
                });
                setShowModal(true);
              }}
            >
              <PlusCircle size={18} />
              <span>Add Item</span>
            </button>
          )}
          {activeTab === "categories" && (
            <button
              className="vendor-menu-management-button vendor-menu-management-add-item"
              onClick={() => {
                setShowModal("category");
                setCategoryForm({
                  name: "",
                  description: "",
                  is_active: true
                });
              }}
            >
              <PlusCircle size={18} />
              <span>Add Category</span>
            </button>
          )}
          {activeTab === "addons" && (
            <button
              className="vendor-menu-management-button vendor-menu-management-add-item"
              onClick={() => {
                setShowModal("addon");
                setAddonForm({
                  name: "",
                  price: "",
                  description: "",
                  is_active: true
                });
              }}
            >
              <PlusCircle size={18} />
              <span>Add Add-on</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "menu" && (
        <>
          <div className="vendor-menu-management-filters">
            <div className="vendor-menu-management-search">
              <Search size={18} className="vendor-menu-management-search-icon" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="vendor-menu-management-search-input"
              />
              <button 
                className="vendor-menu-management-filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
                <span>Filters</span>
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {showFilters && (
              <div className="vendor-menu-management-filter-options">
                <div className="vendor-menu-management-filter-group">
                  <label>Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All</option>
                    <option value="available">Available</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>

                <div className="vendor-menu-management-filter-group">
                  <label>BOGO</label>
                  <select
                    value={bogoFilter}
                    onChange={(e) => setBogoFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All</option>
                    <option value="bogo">BOGO Only</option>
                    <option value="regular">Regular Only</option>
                  </select>
                </div>

                <div className="vendor-menu-management-filter-group">
                  <label>Discount</label>
                  <select
                    value={discountFilter}
                    onChange={(e) => setDiscountFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All</option>
                    <option value="discounted">Discounted Only</option>
                    <option value="non-discounted">Non-Discounted</option>
                  </select>
                </div>

                <button 
                  className="vendor-menu-management-reset-filters"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          <div className="vendor-menu-management-results-count">
            Showing {filteredItems.length} of {menuItems.length} items
          </div>

          {filteredItems.length > 0 ? (
            <div className="vendor-menu-management-table-container">
              <table className="vendor-menu-management-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Discounted Price</th>
                    <th>Discount %</th>
                    {/* <th>Category</th> */}
                    <th>Availability</th>
                    <th>BOGO</th>
                    <th>Discount Active</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <img 
                          className="vendor-menu-management-images" 
                          src={item.item_image || "https://via.placeholder.com/60"} 
                          alt={item.item_name} 
                        />
                      </td>
                      <td>{item.item_name}</td>
                      <td>₹{item.item_price}</td>
                      <td>
                        {item.discount_active && item.discount_percent > 0 ? (
                          <>
                            ₹{calculateDiscountedPrice(item.item_price, item.discount_percent)}
                            <span className="vendor-menu-management-original-price">
                              (₹{item.item_price})
                            </span>
                          </>
                        ) : (
                          "₹" + item.item_price
                        )}
                      </td>
                      <td>
                        {item.discount_percent > 0 ? `${item.discount_percent}%` : "-"}
                      </td>
                      {/* <td>{item.category}</td> */}
                      <td>
                        <span className={`vendor-menu-management-availability-badge ${item.availability ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {item.availability ? "Available" : "Out of Stock"}
                        </span>
                      </td>
                      <td>
                        <span className={`vendor-menu-management-availability-badge ${item.buy_one_get_one_free ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {item.buy_one_get_one_free ? "B1G1F" : "Regular"}
                        </span>
                      </td>
                      <td>
                        <span className={`vendor-menu-management-availability-badge ${item.discount_active ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {item.discount_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{item.start_time || "-"}</td>
                      <td>{item.end_time || "-"}</td>
                      <td>
                        <div className="vendor-menu-management-action-buttons">
                          <button 
                            className="vendor-menu-management-edit" 
                            onClick={() => handleEditItem(item)}
                            aria-label="Edit item"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="vendor-menu-management-delete" 
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label="Delete item"
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
          ) : (
            <div className="vendor-menu-management-empty-state">
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
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <h3>No Menu Items Found</h3>
              <p>{menuItems.length === 0 ? "Add your first menu item to get started" : "No items match your filters"}</p>
              {menuItems.length > 0 && (
                <button 
                  className="vendor-menu-management-reset-filters"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "categories" && (
        <>
          <div className="vendor-menu-management-results-count">
            Showing {categories.length} categories
          </div>

          {categories.length > 0 ? (
            <div className="vendor-menu-management-table-container">
              <table className="vendor-menu-management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.category_name}</td>
                      <td>{category.category_description || "-"}</td>
                      <td>
                        <span className={`vendor-menu-management-availability-badge ${category.category_status ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {category.category_status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="vendor-menu-management-action-buttons">
                          <button 
                            className="vendor-menu-management-edit" 
                            onClick={() => {
                              setShowModal("category");
                              setCategoryForm({
                                ...category,
                                category_status: category.category_status
                              });
                            }}
                            aria-label="Edit category"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="vendor-menu-management-delete" 
                            onClick={() => handleDeleteCategory(category.id)}
                            aria-label="Delete category"
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
          ) : (
            <div className="vendor-menu-management-empty-state">
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <h3>No Categories Found</h3>
              <p>Add your first category to organize your menu items</p>
            </div>
          )}
        </>
      )}

      {activeTab === "addons" && (
        <>
          <div className="vendor-menu-management-results-count">
            Showing {addons.length} add-ons
          </div>

          {addons.length > 0 ? (
            <div className="vendor-menu-management-table-container">
              <table className="vendor-menu-management-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {addons.map((addon) => (
                    <tr key={addon.id}>
                      <td>{addon.name}</td>
                      <td>₹{addon.price}</td>
                      <td>{addon.description || "-"}</td>
                      <td>
                        <span className={`vendor-menu-management-availability-badge ${addon.is_active ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {addon.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="vendor-menu-management-action-buttons">
                          <button 
                            className="vendor-menu-management-edit" 
                            onClick={() => {
                              setShowModal("addon");
                              setAddonForm({
                                ...addon,
                                is_active: addon.is_active
                              });
                            }}
                            aria-label="Edit addon"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="vendor-menu-management-delete" 
                            onClick={() => handleDeleteAddon(addon.id)}
                            aria-label="Delete addon"
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
          ) : (
            <div className="vendor-menu-management-empty-state">
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
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              </svg>
              <h3>No Add-ons Found</h3>
              <p>Add your first add-on to provide extra options for your menu items</p>
            </div>
          )}
        </>
      )}

      {showModal === true && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
            <form onSubmit={handleSubmitItem}>
              <div className="vendor-menu-management-form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  className="vendor-menu-management-form-control"
                  name="item_name"
                  placeholder="Item Name"
                  value={formData.item_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Price</label>
                <input
                  type="number"
                  className="vendor-menu-management-form-control"
                  name="item_price"
                  placeholder="Price"
                  value={formData.item_price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Description</label>
                <textarea
                  className="vendor-menu-management-form-control"
                  name="description"
                  placeholder="Description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Category</label>
                <select
                  className="vendor-menu-management-form-control"
                  name="category"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      disabled={cat.category_status === false}
                    >
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vendor-menu-management-form-group">
                <label>Cuisines</label>
                <select
                  className="vendor-menu-management-form-control"
                  name="cuisines"
                  multiple
                  value={formData.cuisines}
                  onChange={handleCuisineChange}
                >
                  {cuisinesList.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
                <small className="vendor-menu-management-form-text">Hold Ctrl/Cmd to select multiple</small>
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Spice Level</label>
                <select
                  className="vendor-menu-management-form-control"
                  name="spice_level"
                  value={formData.spice_level}
                  onChange={handleChange}
                >
                  {spiceLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Preparation Time (minutes)</label>
                <input
                  type="number"
                  className="vendor-menu-management-form-control"
                  name="preparation_time"
                  placeholder="Preparation Time"
                  value={formData.preparation_time}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Serving Size</label>
                <select
                  className="vendor-menu-management-form-control"
                  name="serving_size"
                  value={formData.serving_size}
                  onChange={handleChange}
                >
                  {servingSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Food Type</label>
                <select
                  className="vendor-menu-management-form-control"
                  name="food_type"
                  value={formData.food_type}
                  onChange={handleChange}
                  required
                >
                  {foodTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  className="vendor-menu-management-form-control"
                  name="stock_quantity"
                  placeholder="Stock Quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Item Image</label>
                <input 
                  type="file" 
                  className="vendor-menu-management-form-control"
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                {formData.item_image && !(formData.item_image instanceof File) && (
                  <img 
                    src={formData.item_image} 
                    alt="Current" 
                    style={{ width: '100px', marginTop: '10px' }} 
                  />
                )}
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Discount Percentage</label>
                <input
                  type="number"
                  className="vendor-menu-management-form-control"
                  name="discount_percent"
                  placeholder="Discount %"
                  value={formData.discount_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                />
              </div>

              <div className="vendor-menu-management-form-group vendor-menu-management-checkbox-group">
                <input
                  type="checkbox"
                  id="discount_active"
                  name="discount_active"
                  checked={formData.discount_active}
                  onChange={handleChange}
                />
                <label htmlFor="discount_active">Discount Active</label>
              </div>

              {formData.discount_percent > 0 && (
                <div className="vendor-menu-management-discount-preview">
                  <p>
                    Original Price: ₹{formData.item_price || 0}<br />
                    Discounted Price: ₹{calculateDiscountedPrice(formData.item_price || 0, formData.discount_percent)}
                  </p>
                </div>
              )}

              <div className="vendor-menu-management-form-group vendor-menu-management-checkbox-group">
                <input
                  type="checkbox"
                  id="availability"
                  name="availability"
                  checked={formData.availability}
                  onChange={handleChange}
                />
                <label htmlFor="availability">Available</label>
              </div>

              <div className="vendor-menu-management-form-group vendor-menu-management-checkbox-group">
                <input
                  type="checkbox"
                  id="buy_one_get_one_free"
                  name="buy_one_get_one_free"
                  checked={formData.buy_one_get_one_free}
                  onChange={handleChange}
                />
                <label htmlFor="availability">Buy One Get One Free</label>
              </div>

              <div className="vendor-menu-management-time-inputs">
                <div className="vendor-menu-management-form-group">
                  <label>Available From</label>
                  <div className="vendor-menu-management-time-wrapper">
                    <input
                      type="time"
                      className="vendor-menu-management-form-control"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="vendor-menu-management-form-group">
                  <label>Available Until</label>
                  <div className="vendor-menu-management-time-wrapper">
                    <input
                      type="time"
                      className="vendor-menu-management-form-control"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="vendor-menu-management-submit-btn">
                {editingItem ? "Update Item" : "Add Item"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === "category" && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3>{categoryForm.id ? "Edit Category" : "Add New Category"}</h3>
            <form onSubmit={handleSubmitCategory}>
              <div className="vendor-menu-management-form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  className="vendor-menu-management-form-control"
                  name="category_name"
                  placeholder="Category Name"
                  value={categoryForm.category_name}
                  onChange={handleCategoryChange}
                  required
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Description</label>
                <textarea
                  className="vendor-menu-management-form-control"
                  name="category_description"
                  placeholder="Description"
                  value={categoryForm.category_description}
                  onChange={handleCategoryChange}
                  rows="3"
                />
              </div>
              <div className="vendor-menu-management-form-group vendor-menu-management-checkbox-group">
                <input
                  type="checkbox"
                  id="is_active"
                  name="category_status"
                  checked={categoryForm.category_status}
                  onChange={handleCategoryChange}
                />
                <label htmlFor="is_active">Active</label>
              </div>

              <button type="submit" className="vendor-menu-management-submit-btn">
                {categoryForm.id ? "Update Category" : "Add Category"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === "addon" && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3>{addonForm.id ? "Edit Add-on" : "Add New Add-on"}</h3>
            <form onSubmit={handleSubmitAddon}>
              <div className="vendor-menu-management-form-group">
                <label>Add-on Name</label>
                <input
                  type="text"
                  className="vendor-menu-management-form-control"
                  name="name"
                  placeholder="Add-on Name"
                  value={addonForm.name}
                  onChange={handleAddonChange}
                  required
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Price</label>
                <input
                  type="number"
                  className="vendor-menu-management-form-control"
                  name="price"
                  placeholder="Price"
                  value={addonForm.price}
                  onChange={handleAddonChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="vendor-menu-management-form-group">
                <label>Description</label>
                <textarea
                  className="vendor-menu-management-form-control"
                  name="description"
                  placeholder="Description"
                  value={addonForm.description}
                  onChange={handleAddonChange}
                  rows="3"
                />
              </div>

              <div className="vendor-menu-management-form-group vendor-menu-management-checkbox-group">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={addonForm.is_active}
                  onChange={handleAddonChange}
                />
                <label htmlFor="is_active">Active</label>
              </div>

              <button type="submit" className="vendor-menu-management-submit-btn">
                {addonForm.id ? "Update Add-on" : "Add Add-on"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;