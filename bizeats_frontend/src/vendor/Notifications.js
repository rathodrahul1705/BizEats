import React, { useState, useEffect } from "react";
import "../assets/css/vendor/Notifications.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

// Import icons (you can use react-icons or any icon library)
// For this example, I'll use Unicode icons, but you can replace with actual icon components
const Icons = {
  queue: "📨",
  tags: "🏷️",
  templates: "📝",
  assigned: "👥",
  devices: "📱",
  edit: "✏️",
  delete: "🗑️",
  add: "➕",
  retry: "🔄",
  cancel: "❌",
  send: "📤",
  view: "👁️",
  activate: "✅",
  deactivate: "⏸️",
  refresh: "🔄",
  remove: "❌",
  filter: "🔍",
  user: "👤",
  email: "📧",
  push: "📱",
  both: "🔔",
  active: "🟢",
  inactive: "🔴",
  pending: "🟡",
  sent: "🟢",
  failed: "🔴",
  cancelled: "⚫"
};

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("tags");
  const [notifications, setNotifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignedTags, setAssignedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all data from API
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access");
      
      // Fetch tags
      const tagsResponse = await fetchData(
        API_ENDPOINTS.TAGS.FETCH_ALL,
        "GET",
        null,
        token
      );
      setTags(tagsResponse || []);

      // Fetch notification templates
      const templatesResponse = await fetchData(
        API_ENDPOINTS.NOTIFICATION_TEMPLATES.FETCH_ALL,
        "GET",
        null,
        token
      );
      setNotificationTemplates(templatesResponse || []);

      // Fetch notification queue
      const queueResponse = await fetchData(
        API_ENDPOINTS.NOTIFICATION_QUEUE.FETCH_ALL,
        "GET",
        null,
        token
      );
      setNotifications(queueResponse || []);

      // Fetch assigned tags
      const assignedTagsResponse = await fetchData(
        API_ENDPOINTS.ASSIGNED_TAGS.FETCH_ALL,
        "GET",
        null,
        token
      );
      setAssignedTags(assignedTagsResponse || []);

      // Fetch devices
      const devicesResponse = await fetchData(
        API_ENDPOINTS.DEVICES.FETCH_ALL,
        "GET",
        null,
        token
      );
      setDevices(devicesResponse || []);

      // Fetch users (you might need to adjust this endpoint based on your API)
      // This is optional - if you don't have users endpoint, you can skip it
      try {
        const usersResponse = await fetchData(
          API_ENDPOINTS.USER?.USER_LIST || "/api/users/",
          "GET",
          null,
          token
        );
        setUsers(usersResponse?.users || []);
      } catch (userError) {
        console.warn("Could not fetch users:", userError);
        setUsers([]);
      }

    } catch (err) {
      setError("Failed to fetch data: " + err.message);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Helper functions to get related data
  const getUserById = (id) => users.find(user => user.id === id) || { username: 'Unknown', email: 'N/A' };
  const getTagById = (id) => tags.find(tag => tag.id === id) || { name: 'Unknown Tag' };
  const getTemplateById = (id) => notificationTemplates.find(template => template.id === id) || { title: 'Unknown Template', subject: '', body: '' };

  // Get assigned tags with resolved user and tag objects
  const getAssignedTagsWithDetails = () => {
    return assignedTags.map(at => ({
      ...at,
      user: getUserById(at.user_id),
      tag: getTagById(at.tag_id)
    }));
  };

  // Get notifications with resolved objects
  const getNotificationsWithDetails = () => {
    return notifications.map(notification => ({
      ...notification,
      template: getTemplateById(notification.template_id),
      user: notification.user_id ? getUserById(notification.user_id) : null,
      target_tags: (notification.target_tag_ids || []).map(tagId => getTagById(tagId))
    }));
  };

  // Get devices with resolved user objects
  const getDevicesWithDetails = () => {
    return devices.map(device => ({
      ...device,
      user: getUserById(device.user_id)
    }));
  };

  // Get templates with resolved tag objects
  const getTemplatesWithDetails = () => {
    return notificationTemplates.map(template => ({
      ...template,
      tags: (template.tags || []).map(tagId => getTagById(tagId))
    }));
  };

  // CRUD Operations for Tags
  const [newTag, setNewTag] = useState({ name: "", description: "" });
  const [editingTag, setEditingTag] = useState(null);

  const addTag = async () => {
    if (newTag.name.trim()) {
      try {
        const token = localStorage.getItem("access");
        const response = await fetchData(
          API_ENDPOINTS.TAGS.CREATE,
          "POST",
          newTag,
          token
        );
        
        setTags([...tags, response]);
        setNewTag({ name: "", description: "" });
      } catch (err) {
        setError("Failed to create tag: " + err.message);
      }
    }
  };

  const updateTag = async () => {
    if (editingTag) {
      try {
        const token = localStorage.getItem("access");
        const response = await fetchData(
          API_ENDPOINTS.TAGS.UPDATE(editingTag.id),
          "PUT",
          editingTag,
          token
        );
        
        setTags(tags.map(tag => tag.id === editingTag.id ? response : tag));
        setEditingTag(null);
      } catch (err) {
        setError("Failed to update tag: " + err.message);
      }
    }
  };

  const deleteTag = async (id) => {
    try {
      const token = localStorage.getItem("access");
      await fetchData(
        API_ENDPOINTS.TAGS.DELETE(id),
        "DELETE",
        null,
        token
      );
      
      setTags(tags.filter(tag => tag.id !== id));
      setAssignedTags(assignedTags.filter(at => at.tag_id !== id));
      setNotificationTemplates(notificationTemplates.map(template => ({
        ...template,
        tags: template.tags.filter(tagId => tagId !== id)
      })));
    } catch (err) {
      setError("Failed to delete tag: " + err.message);
    }
  };

  // CRUD Operations for Notification Templates
  const [newTemplate, setNewTemplate] = useState({
    key: "",
    title: "",
    subject: "",
    body: "",
    tags: [],
    channel: "email",
    is_active: true
  });
  const [editingTemplate, setEditingTemplate] = useState(null);

  const addTemplate = async () => {
    if (newTemplate.key.trim() && newTemplate.title.trim() && newTemplate.body.trim()) {
      try {
        const token = localStorage.getItem("access");
        const response = await fetchData(
          API_ENDPOINTS.NOTIFICATION_TEMPLATES.CREATE,
          "POST",
          newTemplate,
          token
        );
        
        setNotificationTemplates([...notificationTemplates, response]);
        setNewTemplate({ 
          key: "", 
          title: "", 
          subject: "", 
          body: "", 
          tags: [], 
          channel: "email", 
          is_active: true 
        });
      } catch (err) {
        setError("Failed to create template: " + err.message);
      }
    }
  };

  const updateTemplate = async () => {
    if (editingTemplate) {
      try {
        const token = localStorage.getItem("access");
        const response = await fetchData(
          API_ENDPOINTS.NOTIFICATION_TEMPLATES.UPDATE(editingTemplate.id),
          "PUT",
          editingTemplate,
          token
        );
        
        setNotificationTemplates(notificationTemplates.map(template => 
          template.id === editingTemplate.id ? response : template
        ));
        setEditingTemplate(null);
      } catch (err) {
        setError("Failed to update template: " + err.message);
      }
    }
  };

  const deleteTemplate = async (id) => {
    try {
      const token = localStorage.getItem("access");
      await fetchData(
        API_ENDPOINTS.NOTIFICATION_TEMPLATES.DELETE(id),
        "DELETE",
        null,
        token
      );
      
      setNotificationTemplates(notificationTemplates.filter(template => template.id !== id));
    } catch (err) {
      setError("Failed to delete template: " + err.message);
    }
  };

  const toggleTemplateStatus = async (templateId, currentStatus) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetchData(
        API_ENDPOINTS.NOTIFICATION_TEMPLATES.TOGGLE_STATUS(templateId),
        "POST",
        { is_active: !currentStatus },
        token
      );
      
      setNotificationTemplates(notificationTemplates.map(template => 
        template.id === templateId ? response : template
      ));
    } catch (err) {
      setError("Failed to toggle template status: " + err.message);
    }
  };

  // CRUD Operations for Assigned Tags
  const [newAssignedTag, setNewAssignedTag] = useState({ user_id: "", tag_id: "" });

  const addAssignedTag = async () => {
    if (newAssignedTag.user_id && newAssignedTag.tag_id) {
      const exists = assignedTags.find(
        at => at.user_id === parseInt(newAssignedTag.user_id) && at.tag_id === parseInt(newAssignedTag.tag_id)
      );
      
      if (exists) {
        alert('This tag is already assigned to the selected user.');
        return;
      }

      try {
        const token = localStorage.getItem("access");
        const response = await fetchData(
          API_ENDPOINTS.ASSIGNED_TAGS.CREATE,
          "POST",
          newAssignedTag,
          token
        );
        
        setAssignedTags([...assignedTags, response]);
        setNewAssignedTag({ user_id: "", tag_id: "" });
      } catch (err) {
        setError("Failed to assign tag: " + err.message);
      }
    }
  };

  const deleteAssignedTag = async (id) => {
    try {
      const token = localStorage.getItem("access");
      await fetchData(
        API_ENDPOINTS.ASSIGNED_TAGS.DELETE(id),
        "DELETE",
        null,
        token
      );
      
      setAssignedTags(assignedTags.filter(at => at.id !== id));
    } catch (err) {
      setError("Failed to remove assigned tag: " + err.message);
    }
  };

  // Device Management
  const toggleDeviceStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetchData(
        API_ENDPOINTS.DEVICES.UPDATE(id),
        "PUT",
        { is_active: !currentStatus },
        token
      );
      
      setDevices(devices.map(device => 
        device.id === id ? response : device
      ));
    } catch (err) {
      setError("Failed to toggle device status: " + err.message);
    }
  };

  const deleteDevice = async (id) => {
    try {
      const token = localStorage.getItem("access");
      await fetchData(
        API_ENDPOINTS.DEVICES.DELETE(id),
        "DELETE",
        null,
        token
      );
      
      setDevices(devices.filter(device => device.id !== id));
    } catch (err) {
      setError("Failed to delete device: " + err.message);
    }
  };

  // Notification Actions
  const retryNotification = async (id) => {
    try {
      const token = localStorage.getItem("access");

      // Call API as GET — just append ID in URL if needed
      const url = `${API_ENDPOINTS.NOTIFICATIONS.SEND_IMMEDIATE}`;

      const response = await fetchData(
        url,
        "GET",
        null,
        token
      );

      // Update UI immediately after retry
      setNotifications(notifications.map(notification =>
        notification.id === id
          ? {
              ...notification,
              status: "pending",
              attempts: notification.attempts + 1,
              last_error: null
            }
          : notification
      ));
    } catch (err) {
      setError("Failed to retry notification: " + err.message);
    }
  };


  const cancelNotification = async (id) => {
    try {
      const token = localStorage.getItem("access");
      const response = await fetchData(
        API_ENDPOINTS.NOTIFICATION_QUEUE.CANCEL(id),
        "POST",
        null,
        token
      );
      
      setNotifications(notifications.map(notification => 
        notification.id === id ? { ...notification, status: 'cancelled' } : notification
      ));
    } catch (err) {
      setError("Failed to cancel notification: " + err.message);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="vendor-notifications">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading notification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-notifications">
      <div className="notifications-header">
        <h2>Notification Management</h2>
        <p>Manage your Eatoor platform notifications and communication settings</p>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="close-error">×</button>
          </div>
        )}
        
        <button 
          className="btn btn-secondary refresh-btn"
          onClick={fetchAllData}
          disabled={loading}
        >
          {Icons.refresh} Refresh Data
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="notifications-tabs">
        <button 
          className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <span className="tab-icon">{Icons.tags}</span>
          <span className="tab-text">Tag Master</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <span className="tab-icon">{Icons.templates}</span>
          <span className="tab-text">Notification Templates</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <span className="tab-icon">{Icons.queue}</span>
          <span className="tab-text">Notification Queue</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assigned-tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned-tags')}
        >
          <span className="tab-icon">{Icons.assigned}</span>
          <span className="tab-text">Assigned Tags</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <span className="tab-icon">{Icons.devices}</span>
          <span className="tab-text">Device Management</span>
        </button>
      </div>

      {/* Tag Master */}
      {activeTab === 'tags' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Tag Management</h3>
          </div>

          {/* Add/Edit Tag Form */}
          <div className="form-card">
            <h4>{editingTag ? `${Icons.edit} Edit Tag` : `${Icons.add} Add New Tag`}</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Tag Name *</label>
                <input
                  type="text"
                  placeholder="e.g., order_alerts"
                  value={editingTag ? editingTag.name : newTag.name}
                  onChange={(e) => editingTag 
                    ? setEditingTag({...editingTag, name: e.target.value})
                    : setNewTag({...newTag, name: e.target.value})
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="Tag description"
                  value={editingTag ? editingTag.description : newTag.description}
                  onChange={(e) => editingTag
                    ? setEditingTag({...editingTag, description: e.target.value})
                    : setNewTag({...newTag, description: e.target.value})
                  }
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-actions">
              {editingTag ? (
                <>
                  <button className="btn btn-primary" onClick={updateTag}>
                    {Icons.edit} Update Tag
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setEditingTag(null)}
                  >
                    {Icons.cancel} Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={addTag}>
                  {Icons.add} Add Tag
                </button>
              )}
            </div>
          </div>

          {/* Tags List */}
          <div className="table-container">
            <div className="table-header">
              <span className="col-name">Tag Name</span>
              <span className="col-description">Description</span>
              <span className="col-date">Created At</span>
              <span className="col-actions">Actions</span>
            </div>
            <div className="table-body">
              {tags.length > 0 ? (
                tags.map(tag => (
                  <div key={tag.id} className="table-row">
                    <span className="col-name">
                      <span className="mobile-label">Tag Name:</span>
                      <span className="tag-name">{tag.name}</span>
                    </span>
                    <span className="col-description">
                      <span className="mobile-label">Description:</span>
                      {tag.description}
                    </span>
                    <span className="col-date">
                      <span className="mobile-label">Created:</span>
                      {new Date(tag.created_at).toLocaleDateString()}
                    </span>
                    <div className="col-actions">
                      <span className="mobile-label">Actions:</span>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => setEditingTag(tag)}
                        >
                          {Icons.edit} Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteTag(tag.id)}
                        >
                          {Icons.delete} Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>No tags found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Templates */}
      {activeTab === 'templates' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Notification Templates</h3>
          </div>

          {/* Add/Edit Template Form */}
          <div className="form-card">
            <h4>{editingTemplate ? `${Icons.edit} Edit Template` : `${Icons.add} Add New Template`}</h4>
            <div className="form-grid">
              <div className="form-row">
                <div className="form-group">
                  <label>Key *</label>
                  <input
                    type="text"
                    placeholder="e.g., new_order"
                    value={editingTemplate ? editingTemplate.key : newTemplate.key}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, key: e.target.value})
                      : setNewTemplate({...newTemplate, key: e.target.value})
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Channel *</label>
                  <select
                    value={editingTemplate ? editingTemplate.channel : newTemplate.channel}
                    onChange={(e) => editingTemplate
                      ? setEditingTemplate({...editingTemplate, channel: e.target.value})
                      : setNewTemplate({...newTemplate, channel: e.target.value})
                    }
                    className="form-select"
                  >
                    <option value="email">{Icons.email} Email</option>
                    <option value="push">{Icons.push} Push</option>
                    <option value="both">{Icons.both} Both</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Title Template *</label>
                <input
                  type="text"
                  placeholder="e.g., New Order #{orderId}"
                  value={editingTemplate ? editingTemplate.title : newTemplate.title}
                  onChange={(e) => editingTemplate
                    ? setEditingTemplate({...editingTemplate, title: e.target.value})
                    : setNewTemplate({...newTemplate, title: e.target.value})
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Email subject line"
                  value={editingTemplate ? editingTemplate.subject : newTemplate.subject}
                  onChange={(e) => editingTemplate
                    ? setEditingTemplate({...editingTemplate, subject: e.target.value})
                    : setNewTemplate({...newTemplate, subject: e.target.value})
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Body Template *</label>
                <textarea
                  placeholder="Notification body with {variables}"
                  value={editingTemplate ? editingTemplate.body : newTemplate.body}
                  onChange={(e) => editingTemplate
                    ? setEditingTemplate({...editingTemplate, body: e.target.value})
                    : setNewTemplate({...newTemplate, body: e.target.value})
                  }
                  className="form-textarea"
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <select
                  multiple
                  value={editingTemplate ? editingTemplate.tags : newTemplate.tags}
                  onChange={(e) => {
                    const selectedTags = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    editingTemplate
                      ? setEditingTemplate({...editingTemplate, tags: selectedTags})
                      : setNewTemplate({...newTemplate, tags: selectedTags});
                  }}
                  className="form-select"
                >
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple tags</small>
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingTemplate ? editingTemplate.is_active : newTemplate.is_active}
                  onChange={(e) => editingTemplate
                    ? setEditingTemplate({...editingTemplate, is_active: e.target.checked})
                    : setNewTemplate({...newTemplate, is_active: e.target.checked})
                  }
                />
                Active Template
              </label>
            </div>
            <div className="form-actions">
              {editingTemplate ? (
                <>
                  <button className="btn btn-primary" onClick={updateTemplate}>
                    {Icons.edit} Update Template
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setEditingTemplate(null)}
                  >
                    {Icons.cancel} Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={addTemplate}>
                  {Icons.add} Add Template
                </button>
              )}
            </div>
          </div>

          {/* Templates List */}
          <div className="templates-grid">
            {notificationTemplates.length > 0 ? (
              getTemplatesWithDetails().map(template => (
                <div key={template.id} className={`template-card ${template.is_active ? 'active' : 'inactive'}`}>
                  <div className="template-header">
                    <div className="template-title-group">
                      <h4 className="template-key">{template.key}</h4>
                      <div className="template-meta">
                        <span className={`status-badge ${template.is_active ? 'active' : 'inactive'}`}>
                          {template.is_active ? `${Icons.active} Active` : `${Icons.inactive} Inactive`}
                        </span>
                        <span className="channel-badge">
                          {template.channel === 'email' ? Icons.email : 
                          template.channel === 'push' ? Icons.push : Icons.both} {template.channel}
                        </span>
                      </div>
                    </div>
                    <div className="template-actions">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => setEditingTemplate(template)}
                      >
                        {Icons.edit}
                      </button>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                      >
                        {template.is_active ? Icons.deactivate : Icons.activate}
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        {Icons.delete}
                      </button>
                    </div>
                  </div>
                  
                  <div className="template-content">
                    <p className="template-field">
                      <strong>Title:</strong> 
                      <span className="template-value">{template.title}</span>
                    </p>
                    {template.subject && (
                      <p className="template-field">
                        <strong>Subject:</strong> 
                        <span className="template-value">{template.subject}</span>
                      </p>
                    )}
                    <p className="template-field">
                      <strong>Body:</strong> 
                      <span className="template-value">{template.body}</span>
                    </p>
                    <div className="template-field">
                      <strong>Tags:</strong> 
                      <div className="tags-list">
                        {template.tags.map(tag => (
                          <span key={tag.id} className="tag-pill">{tag.name}</span>
                        ))}
                        {template.tags.length === 0 && <span className="no-tags">No tags assigned</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="template-footer">
                    <small>Created: {new Date(template.created_at).toLocaleDateString()}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <p>No notification templates found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Queue */}
      {activeTab === 'queue' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Notification Queue</h3>
            <div className="filter-controls">
              <div className="filter-group">
                <span className="filter-icon">{Icons.filter}</span>
                <select className="filter-select">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-icon">{Icons.filter}</span>
                <select className="filter-select">
                  <option value="all">All Channels</option>
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>

          <div className="notifications-grid">
            {notifications.length > 0 ? (
              getNotificationsWithDetails().map(notification => (
                <div key={notification.id} className={`notification-card ${notification.status}`}>
                  <div className="notification-header">
                    <div className="notification-title-group">
                      <h4 className="notification-title">
                        {notification?.template_key || 'No Template'}
                      </h4>
                      <div className="notification-meta">
                        <span className={`status-badge ${notification.status}`}>
                          {notification.status === 'pending' ? Icons.pending :
                          notification.status === 'sent' ? Icons.sent :
                          notification.status === 'failed' ? Icons.failed : Icons.cancelled} {notification.status}
                        </span>
                        <span className="channel-badge">
                          {notification.channel === 'email' ? Icons.email : 
                          notification.channel === 'push' ? Icons.push : Icons.both} {notification.channel}
                        </span>
                        <span className="attempts-badge">Attempts: {notification.attempts}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="notification-content">
                    <p className="notification-subject">{notification.template?.subject}</p>
                    <p className="notification-message">{notification.template?.body}</p>
                    
                    <div className="notification-details">
                      <div className="detail-group">
                        <div className="detail-item">
                          <strong>Recipient:</strong> 
                          {notification.user ? (
                            <span>{Icons.user} {notification.user.username}</span>
                          ) : (
                            <span>Tag-based</span>
                          )}
                        </div>
                        <div className="detail-item">
                          <strong>Target Tags:</strong> 
                          <span>{notification.target_tags_details.map(tag => tag.name).join(', ') || 'None'}</span>
                        </div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-item">
                          <strong>Created:</strong> 
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Scheduled:</strong> 
                          <span>{notification.scheduled_at ? new Date(notification.scheduled_at).toLocaleString() : 'Immediate'}</span>
                        </div>
                        {notification.sent_at && (
                          <div className="detail-item">
                            <strong>Sent:</strong> 
                            <span>{new Date(notification.sent_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {notification.payload && Object.keys(notification.payload).length > 0 && (
                        <div className="payload-details">
                          <strong>Payload:</strong> 
                          <code>{JSON.stringify(notification.payload)}</code>
                        </div>
                      )}
                      
                      {notification.last_error && (
                        <div className="error-details">
                          <strong>Last Error:</strong> 
                          <span>{notification.last_error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="notification-actions">
                    {notification.status === 'pending' && (
                      <>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => retryNotification(notification.id)}
                        >
                          {Icons.send} Send Now
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => cancelNotification(notification.id)}
                        >
                          {Icons.cancel} Cancel
                        </button>
                      </>
                    )}
                    {notification.status === 'failed' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => retryNotification(notification.id)}
                      >
                        {Icons.retry} Retry
                      </button>
                    )}
                    {(notification.status === 'sent' || notification.status === 'cancelled') && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => console.log('View details', notification.id)}
                      >
                        {Icons.view} Details
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <p>No notifications in queue</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assigned Tags */}
      {activeTab === 'assigned-tags' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Assigned Tags</h3>
          </div>

          {/* Add Assigned Tag Form */}
          <div className="form-card">
            <h4>{Icons.add} Assign Tag to User</h4>
            <div className="form-row">
              <div className="form-group">
                <label>User *</label>
                <select
                  value={newAssignedTag.user_id}
                  onChange={(e) => setNewAssignedTag({...newAssignedTag, user_id: e.target.value})}
                  className="form-select"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{Icons.user} {user.full_name} ({user.contact_number})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tag *</label>
                <select
                  value={newAssignedTag.tag_id}
                  onChange={(e) => setNewAssignedTag({...newAssignedTag, tag_id: e.target.value})}
                  className="form-select"
                >
                  <option value="">Select Tag</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{Icons.tags} {tag.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={addAssignedTag}>
                {Icons.add} Assign Tag
              </button>
            </div>
          </div>

          {/* Assigned Tags List */}
          <div className="table-container">
            <div className="table-header">
              <span className="col-user">User</span>
              <span className="col-tag">Tag</span>
              <span className="col-date">Assigned At</span>
              <span className="col-actions">Actions</span>
            </div>
            <div className="table-body">
              {assignedTags.length > 0 ? (
                getAssignedTagsWithDetails().map(assignedTag => (
                  <div key={assignedTag.id} className="table-row">
                    <span className="col-user">
                      <span className="mobile-label">User:</span>
                      <div className="user-info">
                        {Icons.user} {assignedTag?.full_name} 
                        <small>
                          {assignedTag?.email ? assignedTag.email : assignedTag?.contact_number}
                        </small>
                      </div>
                    </span>
                    <span className="col-tag">
                      <span className="mobile-label">Tag:</span>
                      <div className="tag-info">
                        {Icons.tags} {assignedTag?.tag_name}
                      </div>
                    </span>
                    <span className="col-date">
                      <span className="mobile-label">Assigned:</span>
                      {new Date(assignedTag.assigned_at).toLocaleDateString()}
                    </span>
                    <div className="col-actions">
                      <span className="mobile-label">Actions:</span>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteAssignedTag(assignedTag.id)}
                        >
                          {Icons.remove} Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  <p>No assigned tags found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Device Management */}
      {activeTab === 'devices' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Device Management</h3>
          </div>

          <div className="devices-grid">
            {devices.length > 0 ? (
              getDevicesWithDetails().map(device => (
                <div key={device.id} className={`device-card ${device.is_active ? 'active' : 'inactive'}`}>
                  <div className="device-header">
                    <div className="device-title-group">
                      <h4>{Icons.devices} {device.full_name} - {device.platform}</h4>
                      <span className={`device-status ${device.is_active ? 'active' : 'inactive'}`}>
                        {device.is_active ? `${Icons.active} Active` : `${Icons.inactive} Inactive`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="device-content">
                    <div className="device-details">
                      <div className="detail-group">
                        <div className="detail-item">
                          <strong>User:</strong> 
                          <span>{Icons.user} {device?.email}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Platform:</strong> 
                          <span>{device.platform}</span>
                        </div>
                      </div>
                      
                      <div className="token-display">
                        <strong>Token:</strong> 
                        <code>{device.token}</code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="device-actions">
                    <button 
                      className={`btn btn-sm ${device.is_active ? 'btn-warning' : 'btn-primary'}`}
                      onClick={() => toggleDeviceStatus(device.id, device.is_active)}
                    >
                      {device.is_active ? `${Icons.deactivate} Deactivate` : `${Icons.activate} Activate`}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteDevice(device.id)}>
                      {Icons.remove} Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">
                <p>No devices found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;