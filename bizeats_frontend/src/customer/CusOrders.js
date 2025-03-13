import React from "react";
import "../assets/css/customer/CusOrders.css";
import breakfastImg from "../assets/img/breakfast_image.webp";
import lunchImg from "../assets/img/breakfast_image.webp";
import pizzaImg from "../assets/img/breakfast_image.webp";
import friesImg from "../assets/img/breakfast_image.webp";
import burgerImg from "../assets/img/breakfast_image.webp";
import coffeeImg from "../assets/img/breakfast_image.webp";

const CusOrders = () => {
  const orders = [
    {
      id: "ORD123456",
      date: "March 10, 2025",
      location: "Mumbai, India",
      items: [
        { name: "Classic Breakfast", image: breakfastImg },
        { name: "Healthy Lunch", image: lunchImg },
      ],
      total: 28.98,
      status: "Delivered",
    },
    {
      id: "ORD789012",
      date: "March 8, 2025",
      location: "Pune, India",
      items: [
        { name: "Cheese Pizza", image: pizzaImg },
        { name: "French Fries", image: friesImg },
      ],
      total: 18.99,
      status: "Cancelled",
    },
    {
      id: "ORD345678",
      date: "March 5, 2025",
      location: "Delhi, India",
      items: [
        { name: "Burger Meal", image: burgerImg },
        { name: "Cold Coffee", image: coffeeImg },
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
              <div className="order-info">
                <div className="order-header">
                  <img src={order.items[0].image} alt={order.items[0].name} className="order-image" />
                  <div className="order-details">
                    <p className="order-id"><strong>Order ID:</strong> {order.id}</p>
                    <p className="order-date"><strong>Date:</strong> {order.date}</p>
                    <p className="order-location"><strong>Location:</strong> {order.location}</p>
                    <span className={`order-status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="order-footer">
                  <p className="order-total">Total: $ {order.total.toFixed(2)}</p>
                  <button className="view-details-btn">View More Details</button>
                </div>
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
