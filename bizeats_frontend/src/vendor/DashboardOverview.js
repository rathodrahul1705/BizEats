import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../assets/css/vendor/DashboardOverview.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const DashboardOverview = ({ user, setUser }) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    delivered_orders: 0,
    canceled_orders: 0,
    refunded_orders: 0,
    profit: 0,
    current_month_revenue: 0,
    current_month_expense: 0
  });
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [timeRangeFilter, setTimeRangeFilter] = useState("today");
  const [isLoading, setIsLoading] = useState(true);

  const handleRestaurantChange = (event) => {
    const restaurantId = event.target.value;
    const restaurant = restaurantsList.find((r) => r.restaurant_id === restaurantId);
    setSelectedRestaurant(restaurant);
  };

  const handleDateChange = (event) => setDateFilter(event.target.value);
  const handleTimeRangeChange = (event) => setTimeRangeFilter(event.target.value);

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchRestaurants = async () => {
      try {
        setIsLoading(true);
        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.BY_USER(user?.user_id),
          "GET",
          null,
          localStorage.getItem("access")
        );
        if (response?.live_restaurants?.length) {
          setRestaurantsList(response.live_restaurants);
          setSelectedRestaurant(response.live_restaurants[0]);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, [user?.user_id]);

  useEffect(() => {
    if (!selectedRestaurant?.restaurant_id) return;

    const fetchVendorCountDetails = async () => {
      try {
        setIsLoading(true);
        const payload = {
          restaurant_id: selectedRestaurant.restaurant_id,
          date: dateFilter,
          time_range: timeRangeFilter,
        };

        const response = await fetchData(
          API_ENDPOINTS.RESTAURANT.RES_VENDOR_COUNT,
          "POST",
          payload,
          localStorage.getItem("access")
        );

        if (response?.status === "success") {
          setDashboardData({
            ...response.data,
            // Include monthly data if available in response
            current_month_revenue: response.data.current_month_revenue || 0,
            current_month_expense: response.data.current_month_expense || 0
          });
        }
      } catch (error) {
        console.error("Error fetching vendor count details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorCountDetails();
  }, [selectedRestaurant?.restaurant_id, dateFilter, timeRangeFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₹', '₹ ');
  };

  // Card data organized into logical groups
  const cardGroups = [
    {
      title: "Orders Overview",
      cards: [
        { 
          title: "Total Orders", 
          value: dashboardData.total_orders,
          badge: "Today",
          icon: "📦"
        },
        { 
          title: "Pending Orders", 
          value: dashboardData.pending_orders,
          badge: "Active",
          icon: "⏳"
        },
        { 
          title: "Delivered Orders", 
          value: dashboardData.delivered_orders,
          badge: "Completed",
          icon: "✅"
        }
      ]
    },
    {
      title: "Financial Overview",
      cards: [
        { 
          title: "Total Revenue", 
          value: formatCurrency(dashboardData.total_revenue),
          badge: "All Time",
          icon: "💰"
        },
        { 
          title: "Total Expense", 
          value: formatCurrency(dashboardData.expense),
          badge: "All Time",
          icon: "💰"
        },
        { 
          title: "Profit/Burn", 
          value: formatCurrency(dashboardData.profit),
          badge: "All Time",
          icon: dashboardData.profit >= 0 ? "📈" : "📉",
          isProfit: dashboardData.profit >= 0
        },
        { 
          title: "Avg. Order Value", 
          value: dashboardData.total_orders > 0 
            ? formatCurrency(dashboardData.total_revenue / dashboardData.total_orders)
            : formatCurrency(0),
          badge: "Today",
          icon: "🧮"
        }
      ]
    },
    {
      title: "Order Status",
      cards: [
        { 
          title: "Canceled Orders", 
          value: dashboardData.canceled_orders,
          badge: "Issues",
          icon: "❌"
        },
        { 
          title: "Refunded Orders", 
          value: dashboardData.refunded_orders,
          badge: "Issues",
          icon: "🔄"
        },
        { 
          title: "Completion Rate", 
          value: dashboardData.total_orders > 0 
            ? `${Math.round((dashboardData.delivered_orders / dashboardData.total_orders) * 100)}%`
            : "0%",
          badge: "Efficiency",
          icon: "🎯"
        }
      ]
    }
  ];

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-overview">
        <div className="header-section">
          <div className="header-content">
            <h2>Dashboard Overview</h2>
            <p className="subtitle">Monitor your restaurant's performance</p>
          </div>
          <div className="dropdown-wrapper">
            <label>Restaurant</label>
            <select 
              value={selectedRestaurant?.restaurant_id || ""} 
              onChange={handleRestaurantChange}
              disabled={isLoading}
            >
              {restaurantsList.map((restaurant) => (
                <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                  {restaurant.restaurant_name} ({restaurant.location?.area_sector_locality}, {restaurant.location?.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters">
          <div className="filter-item">
            <label>Date</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={handleDateChange}
              disabled={isLoading}
            />
          </div>
          <div className="filter-item">
            <label>Time Range</label>
            <select
              value={timeRangeFilter}
              onChange={handleTimeRangeChange}
              disabled={isLoading}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

                {/* Monthly Summary Section - Added this new section */}
        <div className="monthly-summary">
          <div className="summary-card revenue">
            <div className="summary-content">
              <h3>Monthly Revenue</h3>
              <p className="amount">{formatCurrency(dashboardData.current_month_revenue)}</p>
              <p className="period">Current Month</p>
            </div>
            <div className="summary-icon">💰</div>
          </div>
          <div className="summary-card expense">
            <div className="summary-content">
              <h3>Monthly Expense</h3>
              <p className="amount">{formatCurrency(dashboardData.current_month_expense)}</p>
              <p className="period">Current Month</p>
            </div>
            <div className="summary-icon">📉</div>
          </div>
          <div className={`summary-card ${dashboardData.current_month_revenue - dashboardData.current_month_expense >= 0 ? 'profit' : 'loss'}`}>
            <div className="summary-content">
              <h3>Monthly {dashboardData.current_month_revenue - dashboardData.current_month_expense >= 0 ? 'Profit' : 'Loss'}</h3>
              <p className="amount">
                {formatCurrency(Math.abs(dashboardData.current_month_revenue - dashboardData.current_month_expense))}
              </p>
              <p className="period">Current Month</p>
            </div>
            <div className="summary-icon">
              {dashboardData.current_month_revenue - dashboardData.current_month_expense >= 0 ? '📈' : '📉'}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <div className="dashboard-content">
            {/* Card Groups */}
            {cardGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="card-group">
                <h3 className="group-title">{group.title}</h3>
                <div className="cards-container">
                  {group.cards.map((card, cardIndex) => (
                    <div 
                      key={cardIndex} 
                      className={`card ${card.isProfit !== undefined ? (card.isProfit ? 'positive' : 'negative') : ''}`}
                    >
                      <div className="card-header">
                        <span className="card-icon">{card.icon}</span>
                        <span className="card-badge">{card.badge}</span>
                      </div>
                      <div className="card-body">
                        <h4>{card.title}</h4>
                        <p>{card.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick Links */}
            {selectedRestaurant && (
              <div className="quick-links">
                <h3>Quick Actions</h3>
                <p className="subtitle">Manage your restaurant operations</p>
                <div className="links-grid">
                  <Link 
                    to={`/vendor-dashboard/menu/${selectedRestaurant.restaurant_id}`} 
                    className="link-card"
                  >
                    <div className="link-icon">🍽️</div>
                    <div className="link-content">
                      <h4>Menu Management</h4>
                      <p>Update your restaurant menu items</p>
                    </div>
                    <div className="link-arrow">→</div>
                  </Link>
                  <Link 
                    to={`/vendor-dashboard/order/management/${selectedRestaurant.restaurant_id}`} 
                    className="link-card"
                  >
                    <div className="link-icon">📋</div>
                    <div className="link-content">
                      <h4>Order Management</h4>
                      <p>View and process customer orders</p>
                    </div>
                    <div className="link-arrow">→</div>
                  </Link>
                  <Link 
                    to={`/register-your-restaurent`} 
                    className="link-card"
                  >
                    <div className="link-icon">⚙️</div>
                    <div className="link-content">
                      <h4>Restaurant Settings</h4>
                      <p>Manage your restaurant details</p>
                    </div>
                    <div className="link-arrow">→</div>
                  </Link>
                  <Link 
                    to={`/vendor-dashboard/coupon/management/${selectedRestaurant.restaurant_id}`} 
                    className="link-card"
                  >
                    <div className="link-icon">🏷️</div>
                    <div className="link-content">
                      <h4>Coupon Management</h4>
                      <p>Manage your coupon details</p>
                    </div>
                    <div className="link-arrow">→</div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;