'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNavbar from '@/components/MobileNavbar';
import CookieConsent from '@/components/common/CookieConsent';
import ScrollToTop from '@/components/common/ScrollToTop';
import { useSettings } from '@/context/SettingsContext';

import Maintenance from '@/components/common/Maintenance';
import GlobalLoginModal from '@/components/common/GlobalLoginModal';
import AuthContext from '@/context/AuthContext';
import { useContext } from 'react';

const LayoutWrapper = ({ children }) => {
  const { settings } = useSettings();
  const { showLoginModal, setShowLoginModal } = useContext(AuthContext);
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Loading state (syncing with original App.jsx logic)
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

  // Maintenance mode
  if (settings?.maintenance_mode && !isAdminRoute) {
    return <Maintenance />;
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
      <GlobalLoginModal 
        show={showLoginModal} 
        onHide={() => setShowLoginModal(false)} 
      />
    </div>
  );
};

export default LayoutWrapper;
