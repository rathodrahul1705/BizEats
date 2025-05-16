import React, { useState, useEffect } from "react";
import { Edit, Trash, PlusCircle, X, Menu, Search, Filter } from "lucide-react";
import "../assets/css/vendor/MenuManagement.css";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

const MenuManagement = () => {
  const { restaurant_id } = useParams();
  const [menuItems, setMenuItems] = useState([]);
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
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [bogoFilter, setBogoFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    "Appetizer",
    "Main Course",
    "Breakfast",
    "Dessert",
    "Beverage",
    "Burger",
    "Pizza",
    "Wraps & Rolls",
    "Sandwich",
    "Salad",
    "Combo Meal",
    "Street Food",
    "Rice & Biryani",
    "Noodles & Pasta"
  ];
  
  const spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const cuisinesList = ["Indian", "Chinese", "Italian", "Mexican", "American"];
  const servingSizes = ["Small", "Medium", "Large"];
  const foodTypes = ["Veg", "Non-Veg"];

  useEffect(() => {
    fetchMenuItems();
  }, [restaurant_id]);

  useEffect(() => {
    applyFilters();
  }, [menuItems, searchTerm, availabilityFilter, bogoFilter]);

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
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...menuItems];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply availability filter
    if (availabilityFilter !== "all") {
      filtered = filtered.filter(item => 
        availabilityFilter === "available" ? item.availability : !item.availability
      );
    }
    
    // Apply BOGO filter
    if (bogoFilter !== "all") {
      filtered = filtered.filter(item => 
        bogoFilter === "bogo" ? item.buy_one_get_one_free : !item.buy_one_get_one_free
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
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

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setFormData({ 
      ...item,
      cuisines: item.cuisines || [],
      buy_one_get_one_free: item.buy_one_get_one_free || false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
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

  const handleDelete = async (itemId) => {
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

  const resetFilters = () => {
    setSearchTerm("");
    setAvailabilityFilter("all");
    setBogoFilter("all");
  };

  if (loading && menuItems.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="vendor-menu-management">
      <div className="vendor-menu-management-header">
        <h2>Menu Management</h2>
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
            });
            setShowModal(true);
          }}
        >
          <PlusCircle size={18} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Filter Section */}
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

            <button 
              className="vendor-menu-management-reset-filters"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
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
                <th>Category</th>
                <th>Availability</th>
                <th>BOGO</th>
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
                  <td>{item.category}</td>
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
                    <div className="vendor-menu-management-action-buttons">
                      <button 
                        className="vendor-menu-management-edit" 
                        onClick={() => handleEdit(item)}
                        aria-label="Edit item"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="vendor-menu-management-delete" 
                        onClick={() => handleDelete(item.id)}
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

      {showModal && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>
            <h3>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
            <form onSubmit={handleSubmit}>
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
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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

              <button type="submit" className="vendor-menu-management-submit-btn">
                {editingItem ? "Update Item" : "Add Item"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;