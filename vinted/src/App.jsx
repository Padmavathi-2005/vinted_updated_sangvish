import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import SellItem from './pages/SellItem';
import ItemDetail from './pages/ItemDetail';
import SellerProfile from './pages/SellerProfile';
import Notifications from './pages/Notifications';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import NotFound from './pages/NotFound';
import DynamicPage from './pages/DynamicPage';
import ForgotPassword from './pages/ForgotPassword';
import CategoriesPage from './pages/CategoriesPage';
import CategoryPage from './pages/CategoryPage';
import SubcategoryItemsPage from './pages/SubcategoryItemsPage';
import Maintenance from './pages/Maintenance';
import Contact from './pages/Contact';
import { useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsent from './components/common/CookieConsent';
import MobileNavbar from './components/MobileNavbar';

// Layout wrapper to conditionally show Header/Footer
const Layout = ({ children }) => {
  const { settings } = useSettings();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // If maintenance mode is ON and we're not explicitly trying to access admin
  if (settings?.maintenance_mode) {
    return <Maintenance />;
  }

  // If initial settings are still loading and we have no cached site name
  // Show a clean loading state instead of flickering "Marketplace"
  console.log('[DEBUG] Layout Loading Check:', { loading: settings?.loading, site_name: settings?.site_name });
  if (settings?.loading && !settings?.site_name) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-white">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem', color: settings.primary_color || '#0ea5e9' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <div style={{ color: '#64748b', fontWeight: '500' }}>Starting services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      <main className="app-main">
        {children}
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <MobileNavbar />}
      {!isAdminRoute && <CookieConsent />}
    </div>
  );
};

const App = () => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <CurrencyProvider>
              <LanguageProvider>
                <NotificationProvider>
                  <Router>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/sell" element={<SellItem />} />
                        <Route path="/items/:id" element={<ItemDetail />} />
                        <Route path="/seller/:id" element={<SellerProfile />} />
                        <Route path="/profile/:id" element={<SellerProfile />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/categories/:slug" element={<CategoryPage />} />
                        <Route path="/categories/:slug/:subSlug" element={<Products />} />
                        <Route path="/pages/:slug" element={<DynamicPage />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Layout>
                  </Router>
                </NotificationProvider>
              </LanguageProvider>
            </CurrencyProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

export default App;
