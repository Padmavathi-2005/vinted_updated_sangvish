import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios, { imageBaseURL } from '../utils/axios';
import {
    FaTachometerAlt,
    FaUsers,
    FaUser,
    FaShoppingBag,
    FaBoxOpen,
    FaCog,
    FaChartBar,
    FaTags,
    FaBars,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaCogs,
    FaAngleDown,
    FaAngleRight,
    FaGlobe,
    FaMoneyBillWave,
    FaWallet,
    FaFileAlt,
    FaLanguage,
    FaEnvelope,
    FaBell,
    FaUniversity,
    FaTruck,
    FaRegFlag,
    FaDatabase,
    FaTrashAlt,
    FaShieldAlt
} from 'react-icons/fa';
import { getAdminInfo } from '../utils/auth';
import { useSettings } from '../context/SettingsContext';
import { useLocalization } from '../context/LocalizationContext';
import { getImageUrl } from '../utils/constants';
import '../styles/AdminSidebar.css';

const AdminSidebar = ({ isCollapsed, setIsCollapsed }) => {
    const { t } = useLocalization();
    const location = useLocation();
    const admin = getAdminInfo();
    const isMobile = window.innerWidth < 992;

    const { settingTypes, siteName, siteLogo } = useSettings();

    // State for expanded submenus
    const [expandedMenus, setExpandedMenus] = useState({
        settings: true // Default expanded
    });

    const menuItems = [
        { path: '/dashboard', icon: <FaTachometerAlt />, label: t('sidebar.dashboard') },
        { path: '/notifications', icon: <FaBell />, label: t('sidebar.notifications') },
        { path: '/messages', icon: <FaEnvelope />, label: t('sidebar.messages') },
        { path: '/users', icon: <FaUsers />, label: t('sidebar.users') },
        { path: '/listings', icon: <FaShoppingBag />, label: t('sidebar.listings') },
        { path: '/orders', icon: <FaBoxOpen />, label: t('sidebar.orders') },
        { path: '/shipping-companies', icon: <FaTruck />, label: 'Shipping Companies' },
        {
            id: 'wallet',
            path: '/wallet',
            icon: <FaWallet />,
            label: t('sidebar.wallet.title'),
            subItems: [
                { path: '/wallet/withdrawal-requests', label: t('sidebar.wallet.withdrawal_requests'), icon: <FaMoneyBillWave size={12} /> },
                { path: '/wallet/transactions', label: t('sidebar.wallet.transactions'), icon: <FaWallet size={12} /> },
                { path: '/wallet/payout-methods', label: t('sidebar.wallet.payout_methods') || 'User Payout Methods', icon: <FaUniversity size={12} /> }
            ]
        },
        { path: '/categories/main', icon: <FaTags />, label: t('sidebar.categories.title') },
        { path: '/newsletter', icon: <FaEnvelope />, label: t('sidebar.newsletter') },
        { path: '/pages', icon: <FaFileAlt />, label: t('sidebar.static_pages') },
        { path: '/product-reports', icon: <FaRegFlag />, label: 'Product Reports' },
        { path: '/contact-inquiries', icon: <FaEnvelope />, label: 'Contact Inquiries' },
        { path: '/reports', icon: <FaChartBar />, label: t('sidebar.reports') },
        {
            id: 'settings',
            path: '/settings',
            icon: <FaCog />,
            label: t('sidebar.settings.title'),
            subItems: [
                ...(Array.isArray(settingTypes) ? settingTypes : [])
                    .filter(type => type !== 'site_settings')
                    .map(type => {
                        const labelKey = `sidebar.settings.${type}`;
                        const translatedLabel = t(labelKey);

                        return {
                            path: `/settings/${type}`,
                            label: translatedLabel === labelKey
                                ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                : translatedLabel,
                            icon: <FaCogs size={12} />
                        };
                    }),
                { path: '/frontend/content', label: t('sidebar.frontend_content'), icon: <FaLanguage size={12} /> },
            ]
        },
        { path: '/settings/languages', label: t('sidebar.settings.languages'), icon: <FaGlobe /> },
        { path: '/settings/currencies', label: t('sidebar.settings.currencies'), icon: <FaMoneyBillWave /> },
        {
            id: 'system',
            path: '/system',
            icon: <FaShieldAlt />,
            label: 'System Maintenance',
            subItems: [
                { path: '/system/reset-data', label: 'Delete Content', icon: <FaTrashAlt size={12} /> },
                { path: '/system/backups', label: 'Backups', icon: <FaDatabase size={12} /> },
            ]
        },
    ];

    // Auto-expand and smooth scroll to active item
    useEffect(() => {
        // Find which menu item is active
        const activeItem = menuItems.find(item => {
            if (item.subItems) {
                return item.subItems.some(sub => location.pathname === sub.path);
            }
            return location.pathname === item.path;
        });

        if (activeItem && activeItem.subItems) {
            setExpandedMenus(prev => ({ ...prev, [activeItem.id]: true }));
        }

        // Smooth scroll to active element
        setTimeout(() => {
            const activeLink = document.querySelector('.nav-link.active') || document.querySelector('.nav-link.active-parent');
            if (activeLink) {
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }, [location.pathname, settingTypes]);

    useEffect(() => {
        const handleResize = () => {
            const isMobileView = window.innerWidth < 992;
            if (isMobileView) {
                setIsCollapsed(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        const newCollapsedState = !isCollapsed;
        setIsCollapsed(newCollapsedState);
        if (window.innerWidth >= 992) {
            localStorage.setItem('sidebarCollapsed', newCollapsedState.toString());
        }
    };

    const toggleSubMenu = (menuId) => {
        if (isCollapsed) return; // Don't toggle in fully collapsed mode
        setExpandedMenus(prev => {
            if (prev[menuId]) {
                return {}; // Close if it's already open
            }
            return { [menuId]: true }; // Open new one, close all others
        });
    };

    const trulyCollapsed = isCollapsed;

    return (
        <>
            {isMobile && !isCollapsed && (
                <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            )}

            <aside
                className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => { if (isCollapsed) toggleSidebar(); }}
                style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
            >
                <div className="sidebar-header">
                    {!isCollapsed && (
                        <div className="sidebar-logo">
                            {siteLogo ? (
                                <img src={getImageUrl(siteLogo)} alt="Site Logo" className="logo-img" />
                            ) : (
                                <>
                                    <div className="logo-icon"><span>{(siteName || 'A').charAt(0)}</span></div>
                                    <span className="logo-text">{siteName || 'Admin Panel'}</span>
                                </>
                            )}
                        </div>
                    )}
                    <button
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleSidebar(); }}
                        title={isCollapsed ? "Expand" : "Collapse"}
                    >
                        {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => {
                        if (item.subItems) {
                            const isExpanded = expandedMenus[item.id];
                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <div key={item.id} className="nav-group">
                                    <div
                                        className={`nav-link ${isActive ? 'active-parent' : ''} ${trulyCollapsed ? 'collapsed-link' : ''}`}
                                        onClick={() => !trulyCollapsed && toggleSubMenu(item.id)}
                                        title={trulyCollapsed ? item.label : ''}
                                        style={{ cursor: 'pointer', justifyContent: trulyCollapsed ? 'center' : 'space-between' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span className="nav-icon">{item.icon}</span>
                                            {!trulyCollapsed && <span className="nav-label">{item.label}</span>}
                                        </div>
                                        {!trulyCollapsed && (
                                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                {isExpanded ? <FaAngleDown /> : <FaAngleRight />}
                                            </span>
                                        )}
                                    </div>

                                    {/* Submenu */}
                                    {!trulyCollapsed && (
                                        <div className={`sub-menu-wrapper ${isExpanded ? 'expanded' : ''}`}>
                                            <div className="sub-menu-inner">
                                                <div className="sub-menu">
                                                    {item.subItems.map(subItem => (
                                                        <Link
                                                            key={subItem.path}
                                                            to={subItem.path}
                                                            className={`nav-link sub-link ${location.pathname === subItem.path ? 'active' : ''}`}
                                                            onClick={() => isMobile && setIsCollapsed(true)}
                                                            title={subItem.label}
                                                        >
                                                            <span className="nav-icon" style={{ fontSize: '0.9rem', opacity: 0.5, fontWeight: 'bold' }}>
                                                                -
                                                            </span>
                                                            <span className="nav-label" style={{
                                                                fontSize: '0.82rem',
                                                                display: 'block'
                                                            }}>{subItem.label}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={() => isMobile && setIsCollapsed(true)}
                                title={trulyCollapsed ? item.label : ''}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!trulyCollapsed && <span className="nav-label">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>


            </aside>
        </>
    );
};

export default AdminSidebar;
