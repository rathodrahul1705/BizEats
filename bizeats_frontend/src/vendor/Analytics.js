import React from "react";
import { Line, Bar } from "react-chartjs-2";
import "../assets/css/vendor/index.css";

const Analytics = () => {
  const salesData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Sales",
        data: [500, 800, 1200, 900, 1500, 2000],
        borderColor: "#3b82f6",
        fill: false,
      },
    ],
  };

  const bestSellingData = {
    labels: ["Burger", "Pizza", "Fries", "Soda"],
    datasets: [
      {
        label: "Sales",
        data: [120, 90, 70, 50],
        backgroundColor: "#3b82f6",
      },
    ],
  };

  return (
    <div className="vendor-analytics">
      <h2>Analytics & Insights</h2>
      <div className="vendor-charts">
        <div className="vendor-card">
          <h3>Sales Trends</h3>
          <Line data={salesData} />
        </div>
        <div className="vendor-card">
          <h3>Best Selling Items</h3>
          <Bar data={bestSellingData} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;