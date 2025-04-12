// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from './location/LocationService';
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
import LocationRestriction from './location/LocationRestriction';
import LoadingScreen from './location/LoadingScreen';

const PrivateRoute = ({ children, user }) => user ? children : <Navigate to="/" />;

const VendorPrivateRoute = ({ children, user, is_restaurant_register }) => {
  if (!user) return <Navigate to="/" />;
  if (!is_restaurant_register) return <Navigate to="/register-your-restaurent" />;
  return children;
};

const LocationCheckRoute = ({ children, isAllowed }) => isAllowed ? children : <LocationRestriction />;

const App = () => {
  const { isAllowed, error, city, checkLocation } = useLocation();
  const [user, setUser] = React.useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [is_restaurant_register, setIsRestaurantRegister] = React.useState(
    () => JSON.parse(localStorage.getItem('is_restaurant_register')) || false
  );

  React.useEffect(() => {
    user 
      ? localStorage.setItem('user', JSON.stringify(user)) 
      : localStorage.removeItem('user');
  }, [user]);

  if (isAllowed === null) return <LoadingScreen message="Checking your location..." />;

  const renderWithLocation = (Component, props = {}) => (
    <LocationCheckRoute isAllowed={isAllowed}>
      <Component {...props} currentCity={city} />
    </LocationCheckRoute>
  );

  const renderPrivateWithLocation = (Component, props = {}) => (
    <PrivateRoute user={user}>
      <LocationCheckRoute isAllowed={isAllowed}>
        <Component {...props} user={user} setUser={setUser} currentCity={city} />
      </LocationCheckRoute>
    </PrivateRoute>
  );

  return (
    <Router>
      <div className="app-container">
        <Header 
          user={user} 
          setUser={setUser} 
          currentCity={city}
          onLocationRetry={checkLocation}
        />

        <main className="content">
          <Routes>
            <Route path="/" element={<Home currentCity={city} />} />
            <Route path="/location-restricted" element={
              <LocationRestriction error={error} onRetry={checkLocation} />
            } />

            {/* Location-restricted routes */}
            <Route path="/offers" element={renderWithLocation(Offers)} />
            <Route path="/food-list" element={renderWithLocation(FoodList)} />
            <Route path="/cart" element={renderWithLocation(Cart, { user, setUser })} />
            <Route path="/order-details" element={renderWithLocation(OrderDetails)} />
            <Route path="/order-details/:restaurant_id" element={renderWithLocation(OrderDetails, { user, setUser })} />
            <Route path="/payments/:restaurant_id" element={renderWithLocation(PaymentOption, { user, setUser })} />
            <Route path="/register-your-restaurent" element={renderWithLocation(RestHome, { setUser, setIsRestaurantRegister })} />
            <Route path="/payment/success" element={renderWithLocation(PaymentSuccess)} />
            <Route path="/payment/failed" element={renderWithLocation(PaymentFailed)} />
            <Route path="/order-confirmation" element={renderWithLocation(OrderConfirmation)} />

            {/* Private + location-restricted routes */}
            <Route path="/track-order" element={renderPrivateWithLocation(TrackOrder)} />
            <Route path="/profile" element={renderPrivateWithLocation(Profile)} />

            {/* Vendor routes */}
            <Route path="/register-restaurant" element={
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
                <LocationCheckRoute isAllowed={isAllowed}>
                  <DashboardOverview 
                    user={user} 
                    setUser={setUser} 
                    currentCity={city} 
                  />
                </LocationCheckRoute>
              </VendorPrivateRoute>
            } />

            <Route path="/vendor-dashboard/menu/:restaurant_id" element={
              <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
                <LocationCheckRoute isAllowed={isAllowed}>
                  <MenuManagement 
                    user={user} 
                    setUser={setUser} 
                    currentCity={city} 
                  />
                </LocationCheckRoute>
              </VendorPrivateRoute>
            } />

            <Route path="/vendor-dashboard/order/management/:restaurant_id" element={
              <VendorPrivateRoute user={user} is_restaurant_register={is_restaurant_register}>
                <LocationCheckRoute isAllowed={isAllowed}>
                  <OrderManagement 
                    user={user} 
                    setUser={setUser} 
                    currentCity={city} 
                  />
                </LocationCheckRoute>
              </VendorPrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer currentCity={city} />
      </div>
    </Router>
  );
};

export default App;