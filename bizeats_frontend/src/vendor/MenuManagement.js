import React, { useState, useEffect } from "react";
import { 
  Edit, 
  Trash, 
  PlusCircle, 
  X, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Layers,
  Clock,
  Flame,
  Users,
  Tag,
  Star,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Grid,
  List,
  DollarSign,
  Percent,
  Gift,
  Calendar,
  Clock as ClockIcon,
  Eye,
  Copy,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
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
  const [addonGroups, setAddonGroups] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [groupedMenuItems, setGroupedMenuItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedCategories, setExpandedCategories] = useState([]);
  
  // Menu item form state
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
    discount_active: false,
    addon_groups: []  // This should store addon_group_id values
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    is_active: true
  });

  // Addon Group form state
  const [addonGroupForm, setAddonGroupForm] = useState({
    id: null,
    name: "",
    description: "",
    allow_multiple_selection: false,
    min_selection: 0,
    max_selection: 1,
    allow_multiple_quantity: false,
    min_quantity: 1,
    max_quantity: 10,
    is_active: true,
    addons: []
  });

  // Individual addon item
  const [currentAddon, setCurrentAddon] = useState({
    id: null,
    name: "",
    price: "",
    dietary_type: "Veg",
    is_active: true
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [bogoFilter, setBogoFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddAddonForm, setShowAddAddonForm] = useState(false);

  const spiceLevels = ["Mild", "Medium", "Spicy", "Extra Spicy"];
  const cuisinesList = ["Indian", "Chinese", "Italian", "Mexican", "American"];
  const servingSizes = ["Small", "Medium", "Large"];
  const foodTypes = ["Veg", "Non-Veg"];
  const dietaryTypes = ["Veg", "Non-Veg", "Egg"];

  useEffect(() => {
    fetchAllData();
  }, [restaurant_id]);

  useEffect(() => {
    applyFilters();
  }, [menuItems, searchTerm, availabilityFilter, bogoFilter, discountFilter, categoryFilter]);

  useEffect(() => {
    // Group menu items by category
    const grouped = {};
    filteredItems.forEach(item => {
      const categoryName = item.category || "Uncategorized";
      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          category_name: categoryName,
          category_id: item.category_id,
          items: []
        };
      }
      grouped[categoryName].items.push(item);
    });
    setGroupedMenuItems(grouped);
  }, [filteredItems]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMenuItems(),
        fetchCategories(),
        fetchAddonGroups()
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
      const items = response.length > 0 ? response : [];
      setMenuItems(items);
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

  const fetchAddonGroups = async () => {
    try {
      const response = await fetchData(
        API_ENDPOINTS.ADDON.ADDON_GROUPS(restaurant_id),
        "GET",
        null,
        localStorage.getItem("access")
      );
      setAddonGroups(response.length > 0 ? response : []);
    } catch (error) {
      console.error("Error fetching addon groups:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...menuItems];
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
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
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => 
        item.category_id === parseInt(categoryFilter)
      );
    }
    
    setFilteredItems(filtered);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;
    
    try {
      if (bulkAction === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) return;
        
        for (const itemId of selectedItems) {
          await fetchData(
            API_ENDPOINTS.RESTAURANT.RES_MENUE_DELETE(itemId, restaurant_id),
            "DELETE",
            null,
            localStorage.getItem("access")
          );
        }
        
        setSelectedItems([]);
        setBulkAction("");
        fetchMenuItems();
      } else if (bulkAction === 'activate') {
        // Bulk activate items
        for (const itemId of selectedItems) {
          const item = menuItems.find(i => i.id === itemId);
          if (item) {
            await fetchData(
              API_ENDPOINTS.RESTAURANT.RES_MENUE_UPDATE(itemId, restaurant_id),
              "PUT",
              { ...item, availability: true },
              localStorage.getItem("access")
            );
          }
        }
        
        setSelectedItems([]);
        setBulkAction("");
        fetchMenuItems();
      } else if (bulkAction === 'deactivate') {
        // Bulk deactivate items
        for (const itemId of selectedItems) {
          const item = menuItems.find(i => i.id === itemId);
          if (item) {
            await fetchData(
              API_ENDPOINTS.RESTAURANT.RES_MENUE_UPDATE(itemId, restaurant_id),
              "PUT",
              { ...item, availability: false },
              localStorage.getItem("access")
            );
          }
        }
        
        setSelectedItems([]);
        setBulkAction("");
        fetchMenuItems();
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
      alert("Error performing bulk action");
    }
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

  const handleAddonGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddonGroupForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : 
               name === "min_selection" || name === "max_selection" || 
               name === "min_quantity" || name === "max_quantity" ? 
               parseInt(value) || 0 : value,
    }));
  };

  const handleCurrentAddonChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentAddon((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : 
              name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, item_image: e.target.files[0] }));
  };

  const handleCuisineChange = (e) => {
    const selectedCuisines = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, cuisines: selectedCuisines }));
  };

  // Updated to handle addon_list_id structure
  const handleAddonGroupSelection = (e) => {
    const { value, checked } = e.target;
    const addonGroupId = parseInt(value);
    setFormData(prev => ({
      ...prev,
      addon_groups: checked 
        ? [...prev.addon_groups, addonGroupId]
        : prev.addon_groups.filter(id => id !== addonGroupId)
    }));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Updated handleEditItem to properly extract addon_group_id from addon_list_id
  const handleEditItem = (item) => {
    setEditingItem(item.id);
    
    // Extract addon_group_id values from addon_list_id array
    const addonGroupIds = item.addon_list_id 
      ? item.addon_list_id.map(addon => addon.addon_group_id)
      : [];
    
    setFormData({ 
      ...item,
      cuisines: item.cuisines || [],
      buy_one_get_one_free: item.buy_one_get_one_free || false,
      discount_percent: item.discount_percent || 0,
      discount_active: item.discount_active || false,
      category_id: item.category_id || "",
      addon_groups: addonGroupIds  // Set the addon_group_id values
    });
    setShowModal(true);
  };

  const handleDuplicateItem = async (item) => {
    if (!window.confirm("Duplicate this menu item?")) return;
    
    try {
      // Extract addon_group_id values from addon_list_id array for duplication
      const addonGroupIds = item.addon_list_id 
        ? item.addon_list_id.map(addon => addon.addon_group_id)
        : [];
      
      const duplicateData = {
        ...item,
        item_name: `${item.item_name} (Copy)`,
        item_image: null,
        addon_groups: addonGroupIds  // Include addon groups in duplicate
      };
      
      const formDataToSend = new FormData();
      Object.keys(duplicateData).forEach((key) => {
        if (key === "cuisines" && duplicateData.cuisines) {
          duplicateData.cuisines.forEach((cuisine) => formDataToSend.append("cuisines[]", cuisine));
        } else if (key === "addon_groups" && duplicateData.addon_groups) {
          duplicateData.addon_groups.forEach((groupId) => formDataToSend.append("addon_groups[]", groupId));
        } else if (key === "availability" || key === "buy_one_get_one_free" || key === "discount_active") {
          formDataToSend.append(key, duplicateData[key] ? "1" : "0");
        } else if (key !== "id" && key !== "created_at" && key !== "updated_at" && key !== "addon_list_id") {
          formDataToSend.append(key, duplicateData[key]);
        }
      });

      const response = await fetch(API_ENDPOINTS.RESTAURANT.RES_MENUE_STORE(restaurant_id), {
        method: "POST",
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("access")}`
        }
      });

      if (!response.ok) throw new Error("Failed to duplicate menu item.");
      
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to duplicate item");
    }
  };

  const handleAddAddonToGroup = () => {
    if (!currentAddon.name.trim() || currentAddon.price === "") {
      alert("Please fill in addon name and price");
      return;
    }

    const newAddon = {
      ...currentAddon,
      id: currentAddon.id || Date.now()
    };

    setAddonGroupForm(prev => ({
      ...prev,
      addons: currentAddon.id 
        ? prev.addons.map(addon => addon.id === currentAddon.id ? newAddon : addon)
        : [...prev.addons, newAddon]
    }));

    setCurrentAddon({
      id: null,
      name: "",
      price: "",
      dietary_type: "Veg",
      is_active: true
    });
    setShowAddAddonForm(false);
  };

  const handleEditAddonInGroup = (addon) => {
    setCurrentAddon(addon);
    setShowAddAddonForm(true);
  };

  const handleRemoveAddonFromGroup = (addonId) => {
    if (window.confirm("Are you sure you want to remove this addon?")) {
      setAddonGroupForm(prev => ({
        ...prev,
        addons: prev.addons.filter(addon => addon.id !== addonId)
      }));
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {        
        if (key === "cuisines") {
          formData.cuisines.forEach((cuisine) => formDataToSend.append("cuisines[]", cuisine));
        } else if (key === "addon_groups") {
          // Send addon groups as array of addon_group_id
          formData.addon_groups.forEach((groupId) => {
            formDataToSend.append("addon_groups[]", groupId);
          });
        } else if (key === "availability" || key === "buy_one_get_one_free" || key === "discount_active") {
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
      setShowModal(false);
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

  const handleSubmitAddonGroup = async (e) => {
    e.preventDefault();
    try {
      const groupData = {
        name: addonGroupForm.name,
        description: addonGroupForm.description,
        allow_multiple_selection: addonGroupForm.allow_multiple_selection,
        min_selection: addonGroupForm.min_selection,
        max_selection: addonGroupForm.max_selection,
        allow_multiple_quantity: addonGroupForm.allow_multiple_quantity,
        min_quantity: addonGroupForm.min_quantity,
        max_quantity: addonGroupForm.max_quantity,
        is_active: addonGroupForm.is_active,
        addons_data: addonGroupForm.addons.map(addon => ({
          name: addon.name,
          price: parseFloat(addon.price),
          dietary_type: addon.dietary_type,
          is_active: addon.is_active
        }))
      };

      if (addonGroupForm.id) {
        groupData.addons_data = addonGroupForm.addons.map(addon => ({
          id: addon.id && addon.id !== Date.now() ? addon.id : null,
          name: addon.name,
          price: parseFloat(addon.price),
          dietary_type: addon.dietary_type,
          is_active: addon.is_active
        }));
      }

      let response;
      if (addonGroupForm.id) {
        response = await fetchData(
          API_ENDPOINTS.ADDON.ADDON_GROUP_UPDATE(addonGroupForm.id, restaurant_id),
          "PUT",
          groupData,
          localStorage.getItem("access")
        );
      } else {
        response = await fetchData(
          API_ENDPOINTS.ADDON.ADDON_GROUP_STORE(restaurant_id),
          "POST",
          groupData,
          localStorage.getItem("access")
        );
      }
      
      if (!response) {
        throw new Error(`Failed to ${addonGroupForm.id ? "update" : "create"} addon group`);
      }
      
      setAddonGroupForm({
        id: null,
        name: "",
        description: "",
        allow_multiple_selection: false,
        min_selection: 0,
        max_selection: 1,
        allow_multiple_quantity: false,
        min_quantity: 1,
        max_quantity: 10,
        is_active: true,
        addons: []
      });
      
      setCurrentAddon({
        id: null,
        name: "",
        price: "",
        dietary_type: "Veg",
        is_active: true
      });
      
      setShowAddAddonForm(false);
      setShowModal(false);
      fetchAddonGroups();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  };

  const handleDeleteAddonGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this addon group? All addons in this group will also be deleted.")) return;
    
    try {
      const response = await fetchData(
        API_ENDPOINTS.ADDON.ADDON_GROUP_DELETE(groupId, restaurant_id),
        "DELETE",
        null,
        localStorage.getItem("access")
      );
      if (response) {
        fetchAddonGroups();
      } else {
        throw new Error("Failed to delete addon group.");
      }
    } catch (error) {
      console.error("Error:", error);
      fetchAddonGroups();
    }
  };

  const handleEditAddonGroup = (group) => {
    setAddonGroupForm({
      id: group.id,
      name: group.name,
      description: group.description || "",
      allow_multiple_selection: group.allow_multiple_selection || false,
      min_selection: group.min_selection || 0,
      max_selection: group.max_selection || 1,
      allow_multiple_quantity: group.allow_multiple_quantity || false,
      min_quantity: group.min_quantity || 1,
      max_quantity: group.max_quantity || 10,
      is_active: group.is_active,
      addons: group.addons ? group.addons.map(addon => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        dietary_type: addon.dietary_type,
        is_active: addon.is_active
      })) : []
    });
    setCurrentAddon({
      id: null,
      name: "",
      price: "",
      dietary_type: "Veg",
      is_active: true
    });
    setShowAddAddonForm(false);
    setShowModal("addon-group");
  };

  const resetFilters = () => {
    setSearchTerm("");
    setAvailabilityFilter("all");
    setBogoFilter("all");
    setDiscountFilter("all");
    setCategoryFilter("all");
  };

  const calculateDiscountedPrice = (price, discountPercent) => {
    if (!discountPercent || discountPercent <= 0) return price;
    return (price * (1 - discountPercent / 100)).toFixed(2);
  };

  const getDietaryBadgeColor = (dietaryType) => {
    switch(dietaryType) {
      case 'Veg': return 'dietary-veg';
      case 'Non-Veg': return 'dietary-nonveg';
      case 'Egg': return 'dietary-egg';
      default: return 'dietary-veg';
    }
  };

  const getSpiceLevelColor = (spiceLevel) => {
    switch(spiceLevel) {
      case 'Mild': return 'spice-mild';
      case 'Medium': return 'spice-medium';
      case 'Spicy': return 'spice-spicy';
      case 'Extra Spicy': return 'spice-extra-spicy';
      default: return 'spice-mild';
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0 || quantity === "0") return 'out';
    if (quantity <= 10) return 'low';
    return 'high';
  };

  const handleCancelAddAddon = () => {
    setCurrentAddon({
      id: null,
      name: "",
      price: "",
      dietary_type: "Veg",
      is_active: true
    });
    setShowAddAddonForm(false);
  };

  const formatINR = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Helper function to check if an addon group is selected
  const isAddonGroupSelected = (groupId) => {
    return formData.addon_groups.includes(groupId);
  };

  if (loading && menuItems.length === 0 && categories.length === 0 && addonGroups.length === 0) {
    return <StripeLoader />;
  }

  return (
    <div className="vendor-menu-management">
      <div className="vendor-menu-management-header">
        <div className="vendor-menu-management-header-top">
          <h2>
            <span className="vendor-menu-management-header-icon">🍽️</span>
            Menu Management
          </h2>
        </div>
        
        <div className="vendor-menu-management-header-actions">
          <div className="vendor-menu-management-tabs">
            <button
              className={`vendor-menu-management-tab ${activeTab === "menu" ? "active" : ""}`}
              onClick={() => setActiveTab("menu")}
            >
              <span className="vendor-menu-management-tab-icon">📋</span>
              Menu Items
            </button>
            <button
              className={`vendor-menu-management-tab ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => setActiveTab("categories")}
            >
              <span className="vendor-menu-management-tab-icon">🏷️</span>
              Categories
            </button>
            <button
              className={`vendor-menu-management-tab ${activeTab === "addons" ? "active" : ""}`}
              onClick={() => setActiveTab("addons")}
            >
              <span className="vendor-menu-management-tab-icon">➕</span>
              Add-ons & Groups
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
                  discount_active: false,
                  addon_groups: []
                });
                setShowModal(true);
              }}
            >
              <PlusCircle size={18} />
              <span>Add Menu Item</span>
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
                setShowModal("addon-group");
                setAddonGroupForm({
                  id: null,
                  name: "",
                  description: "",
                  allow_multiple_selection: false,
                  min_selection: 0,
                  max_selection: 1,
                  allow_multiple_quantity: false,
                  min_quantity: 1,
                  max_quantity: 10,
                  is_active: true,
                  addons: []
                });
                setCurrentAddon({
                  id: null,
                  name: "",
                  price: "",
                  dietary_type: "Veg",
                  is_active: true
                });
                setShowAddAddonForm(false);
              }}
            >
              <Layers size={18} />
              <span>Add Group</span>
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
                placeholder="Search menu items..."
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
                  <label><Filter size={14} /> Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All Items</option>
                    <option value="available">Available Only</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>

                <div className="vendor-menu-management-filter-group">
                  <label><Gift size={14} /> BOGO</label>
                  <select
                    value={bogoFilter}
                    onChange={(e) => setBogoFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All Items</option>
                    <option value="bogo">BOGO Only</option>
                    <option value="regular">Regular Only</option>
                  </select>
                </div>

                <div className="vendor-menu-management-filter-group">
                  <label><Percent size={14} /> Discount</label>
                  <select
                    value={discountFilter}
                    onChange={(e) => setDiscountFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All Items</option>
                    <option value="discounted">Discounted Only</option>
                    <option value="non-discounted">Non-Discounted</option>
                  </select>
                </div>

                <div className="vendor-menu-management-filter-group">
                  <label><Tag size={14} /> Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="vendor-menu-management-filter-select"
                  >
                    <option value="all">All Categories</option>
                    {categories.filter(cat => cat.category_status).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  className="vendor-menu-management-reset-filters"
                  onClick={resetFilters}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="vendor-menu-management-bulk-actions">
              <div className="vendor-menu-management-bulk-info">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </div>
              <div className="vendor-menu-management-bulk-controls">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="vendor-menu-management-bulk-select"
                >
                  <option value="">Choose action</option>
                  <option value="activate">Activate Selected</option>
                  <option value="deactivate">Deactivate Selected</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <button 
                  className="vendor-menu-management-bulk-apply"
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                >
                  Apply
                </button>
                <button 
                  className="vendor-menu-management-bulk-clear"
                  onClick={() => {
                    setSelectedItems([]);
                    setBulkAction("");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="vendor-menu-management-results-count">
            <div className="vendor-menu-management-results-info">
              <span className="vendor-menu-management-results-text">
                Showing {filteredItems.length} of {menuItems.length} items
                {searchTerm && <span> for "{searchTerm}"</span>}
              </span>
              <span className="vendor-menu-management-categories-count">
                in {Object.keys(groupedMenuItems).length} categories
              </span>
            </div>
            <div className="vendor-menu-management-total-revenue">
              <DollarSign size={16} />
              <span>Total Value: {formatINR(filteredItems.reduce((sum, item) => sum + parseFloat(item.item_price || 0), 0))}</span>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="vendor-menu-management-table-section">
              <div className="vendor-menu-management-table-container">
                <table className="vendor-menu-management-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                          onChange={handleSelectAll}
                          className="vendor-menu-management-checkbox"
                        />
                      </th>
                      <th onClick={() => handleSort('item_name')} className="vendor-menu-management-sortable">
                        <div className="vendor-menu-management-table-header">
                          <span>Item</span>
                          {sortConfig.key === 'item_name' && (
                            <span className="vendor-menu-management-sort-icon">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('category')} className="vendor-menu-management-sortable">
                        <div className="vendor-menu-management-table-header">
                          <span>Category</span>
                          {sortConfig.key === 'category' && (
                            <span className="vendor-menu-management-sort-icon">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => handleSort('item_price')} className="vendor-menu-management-sortable">
                        <div className="vendor-menu-management-table-header">
                          <span>Price</span>
                          {sortConfig.key === 'item_price' && (
                            <span className="vendor-menu-management-sort-icon">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th>Type</th>
                      <th onClick={() => handleSort('stock_quantity')} className="vendor-menu-management-sortable">
                        <div className="vendor-menu-management-table-header">
                          <span>Stock</span>
                          {sortConfig.key === 'stock_quantity' && (
                            <span className="vendor-menu-management-sort-icon">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedMenuItems).map(([categoryName, categoryData]) => (
                      <React.Fragment key={categoryData.category_id || categoryName}>
                        <tr className="vendor-menu-management-category-row">
                          <td colSpan="8">
                            <div className="vendor-menu-management-table-category-header">
                              <div className="vendor-menu-management-table-category-info">
                                <h4>{categoryName}</h4>
                                <span className="vendor-menu-management-table-category-count">
                                  {categoryData.items.length} items
                                </span>
                              </div>
                              <button
                                className="vendor-menu-management-table-category-toggle"
                                onClick={() => toggleCategory(categoryData.category_id || categoryName)}
                              >
                                {expandedCategories.includes(categoryData.category_id || categoryName) ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {expandedCategories.includes(categoryData.category_id || categoryName) && 
                          categoryData.items.map((item) => (
                            <tr 
                              key={item.id} 
                              className={`vendor-menu-management-item-row ${selectedItems.includes(item.id) ? 'selected' : ''}`}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(item.id)}
                                  onChange={() => handleSelectItem(item.id)}
                                  className="vendor-menu-management-checkbox"
                                />
                              </td>
                              <td>
                                <div className="vendor-menu-management-table-name">
                                  <div className="vendor-menu-management-table-image">
                                    {item.item_image ? (
                                      <img 
                                        src={item.item_image} 
                                        alt={item.item_name}
                                        onClick={() => window.open(item.item_image, '_blank')}
                                      />
                                    ) : (
                                      <div className="vendor-menu-management-no-image">
                                        <Package size={20} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="vendor-menu-management-name-details">
                                    <strong>{item.item_name}</strong>
                                    <small>{item.description && item.description.length > 80 ? `${item.description.substring(0, 80)}...` : item.description || "No description"}</small>
                                    <div className="vendor-menu-management-table-badges">
                                      {item.discount_active && item.discount_percent > 0 && (
                                        <span className="vendor-menu-management-table-badge discount">
                                          <Percent size={10} />
                                          {item.discount_percent}% OFF
                                        </span>
                                      )}
                                      {item.buy_one_get_one_free && (
                                        <span className="vendor-menu-management-table-badge bogo">
                                          <Gift size={10} />
                                          BOGO
                                        </span>
                                      )}
                                      <span className={`vendor-menu-management-table-badge spice ${getSpiceLevelColor(item.spice_level)}`}>
                                        <Flame size={10} />
                                        {item.spice_level}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="vendor-menu-management-table-category">
                                  {item.category || "Uncategorized"}
                                </span>
                              </td>
                              <td>
                                <div className="vendor-menu-management-table-price">
                                  {item.discount_active && item.discount_percent > 0 ? (
                                    <>
                                      <span className="vendor-menu-management-current-price">
                                        {formatINR(calculateDiscountedPrice(item.item_price, item.discount_percent))}
                                      </span>
                                      <span className="vendor-menu-management-original-price">
                                        {formatINR(item.item_price)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="vendor-menu-management-current-price">
                                      {formatINR(item.item_price)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`vendor-menu-management-dietary-badge ${getDietaryBadgeColor(item.food_type)}`}>
                                  {item.food_type}
                                </span>
                              </td>
                              <td>
                                <div className="vendor-menu-management-stock-info">
                                  <span className={`vendor-menu-management-stock-badge ${getStockStatus(item.stock_quantity)}`}>
                                    {getStockStatus(item.stock_quantity) === 'out' ? 'Out of Stock' : 
                                     getStockStatus(item.stock_quantity) === 'low' ? 'Low Stock' : 'In Stock'}
                                  </span>
                                  {item.stock_quantity > 0 && item.stock_quantity !== "0" && (
                                    <span className="vendor-menu-management-stock-quantity">
                                      ({item.stock_quantity})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <button 
                                  className={`vendor-menu-management-table-status ${item.availability ? 'active' : 'inactive'}`}
                                  onClick={() => handleEditItem({...item, availability: !item.availability})}
                                >
                                  {item.availability ? (
                                    <>
                                      <CheckCircle size={14} />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={14} />
                                      Inactive
                                    </>
                                  )}
                                </button>
                              </td>
                              <td>
                                <div className="vendor-menu-management-table-actions">
                                  <button 
                                    className="vendor-menu-management-edit"
                                    onClick={() => handleEditItem(item)}
                                    title="Edit Item"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    className="vendor-menu-management-duplicate"
                                    onClick={() => handleDuplicateItem(item)}
                                    title="Duplicate Item"
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button 
                                    className="vendor-menu-management-delete"
                                    onClick={() => handleDeleteItem(item.id)}
                                    title="Delete Item"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        }
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="vendor-menu-management-empty-state">
              <div className="vendor-menu-management-empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
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
              </div>
              <h3>No Menu Items Found</h3>
              <p>{menuItems.length === 0 
                ? "Add your first menu item to get started" 
                : "No items match your filters"}
              </p>
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
            <div className="vendor-menu-management-results-info">
              <span className="vendor-menu-management-results-text">
                Showing {categories.length} categories
              </span>
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="vendor-menu-management-categories-grid">
              {categories.map((category) => (
                <div key={category.id} className="vendor-menu-management-category-card">
                  <div className="vendor-menu-management-category-card-header">
                    <div className="vendor-menu-management-category-icon">
                      <Tag size={24} />
                    </div>
                    <div className="vendor-menu-management-category-info">
                      <h4 className="vendor-menu-management-category-name">{category.category_name}</h4>
                      <p className="vendor-menu-management-category-description">
                        {category.category_description || "No description"}
                      </p>
                    </div>
                    <span className={`vendor-menu-management-availability-badge ${category.category_status ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                      {category.category_status ? "Active" : "Inactive"}
                    </span>
                  </div>
                  
                  <div className="vendor-menu-management-category-stats">
                    <div className="vendor-menu-management-category-stat">
                      <span className="vendor-menu-management-stat-label">Menu Items:</span>
                      <span className="vendor-menu-management-stat-value">
                        {menuItems.filter(item => item.category_id === category.id).length}
                      </span>
                    </div>
                  </div>
                  
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
                      title="Edit Category"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="vendor-menu-management-delete" 
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Delete Category"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="vendor-menu-management-empty-state">
              <div className="vendor-menu-management-empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="80"
                  height="80"
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
              </div>
              <h3>No Categories Found</h3>
              <p>Add your first category to organize your menu items</p>
            </div>
          )}
        </>
      )}

      {activeTab === "addons" && (
        <>
          <div className="vendor-menu-management-results-count">
            <div className="vendor-menu-management-results-info">
              <span className="vendor-menu-management-results-text">
                Showing {addonGroups.length} add-on groups
              </span>
              <span className="vendor-menu-management-total-addons">
                <Package size={16} />
                Total Addons: {addonGroups.reduce((sum, group) => sum + (group.addons?.length || 0), 0)}
              </span>
            </div>
          </div>

          {addonGroups.length > 0 ? (
            <div className="vendor-menu-management-addon-groups-grid">
              {addonGroups.map((group) => (
                <div key={group.id} className="vendor-menu-management-addon-group-card">
                  <div className="vendor-menu-management-addon-group-header">
                    <div className="vendor-menu-management-addon-group-icon">
                      <Layers size={24} />
                    </div>
                    <div className="vendor-menu-management-addon-group-info">
                      <h4 className="vendor-menu-management-addon-group-title">
                        {group.name}
                        <span className={`vendor-menu-management-availability-badge ${group.is_active ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                          {group.is_active ? "Active" : "Inactive"}
                        </span>
                      </h4>
                      <p className="vendor-menu-management-addon-group-description">
                        {group.description || "No description"}
                      </p>
                      <div className="vendor-menu-management-addon-group-badges">
                        {group.allow_multiple_selection && (
                          <span className="vendor-menu-management-badge selection">
                            Multiple Selection
                          </span>
                        )}
                        {group.allow_multiple_quantity && (
                          <span className="vendor-menu-management-badge quantity">
                            Multiple Quantity
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="vendor-menu-management-addon-group-stats">
                    <div className="vendor-menu-management-stat-item">
                      <Package size={16} />
                      <span>{group.addons?.length || 0} Add-ons</span>
                    </div>
                    {group.allow_multiple_selection && (
                      <div className="vendor-menu-management-stat-item">
                        <span className="vendor-menu-management-stat-label">Selection:</span>
                        <span className="vendor-menu-management-stat-value">{group.min_selection}-{group.max_selection}</span>
                      </div>
                    )}
                    {group.allow_multiple_quantity && (
                      <div className="vendor-menu-management-stat-item">
                        <span className="vendor-menu-management-stat-label">Quantity:</span>
                        <span className="vendor-menu-management-stat-value">{group.min_quantity}-{group.max_quantity}</span>
                      </div>
                    )}
                  </div>
                  
                  {group.addons && group.addons.length > 0 && (
                    <div className="vendor-menu-management-addons-preview">
                      <div className="vendor-menu-management-addons-preview-header">
                        <span className="vendor-menu-management-addons-preview-title">Add-ons Preview</span>
                      </div>
                      <div className="vendor-menu-management-addons-list">
                        {group.addons.slice(0, 3).map((addon) => (
                          <div key={addon.id} className="vendor-menu-management-addon-preview-item">
                            <span className="vendor-menu-management-addon-name">{addon.name}</span>
                            <span className="vendor-menu-management-addon-price">{formatINR(addon.price)}</span>
                          </div>
                        ))}
                        {group.addons.length > 3 && (
                          <div className="vendor-menu-management-addon-preview-more">
                            +{group.addons.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="vendor-menu-management-action-buttons">
                    <button 
                      className="vendor-menu-management-edit" 
                      onClick={() => handleEditAddonGroup(group)}
                      title="Edit Group"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="vendor-menu-management-delete" 
                      onClick={() => handleDeleteAddonGroup(group.id)}
                      title="Delete Group"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="vendor-menu-management-empty-state">
              <Layers size={80} />
              <h3>No Add-on Groups Found</h3>
              <p>Create your first add-on group to organize your menu add-ons</p>
            </div>
          )}
        </>
      )}

      {/* Menu Item Modal with Addon Section */}
      {showModal === true && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <div className="vendor-menu-management-modal-header">
              <h3>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h3>
              <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitItem}>
              <div className="vendor-menu-management-modal-body">
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <span className="vendor-menu-management-modal-section-icon">📝</span>
                    Basic Information
                  </h4>
                  
                  <div className="vendor-menu-management-form-grid">
                    <div className="vendor-menu-management-form-group">
                      <label>
                        <Star size={14} />
                        Item Name
                      </label>
                      <input
                        type="text"
                        className="vendor-menu-management-form-control"
                        name="item_name"
                        placeholder="Enter item name"
                        value={formData.item_name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="vendor-menu-management-form-group">
                      <label>
                        <DollarSign size={14} />
                        Price
                      </label>
                      <input
                        type="number"
                        className="vendor-menu-management-form-control"
                        name="item_price"
                        placeholder="0.00"
                        value={formData.item_price}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="vendor-menu-management-form-group">
                      <label>
                        <Tag size={14} />
                        Category
                      </label>
                      <select
                        className="vendor-menu-management-form-control"
                        name="category"
                        value={formData.category_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.filter(cat => cat.category_status).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="vendor-menu-management-form-group">
                      <label>
                        <span className="vendor-menu-management-form-label-icon">🥘</span>
                        Food Type
                      </label>
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
                  </div>

                  <div className="vendor-menu-management-form-group">
                    <label>Description</label>
                    <textarea
                      className="vendor-menu-management-form-control"
                      name="description"
                      placeholder="Describe your menu item..."
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>

                  <div className="vendor-menu-management-form-grid">
                    <div className="vendor-menu-management-form-group">
                      <label>
                        <Flame size={14} />
                        Spice Level
                      </label>
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
                      <label>
                        <Clock size={14} />
                        Prep Time (mins)
                      </label>
                      <input
                        type="number"
                        className="vendor-menu-management-form-control"
                        name="preparation_time"
                        placeholder="15"
                        value={formData.preparation_time}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>

                    <div className="vendor-menu-management-form-group">
                      <label>
                        <Users size={14} />
                        Serving Size
                      </label>
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
                      <label>
                        <Package size={14} />
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        className="vendor-menu-management-form-control"
                        name="stock_quantity"
                        placeholder="Stock quantity"
                        value={formData.stock_quantity}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <span className="vendor-menu-management-modal-section-icon">🖼️</span>
                    Item Image
                  </h4>
                  <div className="vendor-menu-management-form-group">
                    <div className="vendor-menu-management-image-upload">
                      <input 
                        type="file" 
                        className="vendor-menu-management-file-input"
                        accept="image/*" 
                        onChange={handleFileChange} 
                        id="item-image"
                      />
                      <label htmlFor="item-image" className="vendor-menu-management-image-upload-label">
                        {formData.item_image ? (
                          <div className="vendor-menu-management-image-preview">
                            <img 
                              src={formData.item_image instanceof File 
                                ? URL.createObjectURL(formData.item_image) 
                                : formData.item_image} 
                              alt="Preview" 
                            />
                            <span className="vendor-menu-management-image-change">Change Image</span>
                          </div>
                        ) : (
                          <div className="vendor-menu-management-image-placeholder">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="48"
                              height="48"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <span>Click to upload image</span>
                            <small>Recommended: 300x200 pixels</small>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Discount Section */}
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <span className="vendor-menu-management-modal-section-icon">💰</span>
                    Pricing & Discounts
                  </h4>
                  
                  <div className="vendor-menu-management-form-grid">
                    <div className="vendor-menu-management-form-group">
                      <label>Discount Percentage</label>
                      <div className="vendor-menu-management-input-with-icon">
                        <input
                          type="number"
                          className="vendor-menu-management-form-control"
                          name="discount_percent"
                          placeholder="0"
                          value={formData.discount_percent}
                          onChange={handleChange}
                          min="0"
                          max="100"
                        />
                        <span className="vendor-menu-management-input-icon">%</span>
                      </div>
                    </div>

                    <div className="vendor-menu-management-form-group">
                      <label>Discount Active</label>
                      <div className="vendor-menu-management-checkbox-group">
                        <label className="vendor-menu-management-switch">
                          <input
                            type="checkbox"
                            name="discount_active"
                            checked={formData.discount_active}
                            onChange={handleChange}
                          />
                          <span className="vendor-menu-management-slider"></span>
                        </label>
                        <span className="vendor-menu-management-checkbox-label">
                          {formData.discount_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {formData.discount_percent > 0 && (
                    <div className="vendor-menu-management-discount-preview">
                      <div className="vendor-menu-management-price-comparison">
                        <div className="vendor-menu-management-price-original">
                          <span className="vendor-menu-management-price-label">Original Price:</span>
                          <span className="vendor-menu-management-price-value">{formatINR(formData.item_price || 0)}</span>
                        </div>
                        <div className="vendor-menu-management-price-discounted">
                          <span className="vendor-menu-management-price-label">Discounted Price:</span>
                          <span className="vendor-menu-management-price-value">
                            {formatINR(calculateDiscountedPrice(formData.item_price || 0, formData.discount_percent))}
                          </span>
                          <span className="vendor-menu-management-price-save">
                            Save {formatINR((parseFloat(formData.item_price || 0) - parseFloat(calculateDiscountedPrice(formData.item_price || 0, formData.discount_percent))))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Addon Groups Section - UPDATED */}
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <span className="vendor-menu-management-modal-section-icon">➕</span>
                    Add-on Groups
                    <span className="vendor-menu-management-modal-section-subtitle">
                      Select add-on groups that customers can choose from
                    </span>
                  </h4>
                  
                  {addonGroups.length > 0 ? (
                    <div className="vendor-menu-management-addon-groups-selection">
                      <div className="vendor-menu-management-addon-groups-list">
                        {addonGroups.filter(group => group.is_active).map((group) => (
                          <div key={group.id} className="vendor-menu-management-addon-group-option">
                            <label className="vendor-menu-management-addon-group-checkbox">
                              <input
                                type="checkbox"
                                value={group.id}
                                checked={isAddonGroupSelected(group.id)}
                                onChange={handleAddonGroupSelection}
                              />
                              <div className="vendor-menu-management-addon-group-info">
                                <div className="vendor-menu-management-addon-group-header">
                                  <h5 className="vendor-menu-management-addon-group-name">
                                    {group.name}
                                    {group.allow_multiple_selection && (
                                      <span className="vendor-menu-management-badge selection">Multiple</span>
                                    )}
                                  </h5>
                                  <span className="vendor-menu-management-addon-group-count">
                                    {group.addons?.length || 0} add-ons
                                  </span>
                                </div>
                                <p className="vendor-menu-management-addon-group-description">
                                  {group.description || "No description"}
                                </p>
                                <div className="vendor-menu-management-addon-group-details">
                                  {group.allow_multiple_selection && (
                                    <span className="vendor-menu-management-addon-detail">
                                      Selection: {group.min_selection}-{group.max_selection}
                                    </span>
                                  )}
                                  {group.allow_multiple_quantity && (
                                    <span className="vendor-menu-management-addon-detail">
                                      Quantity: {group.min_quantity}-{group.max_quantity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="vendor-menu-management-no-addons">
                      <Layers size={48} />
                      <p>No add-on groups available. Create add-on groups first.</p>
                    </div>
                  )}
                </div>

                {/* Availability Section */}
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <span className="vendor-menu-management-modal-section-icon">⏰</span>
                    Availability & Timing
                  </h4>
                  
                  <div className="vendor-menu-management-form-grid">
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

                  <div className="vendor-menu-management-switch-group">
                    <div className="vendor-menu-management-switch-item">
                      <label className="vendor-menu-management-switch">
                        <input
                          type="checkbox"
                          name="availability"
                          checked={formData.availability}
                          onChange={handleChange}
                        />
                        <span className="vendor-menu-management-slider"></span>
                      </label>
                      <div className="vendor-menu-management-switch-content">
                        <span className="vendor-menu-management-switch-label">Available</span>
                        <span className="vendor-menu-management-switch-description">
                          Item will be visible to customers
                        </span>
                      </div>
                    </div>

                    <div className="vendor-menu-management-switch-item">
                      <label className="vendor-menu-management-switch">
                        <input
                          type="checkbox"
                          name="buy_one_get_one_free"
                          checked={formData.buy_one_get_one_free}
                          onChange={handleChange}
                        />
                        <span className="vendor-menu-management-slider"></span>
                      </label>
                      <div className="vendor-menu-management-switch-content">
                        <span className="vendor-menu-management-switch-label">Buy One Get One Free</span>
                        <span className="vendor-menu-management-switch-description">
                          Enable BOGO offer for this item
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="vendor-menu-management-modal-footer">
                <button 
                  type="button" 
                  className="vendor-menu-management-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vendor-menu-management-submit-btn">
                  {editingItem ? "Update Menu Item" : "Add Menu Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal === "category" && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content">
            <div className="vendor-menu-management-modal-header">
              <h3>{categoryForm.id ? "Edit Category" : "Add New Category"}</h3>
              <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitCategory}>
              <div className="vendor-menu-management-modal-body">
                <div className="vendor-menu-management-form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    className="vendor-menu-management-form-control"
                    name="category_name"
                    placeholder="Enter category name"
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
                    placeholder="Describe this category..."
                    value={categoryForm.category_description}
                    onChange={handleCategoryChange}
                    rows="3"
                  />
                </div>

                <div className="vendor-menu-management-switch-item">
                  <label className="vendor-menu-management-switch">
                    <input
                      type="checkbox"
                      name="category_status"
                      checked={categoryForm.category_status}
                      onChange={handleCategoryChange}
                    />
                    <span className="vendor-menu-management-slider"></span>
                  </label>
                  <div className="vendor-menu-management-switch-content">
                    <span className="vendor-menu-management-switch-label">Active</span>
                    <span className="vendor-menu-management-switch-description">
                      Category will be visible in menu
                    </span>
                  </div>
                </div>
              </div>

              <div className="vendor-menu-management-modal-footer">
                <button 
                  type="button" 
                  className="vendor-menu-management-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vendor-menu-management-submit-btn">
                  {categoryForm.id ? "Update Category" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Addon Group Modal */}
      {showModal === "addon-group" && (
        <div className="vendor-menu-management-modal-overlay vendor-menu-management-show">
          <div className="vendor-menu-management-modal-content vendor-menu-management-addon-group-modal">
            <div className="vendor-menu-management-modal-header">
              <h3>{addonGroupForm.id ? "Edit Add-on Group" : "Add New Add-on Group"}</h3>
              <button className="vendor-menu-management-close-modal" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAddonGroup}>
              <div className="vendor-menu-management-modal-body">
                {/* Group Information Section */}
                <div className="vendor-menu-management-modal-section">
                  <h4 className="vendor-menu-management-modal-section-title">
                    <Layers size={20} />
                    Group Information
                  </h4>
                  
                  <div className="vendor-menu-management-form-grid">
                    <div className="vendor-menu-management-form-group">
                      <label>Group Name</label>
                      <input
                        type="text"
                        className="vendor-menu-management-form-control"
                        name="name"
                        placeholder="Enter group name"
                        value={addonGroupForm.name}
                        onChange={handleAddonGroupChange}
                        required
                      />
                    </div>
                    
                    <div className="vendor-menu-management-form-group">
                      <label>Status</label>
                      <div className="vendor-menu-management-switch-item">
                        <label className="vendor-menu-management-switch">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={addonGroupForm.is_active}
                            onChange={handleAddonGroupChange}
                          />
                          <span className="vendor-menu-management-slider"></span>
                        </label>
                        <span className="vendor-menu-management-switch-label">
                          {addonGroupForm.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="vendor-menu-management-form-group">
                    <label>Description</label>
                    <textarea
                      className="vendor-menu-management-form-control"
                      name="description"
                      placeholder="Describe this add-on group..."
                      value={addonGroupForm.description}
                      onChange={handleAddonGroupChange}
                      rows="2"
                    />
                  </div>

                  <div className="vendor-menu-management-form-grid">
                    <div className="vendor-menu-management-form-group">
                      <div className="vendor-menu-management-switch-item">
                        <label className="vendor-menu-management-switch">
                          <input
                            type="checkbox"
                            name="allow_multiple_selection"
                            checked={addonGroupForm.allow_multiple_selection}
                            onChange={handleAddonGroupChange}
                          />
                          <span className="vendor-menu-management-slider"></span>
                        </label>
                        <div className="vendor-menu-management-switch-content">
                          <span className="vendor-menu-management-switch-label">Allow Multiple Selection</span>
                          <span className="vendor-menu-management-switch-description">
                            Customers can select multiple add-ons
                          </span>
                        </div>
                      </div>
                      
                      {addonGroupForm.allow_multiple_selection && (
                        <div className="vendor-menu-management-form-grid">
                          <div className="vendor-menu-management-form-group">
                            <label>Minimum Selection</label>
                            <input
                              type="number"
                              className="vendor-menu-management-form-control"
                              name="min_selection"
                              placeholder="0"
                              value={addonGroupForm.min_selection}
                              onChange={handleAddonGroupChange}
                              min="0"
                            />
                          </div>
                          
                          <div className="vendor-menu-management-form-group">
                            <label>Maximum Selection</label>
                            <input
                              type="number"
                              className="vendor-menu-management-form-control"
                              name="max_selection"
                              placeholder="1"
                              value={addonGroupForm.max_selection}
                              onChange={handleAddonGroupChange}
                              min="1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="vendor-menu-management-form-group">
                      <div className="vendor-menu-management-switch-item">
                        <label className="vendor-menu-management-switch">
                          <input
                            type="checkbox"
                            name="allow_multiple_quantity"
                            checked={addonGroupForm.allow_multiple_quantity}
                            onChange={handleAddonGroupChange}
                          />
                          <span className="vendor-menu-management-slider"></span>
                        </label>
                        <div className="vendor-menu-management-switch-content">
                          <span className="vendor-menu-management-switch-label">Allow Multiple Quantities</span>
                          <span className="vendor-menu-management-switch-description">
                            Customers can select quantity for each add-on
                          </span>
                        </div>
                      </div>
                      
                      {addonGroupForm.allow_multiple_quantity && (
                        <div className="vendor-menu-management-form-grid">
                          <div className="vendor-menu-management-form-group">
                            <label>Minimum Quantity</label>
                            <input
                              type="number"
                              className="vendor-menu-management-form-control"
                              name="min_quantity"
                              placeholder="1"
                              value={addonGroupForm.min_quantity}
                              onChange={handleAddonGroupChange}
                              min="1"
                            />
                          </div>
                          
                          <div className="vendor-menu-management-form-group">
                            <label>Maximum Quantity</label>
                            <input
                              type="number"
                              className="vendor-menu-management-form-control"
                              name="max_quantity"
                              placeholder="10"
                              value={addonGroupForm.max_quantity}
                              onChange={handleAddonGroupChange}
                              min="1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Addons Section */}
                <div className="vendor-menu-management-modal-section">
                  <div className="vendor-menu-management-modal-section-header">
                    <h4 className="vendor-menu-management-modal-section-title">
                      <Package size={20} />
                      Add-ons
                    </h4>
                    
                    {!showAddAddonForm && (
                      <button
                        type="button"
                        className="vendor-menu-management-button vendor-menu-management-add-item"
                        onClick={() => {
                          setShowAddAddonForm(true);
                          setCurrentAddon({
                            id: null,
                            name: "",
                            price: "",
                            dietary_type: "Veg",
                            is_active: true
                          });
                        }}
                      >
                        <PlusCircle size={16} />
                        <span>Add Addon</span>
                      </button>
                    )}
                  </div>

                  {/* Add Addon Form */}
                  {showAddAddonForm && (
                    <div className="vendor-menu-management-add-addon-form">
                      <div className="vendor-menu-management-add-addon-form-header">
                        <h5>{currentAddon.id ? "Edit Add-on" : "Add New Add-on"}</h5>
                        <button
                          type="button"
                          className="vendor-menu-management-close-btn"
                          onClick={handleCancelAddAddon}
                          aria-label="Close add addon form"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="vendor-menu-management-form-grid">
                        <div className="vendor-menu-management-form-group">
                          <label>Add-on Name</label>
                          <input
                            type="text"
                            className="vendor-menu-management-form-control"
                            name="name"
                            placeholder="Enter add-on name"
                            value={currentAddon.name}
                            onChange={handleCurrentAddonChange}
                            required
                          />
                        </div>

                        <div className="vendor-menu-management-form-group">
                          <label>Price</label>
                          <div className="vendor-menu-management-input-with-icon">
                            <input
                              type="number"
                              className="vendor-menu-management-form-control"
                              name="price"
                              placeholder="0.00"
                              value={currentAddon.price}
                              onChange={handleCurrentAddonChange}
                              required
                              min="0"
                              step="0.01"
                            />
                            <span className="vendor-menu-management-input-icon">₹</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="vendor-menu-management-form-grid">
                        <div className="vendor-menu-management-form-group">
                          <label>Dietary Type</label>
                          <select
                            className="vendor-menu-management-form-control"
                            name="dietary_type"
                            value={currentAddon.dietary_type}
                            onChange={handleCurrentAddonChange}
                          >
                            {dietaryTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="vendor-menu-management-form-group">
                          <label>Status</label>
                          <div className="vendor-menu-management-switch-item">
                            <label className="vendor-menu-management-switch">
                              <input
                                type="checkbox"
                                name="is_active"
                                checked={currentAddon.is_active}
                                onChange={handleCurrentAddonChange}
                              />
                              <span className="vendor-menu-management-slider"></span>
                            </label>
                            <span className="vendor-menu-management-switch-label">
                              {currentAddon.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="vendor-menu-management-addon-form-buttons">
                        <button
                          type="button"
                          className="vendor-menu-management-button vendor-menu-management-add-addon-btn"
                          onClick={handleAddAddonToGroup}
                        >
                          {currentAddon.id ? "Update Add-on" : "Add to Group"}
                        </button>
                        <button
                          type="button"
                          className="vendor-menu-management-button vendor-menu-management-cancel-btn"
                          onClick={handleCancelAddAddon}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Addons Table */}
                  <div className="vendor-menu-management-addons-table-section">
                    <div className="vendor-menu-management-table-container">
                      <table className="vendor-menu-management-table vendor-menu-management-addons-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Dietary</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {addonGroupForm.addons.length > 0 ? (
                            addonGroupForm.addons.map((addon) => (
                              <tr key={addon.id}>
                                <td>{addon.name}</td>
                                <td>{formatINR(addon.price)}</td>
                                <td>
                                  <span className={`vendor-menu-management-dietary-badge ${getDietaryBadgeColor(addon.dietary_type)}`}>
                                    {addon.dietary_type}
                                  </span>
                                </td>
                                <td>
                                  <span className={`vendor-menu-management-availability-badge ${addon.is_active ? 'vendor-menu-management-available' : 'vendor-menu-management-not-available'}`}>
                                    {addon.is_active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td>
                                  <div className="vendor-menu-management-action-buttons">
                                    <button 
                                      type="button"
                                      className="vendor-menu-management-edit" 
                                      onClick={() => handleEditAddonInGroup(addon)}
                                      title="Edit addon"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button 
                                      type="button"
                                      className="vendor-menu-management-delete" 
                                      onClick={() => handleRemoveAddonFromGroup(addon.id)}
                                      title="Delete addon"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="vendor-menu-management-no-data">
                                <Package size={32} />
                                <div>
                                  <p>No add-ons added yet.</p>
                                  <small>Click "Add Addon" to create your first add-on</small>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="vendor-menu-management-modal-footer">
                <button 
                  type="button" 
                  className="vendor-menu-management-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="vendor-menu-management-submit-btn">
                  {addonGroupForm.id ? "Update Group" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;