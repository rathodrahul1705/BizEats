import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import MenuManagement from "./vendor/MenuManagement";
import OrderManagement from "./vendor/OrderManagement";
import PaymentSuccess from "./payment/PaymentSuccess";
import PaymentFailed from "./payment/PaymentFailed";
import OrderConfirmation from "./payment/OrderConfirmation";
import TrackOrder from "./order/TrackOrder";

// PrivateRoute
function PrivateRoute({ children, user }) {
  return user ? children : <Navigate to="/" />;
}

// Vendor Route
function VendorPrivateRoute({ children, user, is_restaurant_register }) {
  if (!user) return <Navigate to="/" />;
  if (!is_restaurant_register) return <Navigate to="/register-your-restaurent" />;
  return children;
}

// Footer-aware layout
function Layout({ children, user, setUser, is_restaurant_register }) {
  const location = useLocation();
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    setShowFooter(false); // Hide footer initially

    // Wait for DOM to load (wait till the new route transition is done)
    const timer = setTimeout(() => {
      setShowFooter(true); // Show footer once the content is ready
    }, 300); // Adjust this delay as necessary for page content loading

    return () => clearTimeout(timer);
  }, [location]); // Trigger every time the location (route) changes

  return (
    <div className="app-container">
      <Header user={user} setUser={setUser} />
      <main className="content">{children}</main>
      {showFooter && <Footer />} {/* Only show Footer after content is ready */}
    </div>
  );
}

// App component
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
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("is_restaurant_register", JSON.stringify(is_restaurant_register));
  }, [is_restaurant_register]);

  return (
    <Router>
      <Layout user={user} setUser={setUser} is_restaurant_register={is_restaurant_register}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/food-list" element={<FoodList />} />
          <Route path="/cart" element={<Cart user={user} setUser={setUser} />} />
          <Route path="/order-details" element={<OrderDetails />} />
          <Route path="/order-details/:restaurant_id" element={<OrderDetails user={user} setUser={setUser} />} />
          <Route path="/payments/:restaurant_id" element={<PaymentOption user={user} setUser={setUser} />} />
          <Route path="/register-your-restaurent" element={
            <RestHome setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />
          } />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failed" element={<PaymentFailed />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          {/* Protected Routes */}
          <Route path="/register-restaurant" element={
            <PrivateRoute user={user}>
              <RestaurantRegistration user={user} setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />
            </PrivateRoute>
          } />
          <Route path="/register-restaurant/:restaurant_id" element={
            <PrivateRoute user={user}>
              <RestaurantRegistration user={user} setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute user={user}>
              <Profile user={user} setUser={setUser} />
            </PrivateRoute>
          } />
          <Route path="/vendor-dashboard" element={
            <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
              <DashboardOverview user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/menu/:restaurant_id" element={
            <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
              <MenuManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/order/management/:restaurant_id" element={
            <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
              <OrderManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/track-order" element={
            <PrivateRoute user={user}>
              <TrackOrder user={user} setUser={setUser} />
            </PrivateRoute>
          } />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
