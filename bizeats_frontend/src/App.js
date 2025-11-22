import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Offers from './pages/Offers';
import FoodList from './pages/FoodList';
import Cart from './pages/Cart';
import OrderDetails from './pages/OrderDetails';
import PaymentOption from './pages/PaymentOption';
import Profile from './customer/CusProfile';
import RestHome from './restaurent/RestHome';
import RestaurantRegistration from './restaurent/RestaurantRegistration';
import DashboardOverview from './vendor/DashboardOverview';
import MenuManagement from './vendor/MenuManagement';
import CustomerManagement from './vendor/CustomerManagement';
import CartManagement from './vendor/CartManagement';
import RestaurantManagement from './vendor/RestaurantManagement';
import OrderManagement from './vendor/OrderManagement';
import CouponManagement from './vendor/CouponManagement';
import Notifications from './vendor/Notifications';
import PaymentSuccess from './payment/PaymentSuccess';
import PaymentFailed from './payment/PaymentFailed';
import OrderConfirmation from './payment/OrderConfirmation';
import TrackOrder from './order/TrackOrder';
import AboutUs from "./components/links/AboutUs";
import ContactUs from "./components/links/ContactUs";
import PrivacyPolicy from "./components/links/PrivacyPolicy";
import TermsAndConditions from "./components/links/TermsAndConditions";
import CancellationPolicy from "./components/links/CancellationPolicy";
import Pricing from "./components/links/Pricing";
import ScrollToTop from "./components/ScrollToTop";
import StickyTrackOrder from '../src/order/StickyTrackOrder';
import LocationChecker from '../src/location/LocationRestriction';

// Private Route Components with improved validation
const PrivateRoute = ({ children, user }) => {
  const isAuthenticated = React.useMemo(() => {
    try {
      return !!user || !!JSON.parse(localStorage.getItem('user'));
    } catch {
      return false;
    }
  }, [user]);

  return isAuthenticated ? children : <Navigate to="/" />;
};

const VendorPrivateRoute = ({ children, user }) => {
  const [isReady, setIsReady] = React.useState(false);
  const [isRegistered, setIsRegistered] = React.useState(false);

  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedRegistration = localStorage.getItem('is_restaurant_register');
      
      setIsRegistered(storedRegistration ? JSON.parse(storedRegistration) : false);
      setIsReady(true);
    } catch (error) {
      console.error("Error checking registration status:", error);
      setIsReady(true);
    }
  }, []);

  if (!isReady) return null; // or loading spinner

  const isAuthenticated = !!user || !!JSON.parse(localStorage.getItem('user'));
  if (!isAuthenticated) return <Navigate to="/" />;
  if (!isRegistered) return <Navigate to="/register-your-homechef" />;
  
  return children;
};

// Main App Component with robust state management
const App = () => {
  const [user, setUser] = React.useState(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize state from localStorage
  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to initialize user state:", error);
    }
    setIsInitialized(true);
  }, []);

  // Sync user to localStorage
  React.useEffect(() => {
    if (!isInitialized) return;
    
    try {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error("Failed to sync user to localStorage:", error);
    }
  }, [user, isInitialized]);

  const location = useLocation();

  if (!isInitialized) {
    return <div>Loading...</div>; // Or your custom loading component
  }

  return (
    <div className="app-container">
      <Header user={user} setUser={setUser} />
      
      <main className="content">
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/cancellation-refund-policy" element={<CancellationPolicy />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/home-kitchens" element={<FoodList user={user} />} />
          <Route path="/cart" element={<Cart user={user} setUser={setUser} />} />
          <Route path="/payments/:restaurant_id" element={<PaymentOption user={user} setUser={setUser} />} />
          <Route path="/register-your-homechef" element={<RestHome setUser={setUser} />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/failed" element={<PaymentFailed />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/check-location" element={<LocationChecker />} />
          <Route path="/city/:city/:slug/:restaurant_id" element={<OrderDetails user={user} setUser={setUser} />} />
          <Route path="/city/:city/:slug/:restaurant_id/:offer" element={<OrderDetails user={user} setUser={setUser} />} />

          {/* Customer Private Routes */}
          <Route path="/track-order" element={
            <PrivateRoute user={user}>
              <TrackOrder user={user} setUser={setUser} />
            </PrivateRoute>
          } />
          <Route path="/track-order/:order_number" element={
            <PrivateRoute user={user}>
              <TrackOrder user={user} setUser={setUser} />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute user={user}>
              <Profile user={user} setUser={setUser} />
            </PrivateRoute>
          } />

          {/* Vendor Routes */}
          <Route path="/register-restaurant" element={
            <PrivateRoute user={user}>
              <RestaurantRegistration 
                user={user} 
                setUser={setUser} 
              />
            </PrivateRoute>
          } />
          <Route path="/register-restaurant/:restaurant_id" element={
            <PrivateRoute user={user}>
              <RestaurantRegistration 
                user={user} 
                setUser={setUser} 
              />
            </PrivateRoute>
          } />
          
          {/* Vendor Private Routes */}
          <Route path="/vendor-dashboard" element={
            <VendorPrivateRoute user={user}>
              <DashboardOverview user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/menu/:restaurant_id" element={
            <VendorPrivateRoute user={user}>
              <MenuManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/customer" element={
            <VendorPrivateRoute user={user}>
              <CustomerManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/cart/management" element={
            <VendorPrivateRoute user={user}>
              <CartManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/restaurant" element={
            <VendorPrivateRoute user={user}>
              <RestaurantManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/order/management/:restaurant_id" element={
            <VendorPrivateRoute user={user}>
              <OrderManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />
          <Route path="/vendor-dashboard/coupon/management/:restaurant_id" element={
            <VendorPrivateRoute user={user}>
              <CouponManagement user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />

          <Route path="/vendor-dashboard/notification/management" element={
            <VendorPrivateRoute user={user}>
              <Notifications user={user} setUser={setUser} />
            </VendorPrivateRoute>
          } />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
        
      {(location.pathname === '/' || location.pathname === '/home-kitchens') && <StickyTrackOrder user={user} setUser={setUser} />}
      {/* <Footer /> */}
      {(location.pathname === '/' || location.pathname === '/about-us' || location.pathname === '/contact-us' || location.pathname === '/privacy-policy' || location.pathname === '/terms-and-conditions' || location.pathname === '/cancellation-refund-policy') && <Footer />}
    </div>
  );
};

// Wrap App with Router
const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;