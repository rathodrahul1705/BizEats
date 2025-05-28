import React, { useState, useEffect} from "react";
import { ArrowRight, Utensils, ClipboardList, FileCheck, FileSignature, CheckCircle } from "lucide-react";
import "../assets/css/restaurent/RestaurantRegistration.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService"
import { useParams } from "react-router-dom";

const steps = [
  { id: 1, name: "Restaurant Info", icon: <Utensils size={22} /> },
  { id: 2, name: "Menu and Pricing", icon: <ClipboardList size={22} /> },
  { id: 3, name: "Restaurant documents", icon: <FileCheck size={22} /> },
  { id: 4, name: "Partner Contract", icon: <FileSignature size={22} /> },
];

const RestaurantRegistration = ({user, setUser}) => {
  const { restaurant_id } = useParams();
  const [step, setStep] = useState(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [deliveryTimings, setDeliveryTimings] = useState({
    Monday: { open: false, start: "", end: "" },
    Tuesday: { open: false, start: "", end: "" },
    Wednesday: { open: false, start: "", end: "" },
    Thursday: { open: false, start: "", end: "" },
    Friday: { open: false, start: "", end: "" },
    Saturday: { open: false, start: "", end: "" },
    Sunday: { open: false, start: "", end: "" },
  });

  const [panDetails, setPanDetails] = useState({ panNumber: "", fullName: "", address: "", panFile: null });
  const [gstRegistered, setGstRegistered] = useState(null);
  const [fssaiDetails, setFssaiDetails] = useState({ fssaiNumber: "", expiryDate: "", fssaiFile: null });
  const [bankDetails, setBankDetails] = useState({ accountNumber: "", reAccountNumber: "", ifsc: "", accountType: "" });
  const [contractFile, setContractFile] = useState(null);
  const [isContractChecked, setIsContractChecked] = useState(false);
  const [restaurantId, setrestaurantId] = useState(null);

  // console.log("restaurantId====",restaurantId)

  const [restaurantName, setRestaurantName] = useState("");
  const [ownerDetails, setOwnerDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    primaryContactNumber: "",
  });
  const [restaurantLocation, setRestaurantLocation] = useState({
    shopNoBuilding: "",
    floorTower: "",
    areaSectorLocality: "",
    city: "",
    nearbyLocality: "",
  });

  const cuisines = ["Italian", "Chinese", "Indian", "Mexican", "Thai", "Japanese"];

  const handleCuisineSelect = (cuisine) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter((item) => item !== cuisine));
    } else if (selectedCuisines.length < 3) {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const handleTimingChange = (day, field, value) => {
    setDeliveryTimings({
      ...deliveryTimings,
      [day]: { ...deliveryTimings[day], [field]: value },
    });
  };

  const handleFileChange = (e, field) => {
    if (field === "ProfileFile") {
      setPanDetails({ ...panDetails, [field]: e.target.files[0] });
    } else {
      setPanDetails({ ...panDetails, [field]: e.target.files[0] });
    }
  };

  const handleContractUpload = (e) => {
    setContractFile(e.target.files[0]);
  };

  const handleContractCheckbox = (e) => {
    setIsContractChecked(e.target.checked);
  };

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
  
        // Assuming the response contains the restaurant details
        if (response) {
          // Update restaurant name
          setRestaurantName(response.restaurant_name);
  
          // Update owner details
          setOwnerDetails({
            fullName: response.owner_details.owner_name,
            email: response.owner_details.owner_email_address,
            phone: response.owner_details.owner_contact,
            primaryContactNumber: response.owner_details.owner_primary_contact,
          });
  
          // Update restaurant location
          setRestaurantLocation({
            shopNoBuilding: response.restaurant_location.shop_no_building,
            floorTower: response.restaurant_location.floor_tower,
            areaSectorLocality: response.restaurant_location.area_sector_locality,
            city: response.restaurant_location.city,
            nearbyLocality: response.restaurant_location.nearby_locality,
          });
  
          // Update selected cuisines
          if (response.cuisines) {
            setSelectedCuisines(response.cuisines.map((cuisine) => cuisine.cuisine_name));
          }
  
          // Update delivery timings
          if (response.delivery_timings) {
            const timings = {};
            response.delivery_timings.forEach((timing) => {
              timings[timing.day] = {
                open: timing.open,
                start: timing.start_time,
                end: timing.end_time,
              };
            });
            setDeliveryTimings(timings);
          }
  
          // Update PAN details
          if (response.documents) {
            setPanDetails({
              panNumber: response?.documents?.pan_number,
              fullName: response?.documents?.name_as_per_pan,
              address: response?.documents?.registered_business_address,
              panFile: response?.documents?.pan_image,
            });
          }
  
          // Update FSSAI details
          if (response.documents) {
            setFssaiDetails({
              fssaiNumber: response?.documents?.fssai_number,
              expiryDate: response?.documents?.fssai_expiry_date,
              fssaiFile: response?.documents?.fssai_licence_image,
            });
          }
  
          // Update bank details
          if (response.documents) {
            setBankDetails({
              accountNumber: response?.documents?.bank_account_number,
              reAccountNumber: response?.documents?.bank_account_number, // Assuming re-enter is the same
              ifsc: response?.documents?.bank_account_ifsc_code,
              accountType: response?.documents?.bank_account_type,
            });
          }
  
          // Update contract file and checkbox
          if (response?.documents) {
            setContractFile(response?.documents.partner_contract_doc);
            setIsContractChecked(response?.documents.is_contract_checked);
          }
  
          // Set restaurant ID
          setrestaurantId(response.restaurant_id);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };
  
    fetchRestaurants();
  }, [restaurant_id]);


  const handleNextStep = () => setStep((prev) => (prev < steps.length ? prev + 1 : prev));
  const handlePrevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev));


  const handleOlaGeocode = async () => {
    const { shopNoBuilding, floorTower, areaSectorLocality, city, state, zip, country } = restaurantLocation;
    let query = [shopNoBuilding, floorTower, areaSectorLocality, city, state, zip, country].filter(Boolean).join(", ");
  
    // Remove non-English characters to prevent API errors
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
  
        const latlng = {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lng),
        };
  
        return latlng;
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
  
  const handleSubmitStep1 = async () => {
    try {
      const geocodedLocation = await handleOlaGeocode();

      if (!geocodedLocation) return; // Don't proceed if geocoding failed
  
      const payload = {
        restaurant_name: restaurantName,
        restaurant_status: 2,
        owner_details: {
          owner_name: ownerDetails.fullName,
          owner_email_address: ownerDetails.email,
          owner_contact: ownerDetails.phone,
          owner_primary_contact: ownerDetails.primaryContactNumber,
        },
        restaurant_location: {
          shop_no_building: restaurantLocation.shopNoBuilding,
          floor_tower: restaurantLocation.floorTower,
          area_sector_locality: restaurantLocation.areaSectorLocality,
          city: restaurantLocation.city,
          nearby_locality: restaurantLocation.nearbyLocality,
          latitude: geocodedLocation.latitude,
          longitude: geocodedLocation.longitude, // Include the lat/lng if needed
        },
      };
      
      const response = await fetchData(
        API_ENDPOINTS.RESTAURANT.STEP_ONE(restaurant_id || restaurantId),
        "POST",
        payload,
        localStorage.getItem("access")
      );
  
      if (response) {
        setrestaurantId(response?.restaurant_id);
        localStorage.setItem("is_restaurant_register", JSON.stringify(true));
        handleNextStep();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };  

const handleSubmitStep2 = async () => {
  try {
      const formData = new FormData();
      formData.append("restaurant_id", restaurantId);
      if (panDetails?.ProfileFile) {
          formData.append("profile_image", panDetails.ProfileFile);
      }
      formData.append("cuisines", JSON.stringify(selectedCuisines.map((cuisine) => ({ cuisine_name: cuisine }))));
      formData.append("delivery_timings", JSON.stringify(
          Object.keys(deliveryTimings)
              .map((day) => ({
                  day,
                  open: deliveryTimings[day].open,
                  start_time: deliveryTimings[day].start,
                  end_time: deliveryTimings[day].end,
              }))
              .filter((timing) => timing.open)
      ));

      const response = await fetchData(API_ENDPOINTS.RESTAURANT.STEP_TWO(restaurant_id ? restaurant_id : restaurantId), "POST", formData, localStorage.getItem("access"), true);

      if (response) {
          handleNextStep();
      }
  } catch (error) {
      console.error("Error:", error);
  }
};

const handleSubmitStep3 = async () => {
  try {
    const formData = new FormData();

    // Append only non-null values
    if (restaurantId) formData.append("restaurant_id", restaurantId);
    if (panDetails?.panNumber) formData.append("pan_number", panDetails.panNumber);
    if (panDetails?.fullName) formData.append("name_as_per_pan", panDetails.fullName);
    if (panDetails?.address) formData.append("registered_business_address", panDetails.address);
    if (panDetails?.panFile) formData.append("pan_image", panDetails.panFile);
    if (fssaiDetails?.fssaiNumber) formData.append("fssai_number", fssaiDetails.fssaiNumber);
    if (fssaiDetails?.expiryDate) formData.append("fssai_expiry_date", fssaiDetails.expiryDate);
    if (fssaiDetails?.fssaiFile) formData.append("fssai_licence_image", fssaiDetails.fssaiFile);
    if (bankDetails?.accountNumber) formData.append("bank_account_number", bankDetails.accountNumber);
    if (bankDetails?.ifsc) formData.append("bank_account_ifsc_code", bankDetails.ifsc);
    if (bankDetails?.accountType) formData.append("bank_account_type", bankDetails.accountType);

    const response = await fetchData(
      API_ENDPOINTS.RESTAURANT.STEP_THREE(restaurant_id ? restaurant_id : restaurantId),
      "POST",
      formData,
      localStorage.getItem("access"),
      true
    );

    if (response) {
      handleNextStep();
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

const handleSubmitStep4 = async () => {
  try {
    const formData = new FormData();
    if (restaurantId) formData.append("restaurant_id", restaurantId);
    if (contractFile) formData.append("partner_contract_doc", contractFile);
    if (isContractChecked !== null && isContractChecked !== undefined) {
      formData.append("is_contract_checked", isContractChecked.toString()); // Convert boolean to string
    }

    const response = await fetchData(
      API_ENDPOINTS.RESTAURANT.STEP_FOUR(restaurant_id ? restaurant_id : restaurantId),
      "POST",
      formData,
      localStorage.getItem("access"),
      true
    );

    if (response) {
      setShowSuccessPopup(true);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

  const SuccessPopup = ({ onClose }) => {
    return (
      <div className="success-popup-overlay">
        <div className="success-popup">
          <h3>Congratulations!</h3>
          <p>All steps completed. Wait for Eatoor for Approval.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };

  return (
    <div className="registration-container">
      {/* Sidebar for Steps */}

      {showSuccessPopup && (
        <SuccessPopup onClose={() => setShowSuccessPopup(false)} />
      )}
    
      <aside className="sidebar">
        <h2 className="sidebar-title">Registration Steps</h2>
        {
          restaurantId ?
          <div className="restaurant-id-container">
              <span className="restaurant-id">Restaurant ID: {restaurantId ? restaurantId : ""}</span>
          </div>
          :
          ""
        }
        <div className="step-list">
          {steps.map(({ id, name, icon }, index) => (
            <div key={id} className="step-wrapper">
              <div className={`step-item ${step >= id ? "completed" : ""}`}>
                <div className="step-icon">{step > id ? <CheckCircle size={22} color="blue" /> : icon}</div>
                <span className="step-text">{name}</span>
              </div>
              {index !== steps.length - 1 && (
                <div className={`step-line ${step > id ? "completed-line" : ""}`}></div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Form Content */}
      <div className="form-container">
      {step === 1 && (
          <div className="info-section">
            {/* Restaurant Name */}
            <div className="info-card">
              <h3>Restaurant Name</h3>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Restaurant Name (Customers will see this name on Eatoor)"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                />
              </div>
            </div>

            {/* Owner Details */}
            <div className="info-card">
              <h3>Owner Details</h3>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={ownerDetails.fullName}
                  onChange={(e) => setOwnerDetails({ ...ownerDetails, fullName: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={ownerDetails.email}
                  onChange={(e) => setOwnerDetails({ ...ownerDetails, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={ownerDetails.phone}
                  onChange={(e) => setOwnerDetails({ ...ownerDetails, phone: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Restaurant's Primary Contact Number"
                  value={ownerDetails.primaryContactNumber}
                  onChange={(e) => setOwnerDetails({ ...ownerDetails, primaryContactNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Restaurant Location */}
            <div className="info-card">
              <h3>Add Your Restaurant's Location for Order Pick-up</h3>
              <p className="note">Please ensure that this address is the same as mentioned on your FSSAI license</p>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Shop No. / Building No. (Optional)"
                  value={restaurantLocation.shopNoBuilding}
                  onChange={(e) => setRestaurantLocation({ ...restaurantLocation, shopNoBuilding: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Floor / Tower (Optional)"
                  value={restaurantLocation.floorTower}
                  onChange={(e) => setRestaurantLocation({ ...restaurantLocation, floorTower: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Area / Sector / Locality*"
                  value={restaurantLocation.areaSectorLocality}
                  onChange={(e) => setRestaurantLocation({ ...restaurantLocation, areaSectorLocality: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="City"
                  value={restaurantLocation.city}
                  onChange={(e) => setRestaurantLocation({ ...restaurantLocation, city: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Add Any Nearby Locality"
                  value={restaurantLocation.nearbyLocality}
                  onChange={(e) => setRestaurantLocation({ ...restaurantLocation, nearbyLocality: e.target.value })}
                />
              </div>
            </div>
          </div>
      )}

      {step === 2 && (
        <div className="info-section">
          {/* Profile Image Upload */}
          <div className="info-card">
            <div className="file-upload">
              <label className="upload-box">
                <input type="file" onChange={(e) => handleFileChange(e, "ProfileFile")} />
                Restaurant Profile Image
              </label>
            </div>
          </div>

          {/* Cuisine Selection */}
          <div className="info-card">
            <h3>Select Up to 3 Cuisines</h3>
            <div className="cuisine-options">
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  className={`cuisine-btn ${selectedCuisines.includes(cuisine) ? "selected" : ""}`}
                  onClick={() => handleCuisineSelect(cuisine)}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Timings */}
          <div className="info-card">
            <h3>Restaurant Delivery Timings</h3>
            {Object.keys(deliveryTimings).map((day) => (
              <div key={day} className="day-selection">
                <label>
                  <input
                    type="checkbox"
                    checked={deliveryTimings[day].open}
                    onChange={() =>
                      handleTimingChange(day, "open", !deliveryTimings[day].open)
                    }
                  />
                  {day}
                </label>
                {deliveryTimings[day].open && (
                  <div className="timing-inputs">
                    <input
                      type="time"
                      value={deliveryTimings[day].start}
                      onChange={(e) => handleTimingChange(day, "start", e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="time"
                      value={deliveryTimings[day].end}
                      onChange={(e) => handleTimingChange(day, "end", e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

        {step === 3 && (
          <div className="documents-section">
            {/* PAN Details */}
            <div className="info-card">
              <h3>PAN Details</h3>
              <p className="note">Enter the PAN details of the person or company who legally owns the restaurant.</p>
              <div className="input-group">
                <input type="text" placeholder="PAN Number" value={panDetails.panNumber} onChange={(e) => setPanDetails({ ...panDetails, panNumber: e.target.value })} />
                <input type="text" placeholder="Full Name as per PAN" value={panDetails.fullName} onChange={(e) => setPanDetails({ ...panDetails, fullName: e.target.value })} />
                <input type="text" placeholder="Registered Business Address" value={panDetails.address} onChange={(e) => setPanDetails({ ...panDetails, address: e.target.value })} />
              </div>
              <div className="file-upload">
                <label className="upload-box">
                  <input type="file" onChange={(e) => handleFileChange(e, "panFile")} />
                  Upload PAN Card
                </label>
              </div>
            </div>

            {/* GST Details */}
            {/* <div className="info-card">
              <h3>GST Details (if applicable)</h3>
              <p className="note">This should be linked to the PAN provided earlier for tax calculations.</p>
              <div className="gst-selection">
                <label>
                  <input type="radio" name="gst" value="yes" onChange={() => setGstRegistered(true)} /> Yes
                </label>
                <label>
                  <input type="radio" name="gst" value="no" onChange={() => setGstRegistered(false)} /> No
                </label>
              </div>
            </div> */}

            {/* FSSAI Details */}
            <div className="info-card">
              <h3>FSSAI Details</h3>
              <p className="note">This is required to comply with regulations on food safety.</p>
              <div className="input-group">
                <input type="text" placeholder="FSSAI Number" value={fssaiDetails.fssaiNumber} onChange={(e) => setFssaiDetails({ ...fssaiDetails, fssaiNumber: e.target.value })} />
                <input type="date" placeholder="Expiry Date" value={fssaiDetails.expiryDate} onChange={(e) => setFssaiDetails({ ...fssaiDetails, expiryDate: e.target.value })} />
              </div>
              <div className="file-upload">
                <label className="upload-box">
                  <input type="file" onChange={(e) => setFssaiDetails({ ...fssaiDetails, fssaiFile: e.target.files[0] })} />
                  Upload FSSAI License
                </label>
              </div>
            </div>

            {/* Bank Account Details */}
            <div className="info-card">
              <h3>Bank Account Details</h3>
              <div className="input-group">
                <input type="text" placeholder="Bank Account Number" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
                <input type="text" placeholder="Re-Enter Bank Account Number" value={bankDetails.reAccountNumber} onChange={(e) => setBankDetails({ ...bankDetails, reAccountNumber: e.target.value })} />
                <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
                <select value={bankDetails.accountType} onChange={(e) => setBankDetails({ ...bankDetails, accountType: e.target.value })}>
                  <option value="">Select Account Type</option>
                  <option value="1">Saving A/C</option>
                  <option value="2">Current A/C</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Partner Contract */}
        {step === 4 && (
          <div className="contract-section">
            <div className="info-card">
              <h3>Submit Partner Contract</h3>
              <p className="note">
                Please upload the signed contract agreement to proceed with your registration.
              </p>
              <div className="file-upload">
                <label className="upload-box">
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleContractUpload} />
                  Upload Contract Document
                </label>
                {contractFile && <p className="file-name">{contractFile.name}</p>}
              </div>
              <div className="agreement-section">
                <label>
                  <input
                    type="checkbox"
                    checked={isContractChecked}
                    onChange={handleContractCheckbox}
                  />
                  I agree to the terms and conditions outlined in the contract.
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="form-navigation">
          {step > 1 && <button className="prev-btn" onClick={handlePrevStep}>Back</button>}
          {step === 1 && (
            <button className="next-btn" onClick={handleSubmitStep1}>
              Next Step <ArrowRight size={18} />
            </button>
          )}
          {step === 2 && (
            <button className="next-btn" onClick={handleSubmitStep2}>
              Next Step <ArrowRight size={18} />
            </button>
          )}
          {step === 3 && (
            <button className="next-btn" onClick={handleSubmitStep3}>
              Next Step <ArrowRight size={18} />
            </button>
          )}
          {step === 4 && (
            <button className="next-btn" hidden={!isContractChecked} onClick={handleSubmitStep4}>
              Submit <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantRegistration;