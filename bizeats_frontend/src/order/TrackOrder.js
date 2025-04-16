// TrackOrder.js
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "../assets/css/order/TrackOrder.css";
import { Bike } from "lucide-react";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";
import StripeLoader from "../loader/StripeLoader";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Custom icons
const customerIcon = L.divIcon({
  className: "custom-customer-icon",
  html: `<div class="custom-icon-wrapper"><svg width="32" height="32" viewBox="0 0 24 24" fill="#e65c00"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg></div>`,
  iconSize: [35, 25],
  iconAnchor: [16, 32],
});

const kitchenIcon = L.divIcon({
  className: "custom-cloud-kitchen-icon",
  html: `<div class="custom-icon-wrapper"><svg width="28" height="28" fill="#e65c00" viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 0-1 1v1.07A9 9 0 0 0 3 13h18a9 9 0 0 0-8-7.93V4a1 1 0 0 0-1-1Zm-9 11a2 2 0 0 0 0 4h18a2 2 0 0 0 0-4H3Z"/></svg></div>`,
  iconSize: [35, 25],
  iconAnchor: [16, 32],
});

function RoutingWithLiveBike({ from, to, orderId }) {
  const map = useMap();
  const bikeMarkerRef = useRef(null);
  const routeRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const bikeIcon = L.divIcon({
      className: "custom-bike-icon",
      html: `<div class="map-bike-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e65c00"><path d="M5.5 16a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5.5 18A4.5 4.5 0 1 1 10 13.5H8.8a3.2 3.2 0 1 0-6.1 1.6l1.2.4c-.1-.2-.1-.4-.1-.5a2.5 2.5 0 0 1 5 0A2.5 2.5 0 0 1 5.5 18Zm13 0A4.5 4.5 0 1 1 23 13.5 4.5 4.5 0 0 1 18.5 18ZM17 6V5a1 1 0 0 0-1-1h-2v2h1.1l.4 1H11v2h1.4l-1.4 4.1-2-6.1H7v2h.6l3.3 9h1.9L16.7 9H18V7h-1.3l-.6-1Z"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const fetchLiveLocation = async () => {
      try {
        const res = await fetchData(API_ENDPOINTS.TRACK.ORDER_LIVE_LOCATION, "POST", { order_id: orderId });
        if (res.status === "success" && res.location) {
          const latLng = L.latLng(res.location.lat, res.location.lng);
          if (!bikeMarkerRef.current) {
            const marker = L.marker(latLng, { icon: bikeIcon }).addTo(map);
            bikeMarkerRef.current = marker;
            if (!routeRef.current) {
              routeRef.current = L.Routing.control({
                waypoints: [L.latLng(from), L.latLng(to)],
                lineOptions: { styles: [{ color: "#e65c00", weight: 5 }] },
                createMarker: () => null,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                show: false,
              }).addTo(map);
            }
          } else {
            bikeMarkerRef.current.setLatLng(latLng);
          }
        }
      } catch (err) {
        console.error("Error fetching agent location", err);
      }
    };

    fetchLiveLocation();
    const interval = setInterval(fetchLiveLocation, 5000);

    return () => {
      clearInterval(interval);
      if (bikeMarkerRef.current) map.removeLayer(bikeMarkerRef.current);
      if (routeRef.current) map.removeControl(routeRef.current);
    };
  }, [map, from, to, orderId]);

  return null;
}

const TrackOrder = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [noOrders, setNoOrders] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusMap = {
    Pending: 0,
    Confirmed: 20,
    Preparing: 40,
    "Ready for Delivery/Pickup": 60,
    "On the Way": 80,
    Delivered: 100,
    Cancelled: 0,
    Refunded: 0,
  };

  useEffect(() => {
    const getOrderTrackingDetails = async () => {
      try {
        setLoading(true);
        const response = await fetchData(API_ENDPOINTS.TRACK.TRACK_ORDER, "POST", {
          user_id: user?.user_id || null,
        });
        if (response.status === "success" && response.orders.length > 0) {
          setOrders(response.orders);
          setSelectedOrder(response.orders[0]);
        } else {
          setNoOrders(true);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setNoOrders(true);
      } finally {
        setLoading(false);
      }
    };

    if (user?.user_id) getOrderTrackingDetails();
  }, [user?.user_id]);

  const handleOrderChange = (e) => {
    const order = orders.find((o) => o.order_number === e.target.value);
    setSelectedOrder(order);
  };

  if (noOrders) {
    return (
      <div className="track-order-container no-orders">
        <h2 className="order-summary-title">Track Order</h2>
        <div className="no-order-message">
          <h3>No Orders Found</h3>
          <p>Looks like you haven’t placed any orders yet.</p>
        </div>
      </div>
    );
  }

  if (!selectedOrder || loading) return <StripeLoader />;

  const deliveryAgentStart = [19.196061448334195, 72.95428775304241];
  const userDeliveryPoints = [19.20705360826353, 73.0111160893804];
  
  const progress = statusMap[selectedOrder.status] || 0;

  return (
    <div className="track-order-container">
      <div className="track-header">
        <h2 className="order-summary-title">Track Order</h2>
        <div className="order-selector">
          <label htmlFor="orderSelect">Select Order:</label>
          <select id="orderSelect" onChange={handleOrderChange} value={selectedOrder.order_number}>
            {orders.map((order) => (
              <option key={order.order_number} value={order.order_number}>
                {order.order_number} - {order.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="order-summary-card">
        <div className="track-map-container">
          <MapContainer
            center={[19.201, 72.98]}
            zoom={13}
            scrollWheelZoom={false}
            className="delivery-map"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={deliveryAgentStart} icon={kitchenIcon} />
            <Marker position={userDeliveryPoints} icon={customerIcon} />
            <RoutingWithLiveBike
              from={deliveryAgentStart}
              to={userDeliveryPoints}
              orderId={selectedOrder.order_id}
            />
          </MapContainer>
        </div>

        <div className="progress-section">
          <div className="progress-bar-wrapper">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            <div className="bike-icon" style={{ left: `calc(${progress}% + 2px)` }}>
              <Bike size={28} color="#e65c00" />
            </div>
          </div>
        </div>

        <div className="order-info-grid">
          <div className="order-section">
            <h3>Order Info</h3>
            <p><strong>ID:</strong> {selectedOrder.order_number}</p>
            <p><strong>Status:</strong> {selectedOrder.status}</p>
            <p><strong>Placed On:</strong> {selectedOrder.placed_on}</p>
          </div>
          <div className="order-section">
            <h3>Delivery Address</h3>
            <p>{selectedOrder.delivery_address.full_name}</p>
            <p>{selectedOrder.delivery_address.address}</p>
            <p>{selectedOrder.delivery_address.landmark}</p>
            <p>{selectedOrder.delivery_address.phone_number}</p>
          </div>
          <div className="order-section">
            <h3>Estimated Delivery</h3>
            <p><strong>Expected By:</strong> {selectedOrder.estimated_delivery}</p>
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