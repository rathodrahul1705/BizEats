import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Offers from "./pages/Offers";
import FoodList from "./pages/FoodList";
import Cart from "./pages/Cart";
import OrderDetails from "./pages/OrderDetails";
import PaymentOption from "./pages/PaymentOption";
import Profile from "./customer/CusProfile";
import RestHome from "./restaurent/RestHome";
import RestaurantRegistration from "./restaurent/RestaurantRegistration";

// PrivateRoute component to protect routes
function PrivateRoute({ children, user }) {
  return user ? children : <Navigate to="/" />;
}

function App() {
  // Initialize user state from localStorage
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <Router>
      <div className="app-container">
        {/* Header with user and setUser props */}
        <Header user={user} setUser={setUser} />

        {/* Main content area */}
        <main className="content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/food-list" element={<FoodList />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order-details" element={<OrderDetails />} />
            <Route path="/payments" element={<PaymentOption />} />
            <Route
              path="/register-your-restaurent"
              element={<RestHome setUser={setUser} />}
            />

            {/* Protected Routes */}
            <Route
              path="/register-restaurant/:restaurant_id"
              element={
                <PrivateRoute user={user}>
                  <RestaurantRegistration user={user} setUser={setUser} />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute user={user}>
                  <Profile user={user} setUser={setUser} />
                </PrivateRoute>
              }
            />

            {/* Fallback Route for 404 Not Found */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;