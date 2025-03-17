import React, { useState } from "react";
import { Edit, Trash, CheckCircle, XCircle, PlusCircle, X } from "lucide-react";
import "../assets/css/vendor/MenuManagement.css";

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([
    {
      id: 1,
      name: "Burger",
      price: 9.99,
      description: "Juicy beef burger with cheese and veggies",
      category: "Main Course",
      cuisines: ["American"],
      spiceLevel: "Medium",
      preparationTime: 15,
      servingSize: "Medium",
      available: true,
      stockQuantity: 10,
      image: require("../assets/img/burger.webp"),
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    cuisines: [],
    spiceLevel: "Mild",
    preparationTime: "",
    servingSize: "Small",
    available: true,
    stockQuantity: "",
    image: null,
  });

  const categories = ["Appetizer", "Main Course", "Breakfast", "Dessert", "Beverage"];
  const spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const servingSizes = ["Small", "Medium", "Large"];
  const cuisinesList = ["Indian", "Chinese", "Italian", "Mexican", "American"];

  // Toggle Availability
  const toggleAvailability = (id) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  // Delete Item
  const handleDelete = (id) => {
    setMenuItems(menuItems.filter((item) => item.id !== id));
  };

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setNewItem((prev) => ({ ...prev, [name]: checked }));
    } else {
      setNewItem((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle File Upload
  const handleFileChange = (e) => {
    setNewItem((prev) => ({ ...prev, image: URL.createObjectURL(e.target.files[0]) }));
  };

  // Handle Multi-Select for Cuisines
  const handleCuisinesChange = (e) => {
    const value = Array.from(e.target.selectedOptions, (option) => option.value);
    setNewItem((prev) => ({ ...prev, cuisines: value }));
  };

  // Handle Add Menu Item
  const handleAddItem = () => {
    if (!newItem.name || !newItem.price || !newItem.description || !newItem.category) {
      alert("Please fill in all required fields!");
      return;
    }

    const newMenuItem = {
      ...newItem,
      id: menuItems.length + 1,
      price: parseFloat(newItem.price),
    };

    setMenuItems([...menuItems, newMenuItem]);

    // Reset form & Close modal
    setNewItem({
      name: "",
      price: "",
      description: "",
      category: "",
      cuisines: [],
      spiceLevel: "Mild",
      preparationTime: "",
      servingSize: "Small",
      available: true,
      stockQuantity: "",
      image: null,
    });
    setShowModal(false);
  };

  return (
    <div className="vendor-menu">
      {/* Header with Add Button */}
      <div className="vendor-header">
        <h2>Menu Management</h2>
        <button className="vendor-button add-item" onClick={() => setShowModal(true)}>
          <PlusCircle size={18} /> Add New Menu Item
        </button>
      </div>

      {/* Menu Table */}
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
          {menuItems.map((item) => (
            <tr key={item.id}>
              <td>
                <img src={item.image} alt={item.name} className="menu-item-img" />
              </td>
              <td>{item.name}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>{item.category}</td>
              <td>
                <p
                  className={`availability ${item.available ? "available" : "not-available"}`}
                  onClick={() => toggleAvailability(item.id)}
                >
                  {item.available ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {item.available ? " Available" : " Out of Stock"}
                </p>
              </td>
              <td className="action-buttons">
                <button className="edit">
                  <Edit size={16} /> Edit
                </button>
                <button className="delete" onClick={() => handleDelete(item.id)}>
                  <Trash size={16} /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      <div className={`modal-overlay-add-menue ${showModal ? "show" : ""}`}>
        <div className="modal-content">
          <button className="close-modal" onClick={() => setShowModal(false)}>
            <X size={24} />
          </button>
          <h3>Add New Menu Item</h3>

          <input type="text" name="name" placeholder="Item Name" value={newItem.name} onChange={handleChange} />
          <input type="number" name="price" placeholder="Price" value={newItem.price} onChange={handleChange} />
          <textarea name="description" placeholder="Description" value={newItem.description} onChange={handleChange} />

          <select name="category" value={newItem.category} onChange={handleChange}>
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select multiple name="cuisines" value={newItem.cuisines} onChange={handleCuisinesChange}>
            {cuisinesList.map((cuisine) => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </select>

          <select name="spiceLevel" value={newItem.spiceLevel} onChange={handleChange}>
            {spiceLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          <input type="number" name="preparationTime" placeholder="Preparation Time (mins)" value={newItem.preparationTime} onChange={handleChange} />
          <input type="number" name="stockQuantity" placeholder="Stock Quantity" value={newItem.stockQuantity} onChange={handleChange} />

          <select name="servingSize" value={newItem.servingSize} onChange={handleChange}>
            {servingSizes.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          <input type="file" accept="image/*" onChange={handleFileChange} />

          <label>
            <input type="checkbox" name="available" checked={newItem.available} onChange={handleChange} />
            Available
          </label>

          <button className="add-item-button" onClick={handleAddItem}>Add Item</button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
