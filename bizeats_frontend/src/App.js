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
import OrderManagement from './vendor/OrderManagement';
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

const PrivateRoute = ({ children, user }) => user ? children : <Navigate to="/" />;

const VendorPrivateRoute = ({ children, user, is_restaurant_register }) => {
  if (!user) return <Navigate to="/" />;
  if (!is_restaurant_register) return <Navigate to="/register-your-restaurent" />;
  return children;
};

const LocationGuard = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = React.useState({ allowed: null, errorMessage: null });

  React.useEffect(() => {
    const unrestrictedRoutes = [
      '/',
      '/about-us',
      '/contact-us',
      '/privacy-policy',
      '/terms-and-conditions',
      '/cancellation-refund-policy',
      '/pricing',
      '/check-location'
    ];

    if (unrestrictedRoutes.includes(location.pathname)) {
      setStatus({ allowed: true, errorMessage: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const isAllowed = checkCityLocation(latitude, longitude);
        if (isAllowed) {
          setStatus({ allowed: true, errorMessage: null });
        } else {
          setStatus({
            allowed: false,
            errorMessage: "Our services are currently only available in Thane Maharashtra. It seems you're accessing from outside our service area."
          });
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setStatus({
          allowed: false,
          errorMessage: "We couldn't access your location. Please enable location services on your device and try again."
        });
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  }, [location.pathname]);

  if (status.allowed === false) {
    return <LocationChecker message={status.errorMessage} />;
  }

  return status.allowed ? children : <div></div>;
};


const checkCityLocation = (lat, lng) => {
  const cityBounds = {
    thane: {
      north: 19.4,
      south: 19.1,
      west: 72.9,
      east: 73.2
    }
  };

  for (const city in cityBounds) {
    const bounds = cityBounds[city];
    if (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    ) {
      return true;
    }
  }

  return false;
};

const App = () => {
  const [user, setUser] = React.useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [is_restaurant_register, setIsRestaurantRegister] = React.useState(
    () => JSON.parse(localStorage.getItem('is_restaurant_register')) || false
  );

  React.useEffect(() => {
    user 
      ? localStorage.setItem('user', JSON.stringify(user)) 
      : localStorage.removeItem('user');
  }, [user]);

  return (
    <Router>
      <ScrollToTop />
      <div className="app-container">
        <Header user={user} setUser={setUser} />

        <main className="content">
          <LocationGuard>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact-us" element={<ContactUs />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/cancellation-refund-policy" element={<CancellationPolicy />} />
              <Route path="/pricing" element={<Pricing />} />

              <Route path="/offers" element={<Offers />} />
              <Route path="/food-list" element={<FoodList />} />
              <Route path="/cart" element={<Cart user={user} setUser={setUser} />} />
              <Route path="/order-details" element={<OrderDetails />} />
              <Route path="/order-details/:restaurant_id" element={<OrderDetails user={user} setUser={setUser} />} />
              <Route path="/payments/:restaurant_id" element={<PaymentOption user={user} setUser={setUser} />} />
              <Route path="/register-your-restaurent" element={<RestHome setUser={setUser} setIsRestaurantRegister={setIsRestaurantRegister} />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failed" element={<PaymentFailed />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/check-location" element={<LocationChecker />} />

              {/* Private Routes */}
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
                    setIsRestaurantRegister={setIsRestaurantRegister} 
                  />
                </PrivateRoute>
              } />
              <Route path="/register-restaurant/:restaurant_id" element={
                <PrivateRoute user={user}>
                  <RestaurantRegistration 
                    user={user} 
                    setUser={setUser} 
                    setIsRestaurantRegister={setIsRestaurantRegister} 
                  />
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

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </LocationGuard>
        </main>

        <StickyTrackOrder user={user} />
        <Footer />
      </div>
    </Router>
  );
};

export default App;
