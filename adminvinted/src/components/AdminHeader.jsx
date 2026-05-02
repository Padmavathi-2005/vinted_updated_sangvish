import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaBars, FaSearch, FaBell, FaEnvelope, FaUser, FaSignOutAlt,
    FaGlobe, FaCoins, FaChevronDown, FaCog
} from 'react-icons/fa';
import axios from '../utils/axios';
import { useLocalization } from '../context/LocalizationContext.jsx';
import { safeString } from '../utils/constants';
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const localization = useLocalization();

    const {
        language = 'en',
        currency = 'USD',
        availableLanguages = [],
        availableCurrencies = [],
        changeLanguage = () => { },
        changeCurrency = () => { },
        t = (path) => path
    } = localization || {};

    const [admin, setAdmin] = useState(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [latestNotifications, setLatestNotifications] = useState([]);
    const [latestMessages, setLatestMessages] = useState([]);
    const [langSearch, setLangSearch] = useState('');
    const [currSearch, setCurrSearch] = useState('');

    useEffect(() => {
        const fetchHeaderData = async () => {
            try {
                const verifyResp = await axios.get('/api/admin/verify');
                if (verifyResp.data && verifyResp.data.admin) {
                    setAdmin(verifyResp.data.admin);
                }

                try {
                    const notifCountResp = await axios.get('/api/admin/notifications/count');
                    setNotificationCount(notifCountResp.data.count || 0);
                } catch (e) {
                    setNotificationCount(0);
                }

                try {
                    const notifsResp = await axios.get('/api/admin/notifications?limit=5');
                    setLatestNotifications(notifsResp.data || []);
                } catch (e) {
                    setLatestNotifications([]);
                }

                // Fetch real message count
                try {
                    const msgCountResp = await axios.get('/api/admin-messages/count');
                    setMessageCount(msgCountResp.data.count || 0);

                    const conversationsResp = await axios.get('/api/admin-messages/conversations');
                    // Format for dropdown display
                    const latestConvs = conversationsResp.data.slice(0, 3).map(conv => {
                        const otherParticipant = conv.participants.find(p => {
                            const pId = p.user?._id || p.user;
                            return pId?.toString() !== (verifyResp.data.admin._id || '').toString();
                        });
                        return {
                            id: conv._id,
                            sender: safeString(otherParticipant?.user?.username || otherParticipant?.user?.name) || 'User',
                            subject: safeString(conv.last_message),
                            time: conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
                            read: false // Simplified
                        };
                    });
                    setLatestMessages(latestConvs);
                } catch (e) {
                    setMessageCount(0);
                }
            } catch (error) {
                console.error('Header data fetch error:', error);
            }
        };

        fetchHeaderData();
        const interval = setInterval(fetchHeaderData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('admin');
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('admin');
        navigate('/login');
    };

    const handleLanguageChange = (code) => {
        changeLanguage(code);
        setLangSearch('');
    };

    const mapLink = (link) => {
        if (!link) return '/notifications';
        if (link.includes('/profile?tab=orders')) return '/orders';
        if (link.includes('/profile?tab=messages')) return '/messages';
        if (link.includes('/profile?tab=listings')) return '/listings';
        // If it's a relative link that doesn't exist in admin, default to /notifications
        const adminRoutes = ['/dashboard', '/users', '/listings', '/orders', '/wallet', '/categories', '/settings', '/notifications', '/messages', '/reports'];
        if (link.startsWith('/') && !adminRoutes.some(route => link.startsWith(route))) {
            return '/notifications';
        }
        return link;
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.put('/api/admin/notifications/read-all');
            setNotificationCount(0);
            setLatestNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleNotificationClick = async (notif) => {
        try {
            if (!notif.is_read) {
                await axios.put(`/api/admin/notifications/${notif._id}/read`);
                setNotificationCount(prev => Math.max(0, prev - 1));
                setLatestNotifications(prev => prev.map(n =>
                    n._id === notif._id ? { ...n, is_read: true } : n
                ));
            }
            navigate(mapLink(notif.link));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            navigate(mapLink(notif.link));
        }
    };

    const sortedLanguages = (() => {
        const filtered = availableLanguages.filter(l =>
            (l.name || '').toLowerCase().includes(langSearch.toLowerCase()) ||
            (l.native_name || '').toLowerCase().includes(langSearch.toLowerCase())
        );
        const active = filtered.find(l => l.code === language);
        const others = filtered.filter(l => l.code !== language);
        return active ? [active, ...others] : others;
    })();

    const sortedCurrencies = (() => {
        const filtered = availableCurrencies.filter(c =>
            (c.name || '').toLowerCase().includes(currSearch.toLowerCase()) ||
            (c.code || '').toLowerCase().includes(currSearch.toLowerCase())
        );
        const active = filtered.find(c => c.code === currency);
        const others = filtered.filter(c => c.code !== currency);
        return active ? [active, ...others] : others;
    })();

    return (
        <header className="admin-header shadow-sm">
            <div className="admin-header-content">
                <div className="header-left d-flex align-items-center gap-3">
                    <button className="sidebar-toggle-btn d-lg-none" onClick={toggleSidebar}>
                        <FaBars />
                    </button>
                </div>

                <div className="admin-header-right">
                    {/* Language Switcher */}
                    <div className="header-localization-dropdown">
                        <button className="header-action-btn select-box">
                            <FaGlobe className="me-2 opacity-75" />
                            <span className="localization-label">{(language || 'en').toUpperCase()}</span>
                            <FaChevronDown className="ms-auto opacity-50 chevron-icon" />
                        </button>
                        <div className="localization-menu">
                            <div className="dropdown-header">{t('header.select_language')}</div>
                            <div className="dropdown-search">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder={t('header.search_language')}
                                    value={langSearch}
                                    onChange={(e) => setLangSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="dropdown-list scroll-area">
                                {sortedLanguages.map(lang => (
                                    <div
                                        key={lang.code}
                                        className={`localization-item ${language === lang.code ? 'active' : ''}`}
                                        onClick={() => handleLanguageChange(lang.code)}
                                    >
                                        <div className="d-flex flex-column">
                                            <span className="item-name">{lang.name}</span>
                                            <span className="item-tag">{lang.native_name || lang.name}</span>
                                        </div>
                                        {language === lang.code && <div className="active-dot"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Currency Switcher */}
                    <div className="header-localization-dropdown">
                        <button className="header-action-btn select-box">
                            <FaCoins className="me-2 opacity-75" />
                            <span className="localization-label">{currency}</span>
                            <FaChevronDown className="ms-auto opacity-50 chevron-icon" />
                        </button>
                        <div className="localization-menu">
                            <div className="dropdown-header">{t('header.select_currency')}</div>
                            <div className="dropdown-search">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder={t('header.search_currency')}
                                    value={currSearch}
                                    onChange={(e) => setCurrSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div className="dropdown-list scroll-area">
                                {sortedCurrencies.map(curr => (
                                    <div
                                        key={curr.code}
                                        className={`localization-item ${currency === curr.code ? 'active' : ''}`}
                                        onClick={() => { changeCurrency(curr.code); setCurrSearch(''); }}
                                    >
                                        <div className="d-flex flex-column">
                                            <span className="item-name">{curr.name}</span>
                                            <span className="item-tag">{curr.code} ({curr.symbol || '$'})</span>
                                        </div>
                                        {currency === curr.code && <div className="active-dot"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <button className="header-action-btn" onClick={() => navigate('/settings/general_settings')}>
                        <FaCog />
                    </button>

                    {/* Messages */}
                    <div className="header-notification-dropdown">
                        <button className="header-action-btn">
                            <FaEnvelope />
                            {messageCount > 0 && <span className="notification-badge">{messageCount}</span>}
                        </button>
                        <div className="notification-dropdown-menu">
                            <div className="dropdown-header d-flex justify-content-between align-items-center">
                                <span>{t('header.recent_messages')}</span>
                                <span className="view-all-link" onClick={() => navigate('/messages')}>{t('header.view_all')}</span>
                            </div>
                            <div className="dropdown-list scroll-area">
                                {Array.isArray(latestMessages) && latestMessages.length > 0 ? (
                                    latestMessages.map((msg) => (
                                        <div key={msg.id} className="notification-dropdown-item" onClick={() => navigate('/messages')}>
                                            <div className="notif-icon-circle bg-info-subtle text-info">
                                                <FaUser />
                                            </div>
                                            <div className="notif-details">
                                                <p className="notif-title">{safeString(msg.sender)}</p>
                                                <p className="notif-message text-truncate">{safeString(msg.subject)}</p>
                                                <span className="notif-time">{msg.time}</span>
                                            </div>
                                            {!msg.read && <div className="notif-unread-dot"></div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-dropdown-state">
                                        <div className="empty-icon-pulse">
                                            <FaEnvelope className="opacity-50" />
                                        </div>
                                        <p>{t('header.no_messages')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="header-notification-dropdown">
                        <button className="header-action-btn">
                            <FaBell />
                            {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                        </button>
                        <div className="notification-dropdown-menu">
                            <div className="dropdown-header d-flex justify-content-between align-items-center">
                                <span>{t('header.recent_notifications')}</span>
                                <div className="d-flex gap-2">
                                    {notificationCount > 0 && (
                                        <span className="view-all-link text-primary" onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}>
                                            {t('header.mark_all_read', 'All Read')}
                                        </span>
                                    )}
                                    <span className="view-all-link" onClick={() => navigate('/notifications')}>{t('header.view_all')}</span>
                                </div>
                            </div>
                            <div className="dropdown-list scroll-area">
                                {Array.isArray(latestNotifications) && latestNotifications.length > 0 ? (
                                    latestNotifications.map((notif) => (
                                        <div key={notif._id} className="notification-dropdown-item" onClick={() => handleNotificationClick(notif)}>
                                            <div className="notif-icon-circle">
                                                <FaBell />
                                            </div>
                                            <div className="notif-details">
                                                <p className="notif-title">{safeString(notif.title)}</p>
                                                <p className="notif-message text-truncate">{safeString(notif.message)}</p>
                                                <span className="notif-time">
                                                    {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            {!notif.is_read && <div className="notif-unread-dot"></div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-dropdown-state">
                                        <div className="empty-icon-pulse">
                                            <FaBell className="opacity-50" />
                                        </div>
                                        <p>{t('header.no_notifications')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Profile & Logout */}
                    <div className="header-profile-box">
                        <div className="profile-section">
                            <div className="admin-avatar-circle" style={{ fontWeight: '800' }}>
                                {(admin?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span className="admin-name">{safeString(admin?.name) || 'Main Admin'}</span>
                        </div>
                        <div className="divider-line"></div>
                        <button className="logout-icon-btn" onClick={handleLogout}>
                            <FaSignOutAlt />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
