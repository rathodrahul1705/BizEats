import React, { useState, useEffect } from "react";
import { Edit, Trash, PlusCircle, X } from "lucide-react";
import "../assets/css/vendor/MenuManagement.css";
import { useParams } from "react-router-dom";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const MenuManagement = () => {
  const { restaurant_id } = useParams();
  const [menuItems, setMenuItems] = useState([]);
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
  });

  const categories = ["Appetizer", "Main Course", "Breakfast", "Dessert", "Beverage"];
  const spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const cuisinesList = ["Indian", "Chinese", "Italian", "Mexican", "American"];

  useEffect(() => {
    fetchMenuItems();
  }, [restaurant_id]);

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
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "cuisines") {
          formData.cuisines.forEach((cuisine) => formDataToSend.append("cuisines[]", cuisine));
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
      });

      if (!response.ok) throw new Error(`Failed to ${editingItem ? "update" : "add"} menu item.`);
      // alert(`Menu item ${editingItem ? "updated" : "added"} successfully!`);
      setShowModal(false);
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDelete = async (itemId) => {
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

  return (
    <div className="vendor-menu">
      <div className="vendor-header">
        <h2>Menu Management</h2>
        <button
          className="vendor-button add-item"
          onClick={() => {
            console.log("Opening modal"); // Debugging line
            setShowModal(true);
          }}
        >
          <PlusCircle size={18} /> Add New Menu Item
        </button>
      </div>

      {loading ? (
        <p>Loading menu items...</p>
      ) : (
        <table className="vendor-menu-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Availability</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.length > 0 ? (
              menuItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <img className="menue-images" src={item.item_image} alt={item.item_name} />
                  </td>
                  <td>{item.item_name}</td>
                  <td>{item.item_price}</td>
                  <td>{item.category}</td>
                  <td>{item.availability ? "Available" : "Out of Stock"}</td>
                  <td>
                    <button className="edit" onClick={() => handleEdit(item)}>
                      <Edit size={16} /> Edit
                    </button>
                    <button className="delete" onClick={() => handleDelete(item.id)}>
                      <Trash size={16} /> Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No menu items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

    {showModal && (
      <div className="modal-overlay-add-menue show">
        <div className="modal-content">
          <button className="close-modal" onClick={() => setShowModal(false)}>
            <X size={24} />
          </button>
          <h3>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
          <form onSubmit={handleSubmit}>
            <label>
              Item Name
              <input
                type="text"
                name="item_name"
                placeholder="Item Name"
                value={formData.item_name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Price
              <input
                type="number"
                name="item_price"
                placeholder="Price"
                value={formData.item_price}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                placeholder="Description"
                value={formData.description}
                onChange={handleChange}
              />
            </label>
            <label>
              Category
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cuisines
              <select name="cuisines" multiple value={formData.cuisines} onChange={handleCuisineChange}>
                {cuisinesList.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Spice Level
              <select name="spice_level" value={formData.spice_level} onChange={handleChange}>
                {spiceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preparation Time (mins)
              <input
                type="number"
                name="preparation_time"
                placeholder="Preparation Time (mins)"
                value={formData.preparation_time}
                onChange={handleChange}
              />
            </label>
            <label>
              Serving Size
              <select name="serving_size" value={formData.serving_size} onChange={handleChange}>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </label>
            <label>
              Stock Quantity
              <input
                type="number"
                name="stock_quantity"
                placeholder="Stock Quantity"
                value={formData.stock_quantity}
                onChange={handleChange}
              />
            </label>
            <label>
              Item Image
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="availability"
                checked={formData.availability}
                onChange={handleChange}
              />
              Available
            </label>
            <button type="submit" className="add-item-button">
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