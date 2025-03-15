import React, { useState } from "react";
import { ArrowRight, Utensils, ClipboardList, FileCheck, FileSignature, CheckCircle } from "lucide-react";
import "../assets/css/restaurent/RestaurantRegistration.css";

const steps = [
  { id: 1, name: "Restaurant Info", icon: <Utensils size={22} /> },
  { id: 2, name: "Menu and Pricing", icon: <ClipboardList size={22} /> },
  { id: 3, name: "Restaurant documents", icon: <FileCheck size={22} /> },
  { id: 4, name: "Partner Contract", icon: <FileSignature size={22} /> }
];

const RestaurantRegistration = ({ user, setUser }) => {
  const [step, setStep] = useState(1);
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
  const [restaurantId, setrestaurantId] = useState(null);

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

  const handleNextStep = () => setStep((prev) => (prev < steps.length ? prev + 1 : prev));
  const handlePrevStep = () => setStep((prev) => (prev > 1 ? prev - 1 : prev));

  const handleSubmitStep1 = async () => {
    try {
        const prepareStep1Payload = () => {
            return {
                restaurant_name: restaurantName,
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
                },
            };
        };

        const response = await fetch("http://127.0.0.1:8000/api/restaurant/store/step-one", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("access") || ""}`
            },
            body: JSON.stringify(prepareStep1Payload()),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to submit Step 1");
        }

        if (data.access) {
            localStorage.setItem("access", data.access);
        }

        setrestaurantId(data?.restaurant_id);
        handleNextStep();

    } catch (error) {
        console.error("Error:", error);
    }
  };

  const handleSubmitStep2 = async () => {
    try {

      const prepareStep2Payload = () => {
        const payload = {
          restaurant_id: restaurantId,
          profile_image: panDetails.ProfileFile,
          cuisines: selectedCuisines,
          delivery_timings: deliveryTimings,
        };
      
        return payload;
      };

      const payload = prepareStep2Payload();
      const formData = new FormData();
      formData.append("restaurant_id", payload.restaurant_id);
  
      if (payload.profile_image) {
        formData.append("profile_image", payload.profile_image);
      }

      formData.append("cuisines", JSON.stringify(payload.cuisines));
      formData.append("delivery_timings", JSON.stringify(payload.delivery_timings));
  
      const response = await fetch("http://127.0.0.1:8000/api/restaurant/store/step-two", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access") || ""}`,
        },
        body: formData,
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit Step 2");
      }
  
      if (data.access) {
        localStorage.setItem("access", data.access);
      }
  
      handleNextStep();
  
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="registration-container">
      {/* Sidebar for Steps */}
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
                  placeholder="Restaurant Name (Customers will see this name on BizEats)"
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
            <div className="info-card">
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
            </div>

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
                  <option value="saving">Saving A/C</option>
                  <option value="current">Current A/C</option>
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
            </div>

            {/* Agreement Checkbox */}
            <div className="agreement-section">
              <label>
                <input
                  type="checkbox"
                  checked={agreementChecked}
                  onChange={() => setAgreementChecked(!agreementChecked)}
                />
                I agree to the terms and conditions outlined in the contract.
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="form-navigation">
          {step > 1 && <button className="prev-btn" onClick={handlePrevStep}>Back</button>}
          {step < steps.length ? (
            step === 1 ? (
              <button className="next-btn" onClick={handleSubmitStep1}>
                Next Step <ArrowRight size={18} />
              </button>
            ) : step === 2 ? (
              <button className="next-btn" onClick={handleSubmitStep2}>
                Next Step <ArrowRight size={18} />
              </button>
            ) : (
              <button className="next-btn" onClick={handleNextStep}>
                Next Step <ArrowRight size={18} />
              </button>
            )
          ) : (
            <button className="submit-btn" disabled={!agreementChecked}>Submit</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantRegistration;
