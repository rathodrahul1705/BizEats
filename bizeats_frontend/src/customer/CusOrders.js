import React from "react";
import "../assets/css/customer/CusOrders.css";
import breakfastImg from "../assets/img/breakfast_image.webp";
import pizzaImg from "../assets/img/breakfast_image.webp";
import friesImg from "../assets/img/breakfast_image.webp";
import burgerImg from "../assets/img/breakfast_image.webp";
import coffeeImg from "../assets/img/breakfast_image.webp";

const CusOrders = () => {
  const orders = [
    {
      id: "ORD123456",
      date: "March 10, 2025",
      restaurant: "Mumbai Tandoori",
      location: "Mumbai, India",
      items: [{ name: "Lachha Paratha", quantity: 4, image: breakfastImg }],
      total: 87768,
      status: "Delivered",
    },
    {
      id: "ORD789012",
      date: "March 8, 2025",
      restaurant: "Pizza Mania",
      location: "Pune, India",
      items: [
        { name: "Cheese Pizza", quantity: 1, image: pizzaImg },
        { name: "French Fries", quantity: 1, image: friesImg },
      ],
      total: 18.99,
      status: "Cancelled",
    },
    {
      id: "ORD345678",
      date: "March 5, 2025",
      restaurant: "Burger Point",
      location: "Delhi, India",
      items: [
        { name: "Burger Meal", quantity: 1, image: burgerImg },
        { name: "Cold Coffee", quantity: 1, image: coffeeImg },
      ],
      total: 22.50,
      status: "Processing",
    },
  ];

  return (
    <div className="orders-container">
      <h3 className="orders-title">Your Past Orders</h3>
      {orders.length === 0 ? (
        <p className="no-orders">You have no past orders.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id} className="order-item">
              <div className="order-header">
                {/* Order Image (Bigger) */}
                <img src={order.items[0].image} alt={order.items[0].name} className="order-image" />

                {/* Order Details - No Extra Top Space */}
                <div className="order-details">
                  <p className="order-restaurant">{order.restaurant}</p>
                  <p className="order-location">{order.location}</p>
                  <p className="order-id-date">
                    <strong>Order ID:</strong> {order.id} | <strong>Date:</strong> {order.date}
                  </p>
                  <span className={`order-status ${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Footer (Items and Pricing Side-by-Side) */}
              <div className="order-footer">
                <div className="order-items">
                  <strong>Items:</strong>{" "}
                  {order.items.map((item, index) => (
                    <span key={index}>
                      {item.name} x {item.quantity}
                      {index !== order.items.length - 1 && ", "}
                    </span>
                  ))}
                </div>
                <p className="order-total"><strong>Total Paid:</strong> ₹ {order.total.toFixed(2)}</p>
              </div>

              {/* Actions Section */}
              <div className="order-actions">
                <span className="view-details-text">View More Details</span>
                <button className="reorder-btn">Reorder</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Show More Orders Button */}
      <div className="show-more-container">
        <button className="show-more-btn">Show More Orders</button>
      </div>
    </div>
  );
};

export default CusOrders;
