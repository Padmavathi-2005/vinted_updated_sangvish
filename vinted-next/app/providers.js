'use client';

import React from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { NotificationProvider } from '@/context/NotificationContext';

export function Providers({ children }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <CurrencyProvider>
              <LanguageProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </LanguageProvider>
            </CurrencyProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
