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
import DashboardOverview from "./vendor/DashboardOverview";
import MenuManagement from "./vendor/MenuManagement"

function PrivateRoute({ children, user }) {
  return user ? children : <Navigate to="/" />;
}

function VendorPrivateRoute({ children, user, is_restaurant_register }) {
  if (!user) {
    return <Navigate to="/" />;
  }

  if (!is_restaurant_register) {
    return <Navigate to="/register-your-restaurent" />;
  }

  return children;
}

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [is_restaurant_register, setIsRestaurantRegister] = useState(() => {
    const storedRegistration = localStorage.getItem("is_restaurant_register");
    return storedRegistration ? JSON.parse(storedRegistration) : false;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("is_restaurant_register", JSON.stringify(is_restaurant_register));
  }, [is_restaurant_register]);

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
              element={<RestHome setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />}
            />

            {/* Protected Routes */}
            <Route
              path="/register-restaurant"
              element={
                <PrivateRoute user={user}>
                  <RestaurantRegistration user={user} setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />
                </PrivateRoute>
              }
            />

            <Route
              path="/register-restaurant/:restaurant_id"
              element={
                <PrivateRoute user={user}>
                  <RestaurantRegistration user={user} setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />
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

            {/* Vendor Dashboard Route */}
            <Route
              path="/vendor-dashboard"
              element={
                <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
                  <DashboardOverview user={user} setUser={setUser} />
                </VendorPrivateRoute>
              }
            />

            <Route
              path="/vendor-dashboard/menu/:restaurant_id"
              element={
                <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
                  <MenuManagement user={user} setUser={setUser} />
                </VendorPrivateRoute>
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