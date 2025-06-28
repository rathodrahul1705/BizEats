import React, { useState, useEffect } from "react";
import { ArrowRight, Utensils, ClipboardList, FileCheck, FileSignature, CheckCircle } from "lucide-react";
import "../assets/css/restaurent/RestaurantRegistration.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import { useParams } from "react-router-dom";

const steps = [
  { id: 1, name: "Restaurant Info", icon: <Utensils size={22} /> },
  { id: 2, name: "Menu & Pricing", icon: <ClipboardList size={22} /> },
  { id: 3, name: "Documents", icon: <FileCheck size={22} /> },
  { id: 4, name: "Contract", icon: <FileSignature size={22} /> },
];

const RestaurantRegistration = ({ user, setUser }) => {
  const { restaurant_id } = useParams();
  const [step, setStep] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    restaurantName: "",
    ownerDetails: {
      fullName: "",
      email: "",
      phone: "",
      primaryContactNumber: "",
    },
    restaurantLocation: {
      shopNoBuilding: "",
      floorTower: "",
      areaSectorLocality: "",
      city: "",
      nearbyLocality: "",
    },
    deliveryTimings: {
      Monday: { open: false, start: "", end: "" },
      Tuesday: { open: false, start: "", end: "" },
      Wednesday: { open: false, start: "", end: "" },
      Thursday: { open: false, start: "", end: "" },
      Friday: { open: false, start: "", end: "" },
      Saturday: { open: false, start: "", end: "" },
      Sunday: { open: false, start: "", end: "" },
    },
    panDetails: { panNumber: "", fullName: "", address: "", panFile: null },
    fssaiDetails: { fssaiNumber: "", expiryDate: "", fssaiFile: null },
    bankDetails: { accountNumber: "", reAccountNumber: "", ifsc: "", accountType: "" },
    contractFile: null,
    isContractChecked: false,
    restaurantId: null,
  });

  const cuisines = ["Italian", "Chinese", "Indian", "Mexican", "Thai", "Japanese"];

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parentField, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));
  };

  const handleCuisineSelect = (cuisine) => {
    if (formData.selectedCuisines?.includes(cuisine)) {
      setFormData(prev => ({
        ...prev,
        selectedCuisines: prev.selectedCuisines.filter(item => item !== cuisine)
      }));
    } else if (formData.selectedCuisines?.length < 3) {
      setFormData(prev => ({
        ...prev,
        selectedCuisines: [...prev.selectedCuisines, cuisine]
      }));
    }
  };

  const handleTimingChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      deliveryTimings: {
        ...prev.deliveryTimings,
        [day]: { 
          ...prev.deliveryTimings[day], 
          [field]: value 
        }
      }
    }));
  };

  const handleFileChange = (file, field) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleContractCheckbox = (e) => {
    setFormData(prev => ({
      ...prev,
      isContractChecked: e.target.checked
    }));
  };

  // Load existing data if editing
  useEffect(() => {
    if (!restaurant_id) return;
  
    const fetchRestaurants = async () => {
      try {
        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.BY_RESTAURANT_ID(restaurant_id),
          "GET",
          null,
          localStorage.getItem("access")
        );
  
        if (response) {
          setFormData(prev => ({
            ...prev,
            restaurantName: response.restaurant_name,
            ownerDetails: {
              fullName: response.owner_details.owner_name,
              email: response.owner_details.owner_email_address,
              phone: response.owner_details.owner_contact,
              primaryContactNumber: response.owner_details.owner_primary_contact,
            },
            restaurantLocation: {
              shopNoBuilding: response.restaurant_location.shop_no_building,
              floorTower: response.restaurant_location.floor_tower,
              areaSectorLocality: response.restaurant_location.area_sector_locality,
              city: response.restaurant_location.city,
              nearbyLocality: response.restaurant_location.nearby_locality,
            },
            selectedCuisines: response.cuisines?.map(c => c.cuisine_name) || [],
            deliveryTimings: response.delivery_timings?.reduce((acc, timing) => {
              acc[timing.day] = {
                open: timing.open,
                start: timing.start_time,
                end: timing.end_time,
              };
              return acc;
            }, { ...prev.deliveryTimings }) || prev.deliveryTimings,
            panDetails: {
              panNumber: response?.documents?.pan_number || "",
              fullName: response?.documents?.name_as_per_pan || "",
              address: response?.documents?.registered_business_address || "",
              panFile: response?.documents?.pan_image || null,
            },
            fssaiDetails: {
              fssaiNumber: response?.documents?.fssai_number || "",
              expiryDate: response?.documents?.fssai_expiry_date || "",
              fssaiFile: response?.documents?.fssai_licence_image || null,
            },
            bankDetails: {
              accountNumber: response?.documents?.bank_account_number || "",
              reAccountNumber: response?.documents?.bank_account_number || "",
              ifsc: response?.documents?.bank_account_ifsc_code || "",
              accountType: response?.documents?.bank_account_type || "",
            },
            contractFile: response?.documents?.partner_contract_doc || null,
            isContractChecked: response?.documents?.is_contract_checked || false,
            restaurantId: response.restaurant_id,
          }));
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };
  
    fetchRestaurants();
  }, [restaurant_id]);

  // Navigation
  const handleNextStep = () => setStep(prev => (prev < steps.length ? prev + 1 : prev));
  const handlePrevStep = () => setStep(prev => (prev > 1 ? prev - 1 : prev));

  // Geocoding
  const handleOlaGeocode = async () => {
    const { shopNoBuilding, floorTower, areaSectorLocality, city } = formData.restaurantLocation;
    let query = [shopNoBuilding, floorTower, areaSectorLocality, city].filter(Boolean).join(", ");
    query = query.replace(/[^\x20-\x7E]/g, "");
    const ola_api_key = process.env.REACT_APP_OLA_MAP_API_KEY;
  
    if (!query.trim()) return null;
  
    try {
      const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(query)}&language=en&api_key=${ola_api_key}`;
      const response = await fetch(url, {
        headers: {
          "X-Request-Id": Date.now().toString(),
        },
      });
  
      const data = await response.json();
  
      if (data?.geocodingResults?.length > 0) {
        const location = data.geocodingResults[0].geometry.location;
        return {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lng),
        };
      } else {
        alert("No location found for the entered address.");
        return null;
      }
    } catch (err) {
      console.error("Ola Maps geocoding error:", err);
      alert("Something went wrong while fetching the location.");
      return null;
    }
  };
  
  // Form submissions
  const handleSubmitStep1 = async () => {
    try {
      setIsSubmitting(true);
      const geocodedLocation = await handleOlaGeocode();
      if (!geocodedLocation) return;

      const payload = {
        restaurant_name: formData.restaurantName,
        restaurant_status: 2,
        owner_details: {
          owner_name: formData.ownerDetails.fullName,
          owner_email_address: formData.ownerDetails.email,
          owner_contact: formData.ownerDetails.phone,
          owner_primary_contact: formData.ownerDetails.primaryContactNumber,
        },
        restaurant_location: {
          shop_no_building: formData.restaurantLocation.shopNoBuilding,
          floor_tower: formData.restaurantLocation.floorTower,
          area_sector_locality: formData.restaurantLocation.areaSectorLocality,
          city: formData.restaurantLocation.city,
          nearby_locality: formData.restaurantLocation.nearbyLocality,
          latitude: geocodedLocation.latitude,
          longitude: geocodedLocation.longitude,
        },
      };
      
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.STEP_ONE(restaurant_id || formData.restaurantId),
        "POST",
        payload,
        localStorage.getItem("access")
      );
  
      if (response) {
        setFormData(prev => ({ ...prev, restaurantId: response.restaurant_id }));
        localStorage.setItem("is_restaurant_register", JSON.stringify(true));
        handleNextStep();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };  

  const handleSubmitStep2 = async () => {
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      formDataToSend.append("restaurant_id", formData.restaurantId);
      if (formData.panDetails?.panFile) {
          formDataToSend.append("profile_image", formData.panDetails.panFile);
      }
      formDataToSend.append("cuisines", JSON.stringify(
        formData.selectedCuisines?.map((cuisine) => ({ cuisine_name: cuisine })) || []
      ));
      formDataToSend.append("delivery_timings", JSON.stringify(
          Object.keys(formData.deliveryTimings)
              .map((day) => ({
                  day,
                  open: formData.deliveryTimings[day].open,
                  start_time: formData.deliveryTimings[day].start,
                  end_time: formData.deliveryTimings[day].end,
              }))
              .filter((timing) => timing.open)
      ));

      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.STEP_TWO(restaurant_id || formData.restaurantId), 
        "POST", 
        formDataToSend, 
        localStorage.getItem("access"), 
        true
      );

      if (response) {
        handleNextStep();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStep3 = async () => {
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();

      if (formData.restaurantId) formDataToSend.append("restaurant_id", formData.restaurantId);
      if (formData.panDetails.panNumber) formDataToSend.append("pan_number", formData.panDetails.panNumber);
      if (formData.panDetails.fullName) formDataToSend.append("name_as_per_pan", formData.panDetails.fullName);
      if (formData.panDetails.address) formDataToSend.append("registered_business_address", formData.panDetails.address);
      if (formData.panDetails.panFile) formDataToSend.append("pan_image", formData.panDetails.panFile);
      if (formData.fssaiDetails.fssaiNumber) formDataToSend.append("fssai_number", formData.fssaiDetails.fssaiNumber);
      if (formData.fssaiDetails.expiryDate) formDataToSend.append("fssai_expiry_date", formData.fssaiDetails.expiryDate);
      if (formData.fssaiDetails.fssaiFile) formDataToSend.append("fssai_licence_image", formData.fssaiDetails.fssaiFile);
      if (formData.bankDetails.accountNumber) formDataToSend.append("bank_account_number", formData.bankDetails.accountNumber);
      if (formData.bankDetails.ifsc) formDataToSend.append("bank_account_ifsc_code", formData.bankDetails.ifsc);
      if (formData.bankDetails.accountType) formDataToSend.append("bank_account_type", formData.bankDetails.accountType);

      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.STEP_THREE(restaurant_id || formData.restaurantId),
        "POST",
        formDataToSend,
        localStorage.getItem("access"),
        true
      );

      if (response) {
        handleNextStep();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStep4 = async () => {
    try {
      setIsSubmitting(true);
      const formDataToSend = new FormData();
      if (formData.restaurantId) formDataToSend.append("restaurant_id", formData.restaurantId);
      if (formData.contractFile) formDataToSend.append("partner_contract_doc", formData.contractFile);
      formDataToSend.append("is_contract_checked", formData.isContractChecked.toString());

      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.STEP_FOUR(restaurant_id || formData.restaurantId),
        "POST",
        formDataToSend,
        localStorage.getItem("access"),
        true
      );

      if (response) {
        setShowSuccessPopup(true);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Popup Component
  const SuccessPopup = ({ onClose }) => {
    return (
      <div className="success-popup-overlay">
        <div className="success-popup">
          <div className="success-icon">
            <CheckCircle size={48} color="#4CAF50" />
          </div>
          <h3>Registration Complete!</h3>
          <p>Your restaurant registration has been submitted successfully. Our team will review your application and get back to you shortly.</p>
          <button className="success-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="registration-container">
      {showSuccessPopup && <SuccessPopup onClose={() => setShowSuccessPopup(false)} />}
    
      <aside className="sidebar">
        <h2 className="sidebar-title">Registration Steps</h2>
        {formData.restaurantId && (
          <div className="restaurant-id-container">
            <span className="restaurant-id">Restaurant ID: {formData.restaurantId}</span>
          </div>
        )}
        <div className="step-list">
          {steps.map(({ id, name, icon }, index) => (
            <div key={id} className="step-wrapper">
              <div 
                className={`step-item ${step >= id ? "completed" : ""} ${step === id ? "active" : ""}`}
                onClick={() => step > id && setStep(id)}
              >
                <span className="step-text-next">{name}</span>
                <div className="step-icon">
                  {step > id ? <CheckCircle size={22} /> : icon}
                </div>
                {/* <span className="step-text-next">{name}</span> */}
              </div>
              {/* {index !== steps.length - 1 && (
                <div className={`step-line ${step > id ? "completed-line" : ""}`}></div>
              )} */}
            </div>
          ))}
        </div>
      </aside>

      <div className="form-container">
        <div className="form-header">
          <h2>{steps.find(s => s.id === step)?.name}</h2>
          <div className="step-indicator">
            Step {step} of {steps.length}
          </div>
        </div>

        <div className="form-content">
          {/* Step 1: Restaurant Info */}
          {step === 1 && (
            <div className="info-section">
              <div className="info-card">
                <h3>Restaurant Name</h3>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Restaurant Name"
                    value={formData.restaurantName}
                    onChange={(e) => handleInputChange("restaurantName", e.target.value)}
                    required
                  />
                  <p className="input-hint">This name will be visible to customers</p>
                </div>
              </div>

              <div className="info-card">
                <h3>Owner Details</h3>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.ownerDetails.fullName}
                    onChange={(e) => handleNestedInputChange("ownerDetails", "fullName", e.target.value)}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={formData.ownerDetails.email}
                    onChange={(e) => handleNestedInputChange("ownerDetails", "email", e.target.value)}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.ownerDetails.phone}
                    onChange={(e) => handleNestedInputChange("ownerDetails", "phone", e.target.value)}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Restaurant's Primary Contact"
                    value={formData.ownerDetails.primaryContactNumber}
                    onChange={(e) => handleNestedInputChange("ownerDetails", "primaryContactNumber", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="info-card">
                <h3>Restaurant Location</h3>
                <p className="note">Please ensure this matches your FSSAI license address</p>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Shop/Building No. (Optional)"
                    value={formData.restaurantLocation.shopNoBuilding}
                    onChange={(e) => handleNestedInputChange("restaurantLocation", "shopNoBuilding", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Floor/Tower (Optional)"
                    value={formData.restaurantLocation.floorTower}
                    onChange={(e) => handleNestedInputChange("restaurantLocation", "floorTower", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Area/Sector/Locality*"
                    value={formData.restaurantLocation.areaSectorLocality}
                    onChange={(e) => handleNestedInputChange("restaurantLocation", "areaSectorLocality", e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="City*"
                    value={formData.restaurantLocation.city}
                    onChange={(e) => handleNestedInputChange("restaurantLocation", "city", e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nearby Landmark"
                    value={formData.restaurantLocation.nearbyLocality}
                    onChange={(e) => handleNestedInputChange("restaurantLocation", "nearbyLocality", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Menu & Pricing */}
          {step === 2 && (
            <div className="info-section">
              <div className="info-card">
                <h3>Restaurant Profile</h3>
                <div className="file-upload-container">
                  <label className="file-upload-label">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e.target.files[0], "panDetails")} 
                      className="file-upload-input"
                    />
                    <div className="upload-content">
                      {formData.panDetails?.panFile ? (
                        <>
                          <img 
                            src={URL.createObjectURL(formData.panDetails.panFile)} 
                            alt="Preview" 
                            className="upload-preview"
                          />
                          <span>Change Image</span>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 13V19H5V13H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13H19Z" fill="#FF6600"/>
                              <path d="M12 15L17 10H14V3H10V10H7L12 15Z" fill="#FF6600"/>
                            </svg>
                          </div>
                          <span>Upload Profile Image</span>
                          <p className="upload-hint">Recommended size: 800x800px</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="info-card">
                <h3>Select Cuisines (Max 3)</h3>
                <div className="cuisine-options">
                  {cuisines.map((cuisine) => (
                    <button
                      key={cuisine}
                      className={`cuisine-btn ${formData.selectedCuisines?.includes(cuisine) ? "selected" : ""}`}
                      onClick={() => handleCuisineSelect(cuisine)}
                      disabled={formData.selectedCuisines?.length >= 3 && !formData.selectedCuisines.includes(cuisine)}
                    >
                      {cuisine}
                      {formData.selectedCuisines?.includes(cuisine) && (
                        <span className="checkmark">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {formData.selectedCuisines?.length > 0 && (
                  <div className="selected-cuisines">
                    <span>Selected: </span>
                    {formData.selectedCuisines.join(", ")}
                  </div>
                )}
              </div>

              <div className="info-card">
                <h3>Delivery Timings</h3>
                <div className="timings-grid">
                  {Object.keys(formData.deliveryTimings).map((day) => (
                    <div key={day} className="timing-row">
                      <label className="day-label">
                        <input
                          type="checkbox"
                          checked={formData.deliveryTimings[day].open}
                          onChange={() =>
                            handleTimingChange(day, "open", !formData.deliveryTimings[day].open)
                          }
                        />
                        <span className="day-name">{day.substring(0, 3)}</span>
                      </label>
                      {formData.deliveryTimings[day].open ? (
                        <div className="time-inputs">
                          <input
                            type="time"
                            value={formData.deliveryTimings[day].start}
                            onChange={(e) => handleTimingChange(day, "start", e.target.value)}
                            className="time-input"
                          />
                          <span className="time-separator">to</span>
                          <input
                            type="time"
                            value={formData.deliveryTimings[day].end}
                            onChange={(e) => handleTimingChange(day, "end", e.target.value)}
                            className="time-input"
                          />
                        </div>
                      ) : (
                        <div className="time-closed">Closed</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="documents-section">
              <div className="info-card">
                <h3>PAN Details</h3>
                <p className="note">Enter details of the person/company who legally owns the restaurant</p>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="PAN Number" 
                    value={formData.panDetails.panNumber} 
                    onChange={(e) => handleNestedInputChange("panDetails", "panNumber", e.target.value)} 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Full Name as per PAN" 
                    value={formData.panDetails.fullName} 
                    onChange={(e) => handleNestedInputChange("panDetails", "fullName", e.target.value)} 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Registered Business Address" 
                    value={formData.panDetails.address} 
                    onChange={(e) => handleNestedInputChange("panDetails", "address", e.target.value)} 
                    required
                  />
                </div>
                <div className="file-upload-container">
                  <label className="file-upload-label">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => handleNestedInputChange("panDetails", "panFile", e.target.files[0])} 
                      className="file-upload-input"
                    />
                    <div className="upload-content">
                      {formData.panDetails?.panFile ? (
                        <>
                          <div className="file-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#FF6600"/>
                              <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span>{formData.panDetails.panFile.name}</span>
                          <span className="change-file">Change</span>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 13V19H5V13H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13H19Z" fill="#FF6600"/>
                              <path d="M12 15L17 10H14V3H10V10H7L12 15Z" fill="#FF6600"/>
                            </svg>
                          </div>
                          <span>Upload PAN Card</span>
                          <p className="upload-hint">JPG, PNG or PDF (Max 5MB)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="info-card">
                <h3>FSSAI Details</h3>
                <p className="note">Required for food safety compliance</p>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="FSSAI Number" 
                    value={formData.fssaiDetails.fssaiNumber} 
                    onChange={(e) => handleNestedInputChange("fssaiDetails", "fssaiNumber", e.target.value)} 
                    required
                  />
                  <input 
                    type="date" 
                    placeholder="Expiry Date" 
                    value={formData.fssaiDetails.expiryDate} 
                    onChange={(e) => handleNestedInputChange("fssaiDetails", "expiryDate", e.target.value)} 
                    required
                  />
                </div>
                <div className="file-upload-container">
                  <label className="file-upload-label">
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => handleNestedInputChange("fssaiDetails", "fssaiFile", e.target.files[0])} 
                      className="file-upload-input"
                    />
                    <div className="upload-content">
                      {formData.fssaiDetails?.fssaiFile ? (
                        <>
                          <div className="file-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#FF6600"/>
                              <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span>{formData.fssaiDetails.fssaiFile.name}</span>
                          <span className="change-file">Change</span>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 13V19H5V13H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13H19Z" fill="#FF6600"/>
                              <path d="M12 15L17 10H14V3H10V10H7L12 15Z" fill="#FF6600"/>
                            </svg>
                          </div>
                          <span>Upload FSSAI License</span>
                          <p className="upload-hint">JPG, PNG or PDF (Max 5MB)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="info-card">
                <h3>Bank Account Details</h3>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Account Number" 
                    value={formData.bankDetails.accountNumber} 
                    onChange={(e) => handleNestedInputChange("bankDetails", "accountNumber", e.target.value)} 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Re-enter Account Number" 
                    value={formData.bankDetails.reAccountNumber} 
                    onChange={(e) => handleNestedInputChange("bankDetails", "reAccountNumber", e.target.value)} 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="IFSC Code" 
                    value={formData.bankDetails.ifsc} 
                    onChange={(e) => handleNestedInputChange("bankDetails", "ifsc", e.target.value)} 
                    required
                  />
                  <select 
                    value={formData.bankDetails.accountType} 
                    onChange={(e) => handleNestedInputChange("bankDetails", "accountType", e.target.value)}
                    className="select-input"
                    required
                  >
                    <option value="">Select Account Type</option>
                    <option value="1">Savings Account</option>
                    <option value="2">Current Account</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contract */}
          {step === 4 && (
            <div className="contract-section">
              <div className="info-card">
                <h3>Partner Agreement</h3>
                <div className="contract-content">
                  <div className="contract-text">
                    <p>Please review and accept our partner agreement to complete your registration.</p>
                    <p>By proceeding, you agree to our terms and conditions regarding commission rates, delivery policies, and other partnership terms.</p>
                  </div>
                  
                  <div className="file-upload-container">
                    <label className="file-upload-label">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={(e) => handleFileChange(e.target.files[0], "contractFile")} 
                        className="file-upload-input"
                      />
                      <div className="upload-content">
                        {formData.contractFile ? (
                          <>
                            <div className="file-icon">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#FF6600"/>
                                <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <span>{formData.contractFile.name}</span>
                            <span className="change-file">Change</span>
                          </>
                        ) : (
                          <>
                            <div className="upload-icon">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 13V19H5V13H3V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V13H19Z" fill="#FF6600"/>
                                <path d="M12 15L17 10H14V3H10V10H7L12 15Z" fill="#FF6600"/>
                              </svg>
                            </div>
                            <span>Upload Signed Contract</span>
                            <p className="upload-hint">PDF or DOCX (Max 10MB)</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="agreement-checkbox">
                    <label className="checkbox-container">
                      <input 
                        type="checkbox" 
                        checked={formData.isContractChecked} 
                        onChange={handleContractCheckbox} 
                      />
                      <span className="checkmark"></span>
                      <span className="checkbox-text">
                        I agree to the terms and conditions outlined in the partner agreement
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-navigation">
          {step > 1 && (
            <button 
              className="prev-btn" 
              onClick={handlePrevStep}
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          
          <div className="step-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${(step / steps.length) * 100}%` }}
            ></div>
          </div>
          
          {step < steps.length ? (
            <button 
              className={`next-btn ${isSubmitting ? "submitting" : ""}`} 
              onClick={
                step === 1 ? handleSubmitStep1 :
                step === 2 ? handleSubmitStep2 :
                step === 3 ? handleSubmitStep3 :
                null
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="spinner"></div>
              ) : (
                <>
                  Next
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          ) : (
            <button 
              className={`registaration-submit-btn ${isSubmitting ? "submitting" : ""}`} 
              onClick={handleSubmitStep4}
              disabled={!formData.isContractChecked || isSubmitting}
            >
              {isSubmitting ? (
                <div className="spinner"></div>
              ) : (
                "Submit Registration"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantRegistration;