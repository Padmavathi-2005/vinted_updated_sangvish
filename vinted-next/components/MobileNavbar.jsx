'use client';

import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FaHome, FaSearch, FaPlus, FaTachometerAlt, FaUser, FaRegCommentDots, FaShoppingBag } from 'react-icons/fa';
import AuthContext from '@/context/AuthContext';
import '@/app/styles/MobileNavbar.css';

const MobileNavbar = () => {
    const { user, mode, setShowLoginModal } = useContext(AuthContext);
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get current tab from URL for active state checking
    const currentTab = searchParams.get('tab');

    const handleSellClick = () => {
        if (!user) {
            setShowLoginModal(true);
        } else {
            router.push('/sell');
        }
    };

    return (
        <div className="mobile-navbar">
            <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
                <FaHome className="nav-icon" />
                <span>{t('header.home_tab')}</span>
            </Link>

            <Link href="/profile?tab=messages" className={`nav-item ${pathname.startsWith('/profile') && currentTab === 'messages' ? 'active' : ''}`}>
                <FaRegCommentDots className="nav-icon" />
                <span>{t('header.chat')}</span>
            </Link>

            <div className="nav-item sell-item" onClick={handleSellClick}>
                <div className="sell-icon-wrapper">
                    <FaPlus className="nav-icon sell-icon" />
                </div>
            </div>

            <Link href={mode === 'seller' ? '/profile?tab=listings' : '/profile?tab=orders'} className={`nav-item ${pathname.startsWith('/profile') && (currentTab === 'listings' || currentTab === 'orders') ? 'active' : ''}`}>
                <FaShoppingBag className="nav-icon" />
                <span>{mode === 'seller' ? t('user_menu.manage_listings') : t('user_menu.my_orders')}</span>
            </Link>

            <Link href="/profile?tab=profile_settings" className={`nav-item ${pathname.startsWith('/profile') && currentTab === 'profile_settings' ? 'active' : ''}`}>
                <FaUser className="nav-icon" />
                <span>{t('header.profile_tab')}</span>
            </Link>
        </div>
    );
};

export default MobileNavbar;
