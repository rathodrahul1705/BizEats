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

function PrivateRoute({ children, user }) {
  return user ? children : <Navigate to="/" />;
}

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

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
        <Header user={user} setUser={setUser} />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/food-list" element={<FoodList />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order-details" element={<OrderDetails />} />
            <Route path="/payments" element={<PaymentOption />} />

            {/* Protected Profile Route */}
            <Route
              path="/profile"
              element={
                <PrivateRoute user={user}>
                  <Profile user={user} setUser={setUser} />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
