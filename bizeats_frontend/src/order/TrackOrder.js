import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "../assets/css/order/TrackOrder.css";
import { Bike, Maximize2, Minimize2, ChevronDown, ChevronUp } from "lucide-react";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

// Fix default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Custom icons
const customerIcon = L.divIcon({
  className: "custom-customer-icon",
  html: `
    <div class="custom-icon-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#ff6b6b">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5S7 4.24 7 7s2.24 5 5 5zm0 2c-3.87 0-7 1.79-7 4v3h14v-3c0-2.21-3.13-4-7-4z"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const kitchenIcon = L.divIcon({
  className: "custom-cloud-kitchen-icon",
  html: `<div class="custom-icon-wrapper"><svg width="28" height="28" fill="#e65c00" viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 0-1 1v1.07A9 9 0 0 0 3 13h18a9 9 0 0 0-8-7.93V4a1 1 0 0 0-1-1Zm-9 11a2 2 0 0 0 0 4h18a2 2 0 0 0 0-4H3Z"/></svg></div>`,
  iconSize: [35, 25],
  iconAnchor: [16, 32],
});

function RoutingWithLiveBike({ orderId, to, setDuration, setHasReached }) {
  const map = useMap();
  const routeRef = useRef(null);
  const bikeRef = useRef(null);
  const circleRef = useRef(null);
  const popupRef = useRef(null);
  const prevLatLng = useRef(null);
  const [reachedMessage, setReachedMessage] = useState(null);

  const bikeIcon = L.divIcon({
    className: "custom-bike-icon",
    html: `<div class="custom-icon-wrapper">
      <svg width="28" height="28" viewBox="0 0 64 64" fill="#e65c00" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 44a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-4a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm36 4a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-4a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM14 28h6l4-6h8v6h6l4 6h6v4H42l-4-6H30v6h-4l-4-6h-8v-4zM32 16c-2 0-4 1-6 2l-2-4-4 2 3 5c-1.5 1.2-3 2.6-4 4.5L22 28h8v-4h8v4h4v-6c-2-4-6-6-10-6z"/>
      </svg>
    </div>`,
    iconSize: [35, 25],
    iconAnchor: [16, 32],
  });

  useEffect(() => {
    if (!map) return;

    const fetchAndUpdate = async () => {
      try {
        const res = await fetchData(API_ENDPOINTS.TRACK.ORDER_LIVE_LOCATION, "POST", { order_id: orderId });
        if (
          res.status === "success" &&
          res.deliver_agent_location &&
          res.restaurant_location &&
          res.user_destination
        ) {
          const agent = L.latLng(res.deliver_agent_location.lat, res.deliver_agent_location.lng);
          const restaurant = L.latLng(res.restaurant_location.lat, res.restaurant_location.lng);
          const customer = L.latLng(res.user_destination.lat, res.user_destination.lng);

          // Skip if no significant movement
          if (prevLatLng.current && agent.distanceTo(prevLatLng.current) < 5) return;
          prevLatLng.current = agent;

          // Update or create bike marker
          if (!bikeRef.current) {
            bikeRef.current = L.marker(agent, { icon: bikeIcon }).addTo(map);
            // Center map on delivery agent when first loading
            map.setView(agent, 15);
          } else {
            bikeRef.current.setLatLng(agent);
          }

          // Remove old route if it exists
          if (routeRef.current) {
            map.removeControl(routeRef.current);
          }

          // Add new route
          routeRef.current = L.Routing.control({
            waypoints: [restaurant, agent, customer],
            lineOptions: { styles: [{ color: "#e65c00", weight: 5 }] },
            createMarker: () => null,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
          })
            .on("routesfound", (e) => {
              const durationInSeconds = e.routes[0].summary.totalTime;
              const adjustedDuration = Math.round((durationInSeconds / 60) * 1.5);
              setDuration(adjustedDuration);
          
              // Only adjust bounds if not too close to customer
              const distanceToCustomer = agent.distanceTo(customer);
              if (distanceToCustomer > 30) {
                const bounds = e.routes[0].bounds;
                if (bounds) {
                  map.fitBounds(bounds.pad(0.6));
                }
              }
            })
            .addTo(map);
          
          // Calculate distance to customer
          const distanceToCustomer = agent.distanceTo(customer);
          
          // Handle when agent is very close to customer (within 30 meters)
          if (distanceToCustomer < 30) {
            setHasReached(true);
            
            // Show reached message
            setReachedMessage("Your order has arrived!");
            
            // Remove existing circle if it exists
            if (circleRef.current) {
              map.removeLayer(circleRef.current);
            }

            // Create new circle with more visible styling
            circleRef.current = L.circle(agent, {
              radius: 30, // Fixed radius for better visibility
              color: "#28a745",
              fillColor: "#28a745",
              fillOpacity: 0.2,
              weight: 0.6
            }).addTo(map);

            // Add popup if not already added
            // if (!popupRef.current) {
            //   popupRef.current = L.popup({ autoClose: false, closeOnClick: false })
            //     .setLatLng(agent)
            //     .setContent("Your order has arrived!")
            //     .openOn(map);
            // }

            // Fit bounds to include both agent and customer
            const bounds = L.latLngBounds([agent, customer]);
            map.fitBounds(bounds.pad(0.3));
          } else {
            setHasReached(false);
            setReachedMessage(null);
            
            // Remove circle and popup if agent moved away
            if (circleRef.current) {
              map.removeLayer(circleRef.current);
              circleRef.current = null;
            }
            if (popupRef.current) {
              map.removeLayer(popupRef.current);
              popupRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("Live location fetch error:", err);
      }
    };

    fetchAndUpdate();
    const interval = setInterval(fetchAndUpdate, 15000);

    return () => {
      clearInterval(interval);
      if (bikeRef.current) map.removeLayer(bikeRef.current);
      if (routeRef.current) map.removeControl(routeRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
      if (popupRef.current) map.removeLayer(popupRef.current);
    };
  }, [map, orderId, setDuration, setHasReached]);

  return null;
}

const TrackOrder = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [noOrders, setNoOrders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [deliveryAgentLocation, setDeliveryAgentLocation] = useState(null);
  const [estimatedTimestamp, setEstimatedTimestamp] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [hasReached, setHasReached] = useState(false);
  const mapContainerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statusMap = {
    Pending: 0,
    Confirmed: 10,
    Preparing: 20,
    "Ready for Delivery/Pickup": 30,
    "On the Way": 60,
    Delivered: 100,
    Cancelled: 0,
    Refunded: 0,
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetchData(API_ENDPOINTS.TRACK.TRACK_ORDER, "POST", {
          user_id: user?.user_id,
        });
        if (res.status === "success" && res.orders.length) {
          setOrders(res.orders);
          setSelectedOrder(res.orders[0]);
        } else setNoOrders(true);
      } catch {
        setNoOrders(true);
      } finally {
        setLoading(false);
      }
    };
    if (user?.user_id) fetchOrders();
  }, [user?.user_id]);
  

  useEffect(() => {
    const fetchLocations = async () => {
      if (!selectedOrder) return;
      try {
        const res = await fetchData(API_ENDPOINTS.TRACK.ORDER_LIVE_LOCATION, "POST", {
          order_id: selectedOrder.order_number,
        });
        if (res.status === "success") {
          // Validate and parse location data
          const parseLocation = (loc) => {
            if (!loc) return null;
            const lat = parseFloat(loc.lat);
            const lng = parseFloat(loc.lng);
            return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
          };
  
          setUserLocation(parseLocation(res.user_destination));
          setRestaurantLocation(parseLocation(res.restaurant_location));
          setDeliveryAgentLocation(parseLocation(res.deliver_agent_location));
          
          console.log("res.estimated_time_minutes====",res.estimated_time_minutes)

          if (res.estimated_time_minutes === null) {
            setEstimatedTimestamp("agent_not_assigned");
          } else if (res.estimated_time_minutes) {
            setEstimatedTimestamp(res.estimated_time_minutes);
          } else {
            setEstimatedTimestamp("arrived");
          }
        }
      } catch (err) {
        console.error("Init loc error:", err);
      }
    };
    fetchLocations();
  }, [selectedOrder]);

  const handleOrderChange = (e) => {
    const order = orders.find((o) => o.order_number === e.target.value);
    setSelectedOrder(order);
    setHasReached(false);
  };

  const toggleMapSize = () => {
    setIsMapExpanded(!isMapExpanded);
    if (!isMapExpanded && mapContainerRef.current) {
      setTimeout(() => {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  if (noOrders)
    return (
      <div className="track-order-container no-orders">
        <h2 className="order-summary-title">Track Order</h2>
        <div className="no-order-message">
          <h3>No Orders Found</h3>
          <p>Bruh 😅 you haven't placed any orders yet.</p>
          <p>Don't let your cravings ghost you 👻 – go grab some munchies! 🍕🍔🍟</p>
          <a href="/menu" className="order-now-btn">Start Ordering</a>
        </div>
      </div>
    );

  if (!selectedOrder || loading) return <StripeLoader />;

  const progress = statusMap[selectedOrder.status] || 0;
  const initialCenter = deliveryAgentLocation || restaurantLocation || userLocation;
    
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetchData(API_ENDPOINTS.TRACK.TRACK_ORDER, "POST", {
        user_id: user?.user_id,
      });
      if (res.status === "success" && res.orders.length) {
        setOrders(res.orders);
        const currentOrder = res.orders.find(o => o.order_number === selectedOrder.order_number);
        if (currentOrder) {
          setSelectedOrder(currentOrder);
        } else if (res.orders.length > 0) {
          setSelectedOrder(res.orders[0]);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const convertUTCtoIST = (utcDateString) => {
    if (!utcDateString) return "N/A";
    const utcDate = new Date(utcDateString.replace(' ', 'T') + 'Z');
    if (isNaN(utcDate.getTime())) return "Invalid Date";
    const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    const hours = String(istDate.getHours()).padStart(2, '0');
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
  };

  const handleCallRestaurant = () => {
    if (selectedOrder?.restaurant_contact) {
      window.location.href = `tel:${selectedOrder.restaurant_contact}`;
    } else {
      alert("Restaurant phone number not available");
    }
  };

  return (
    <div className="track-order-container">
      <div className="track-header">
        <div className="restaurant-title-wrapper">
          <h2 className="order-summary-title">{selectedOrder?.restaurant_name}</h2>
          <div className="header-buttons">
            <button 
              className="call-button"
              onClick={handleCallRestaurant}
              aria-label="Call restaurant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button 
              className="refresh-button"
              onClick={handleRefresh}
              aria-label="Refresh order status"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <div className="refresh-spinner"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {estimatedTimestamp !== null && (
          <div className="eta">
            {estimatedTimestamp === "arrived" ? (
              <>
                <strong>Your order has arrived!</strong>
                <span className="status-badge">{selectedOrder.status}</span>
                <p className="eta-note">Enjoy your meal!</p>
              </>
            ) : estimatedTimestamp === "agent_not_assigned" ? (
              <>
                <strong>Waiting for agent assignment</strong>
                <span className="status-badge">{selectedOrder.status}</span>
                <p className="eta-note">We’ll notify you once a delivery agent is assigned.</p>
              </>
            ) : (
              <>
                <strong>Arriving:</strong> {estimatedTimestamp} mins
                <span className="status-badge">{selectedOrder.status}</span>
                <p className="eta-note">Note: Time shown is an estimate once your order is out for delivery.</p>
              </>
            )}
          </div>
        )}

      </div>

      <div className={`order-summary-card ${isMapExpanded ? 'map-expanded' : ''}`}>
        <div 
          className={`track-map-container ${isMapExpanded ? 'expanded' : ''}`} 
          ref={mapContainerRef}
        >
          {userLocation && restaurantLocation && initialCenter && (
          <MapContainer
            center={initialCenter}
            zoom={15}
            scrollWheelZoom={true}
            className="delivery-map"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {restaurantLocation && (
              <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={kitchenIcon}>
                <Popup>Restaurant: {selectedOrder?.restaurant_name}</Popup>
              </Marker>
            )}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={customerIcon}>
                <Popup>Your Location</Popup>
              </Marker>
            )}
            {selectedOrder.status === "On the Way" && (
              <RoutingWithLiveBike
                orderId={selectedOrder.order_number}
                to={userLocation ? [userLocation.lat, userLocation.lng] : null}
                setDuration={setDuration}
                setHasReached={setHasReached}
                status={selectedOrder.status}
              />
            )}
          </MapContainer>
        )}
        </div>

        <div className="progress-section">
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            <div className="bike-icon" style={{ left: `calc(${progress}% - 14px)` }}>
              <Bike size={28} color="#e65c00" />
            </div>
          </div>
          <div className="progress-labels">
            <span>Ordered</span>
            <span>{selectedOrder.status}</span>
            <span>Delivered</span>
          </div>
        </div>

        <div className="order-info-grid">
          <div className="order-section">
            <h3>Order Info</h3>
            <p><strong>ID:</strong> {selectedOrder.order_number}</p>
            <p><strong>Status:</strong> {selectedOrder.status}</p>
            <p><strong>Placed On:</strong> {convertUTCtoIST(selectedOrder.placed_on)}</p>
          </div>
          <div className="order-section">
            <h3>Delivery Address</h3>
            <p>{selectedOrder.delivery_address.full_name}</p>
            <p>{selectedOrder.delivery_address.address}, {selectedOrder.delivery_address.landmark}</p>
            <p>{selectedOrder.delivery_address.phone_number}</p>
          </div>
          <div className="order-section">
            <h3>Estimated Delivery</h3>
            <p><strong>Expected By:</strong> {convertUTCtoIST(selectedOrder.estimated_delivery)}</p>
          </div>
        </div>

        <div className="order-section">
          <h3>Items Ordered</h3>
          {selectedOrder.items.map((item, idx) => (
            <div className="item-line" key={idx}>
              <div className="item-name-qty">
                <span className="item-name">{item.item_name}</span>
                <span className="item-qty">x{item.quantity}</span>
              </div>
              <span className="item-total">₹{item.total_price}</span>
            </div>
          ))}
        </div>

        <div className="order-pricing">
          <div className="pricing-line">
            <span>Subtotal</span>
            <span>₹{selectedOrder.subtotal}</span>
          </div>
          <div className="pricing-line total-line">
            <span>Total</span>
            <span>₹{selectedOrder.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;