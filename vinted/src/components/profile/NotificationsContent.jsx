import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationContext from '../../context/NotificationContext';
import AuthContext from '../../context/AuthContext';
import {
    FaBell, FaCheckCircle, FaExclamationCircle, FaInfoCircle,
    FaEnvelope, FaBox, FaSearch, FaCheck, FaTrash, FaExternalLinkAlt, FaArrowLeft
} from 'react-icons/fa';
import '../../styles/NotificationsContent.css';
import { useTranslation } from 'react-i18next';
import { getImageUrl, safeString } from '../../utils/constants';
import { useSettings } from '../../context/SettingsContext';

const typeConfig = {
    success: { icon: FaCheckCircle, color: '#22c55e', bg: '#f0fdf4', labelKey: 'notifications.accepted' },
    error: { icon: FaExclamationCircle, color: '#ef4444', bg: '#fff5f5', labelKey: 'notifications.declined' },
    request: { icon: FaEnvelope, color: '#3b82f6', bg: '#eff6ff', labelKey: 'notifications.request' },
    message: { icon: FaEnvelope, color: '#8b5cf6', bg: '#f5f3ff', labelKey: 'notifications.message' },
    order: { icon: FaBox, color: '#f97316', bg: '#fff7ed', labelKey: 'notifications.order' },
    info: { icon: FaInfoCircle, color: '#64748b', bg: '#f8fafc', labelKey: 'notifications.info' },
};

const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return then.toLocaleDateString();
};

const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString([], {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const isMessageNotif = (notif) =>
    ['message', 'request', 'success', 'error'].includes(notif.type) && notif.link;

const NotificationsContent = () => {
    const { t } = useTranslation();
    const { notifications, loading, markAsRead, markAllAsRead, fetchNotifications } = useContext(NotificationContext);
    const { user } = useContext(AuthContext);
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [activeNotif, setActiveNotif] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'unread'
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Auto-select first when list changes
    useEffect(() => {
        if (notifications.length > 0 && !activeNotif) {
            setActiveNotif(notifications[0]);
        }
    }, [notifications]);

    const filtered = notifications.filter(n => {
        const matchesSearch = safeString(n.title).toLowerCase().includes(search.toLowerCase()) ||
            safeString(n.message).toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || !n.is_read;
        return matchesSearch && matchesFilter;
    });

    const handleSelect = (notif) => {
        setActiveNotif(notif);
        setMobileDetailOpen(true);
        if (!notif.is_read) markAsRead(notif._id);
    };

    const getConfig = (type) => typeConfig[type] || typeConfig.info;

    return (
        <div className="nc-container">
            {/* LEFT PANEL */}
            <div className={`nc-sidebar ${mobileDetailOpen ? 'mobile-hidden' : ''}`}>
                <div className="nc-sidebar-header">
                    <div className="nc-title-row">
                        <h3>{t('notifications.title', 'Notifications')}</h3>
                        {notifications.filter(n => !n.is_read).length > 0 && (
                            <span className="nc-unread-badge">
                                {notifications.filter(n => !n.is_read).length}
                            </span>
                        )}
                    </div>

                    <div className="nc-filter-row">
                        <button
                            className={`nc-filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >{t('notifications.all', 'All')}</button>
                        <button
                            className={`nc-filter-btn ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => setFilter('unread')}
                        >{t('notifications.unread', 'Unread')}</button>
                        {notifications.some(n => !n.is_read) && (
                            <button className="nc-mark-all-btn" onClick={markAllAsRead} title={t('notifications.mark_all_read', 'Mark all read')}>
                                <FaCheck /> {t('notifications.all_read_btn', 'All read')}
                            </button>
                        )}
                    </div>

                    <div className="nc-search-wrapper">
                        <FaSearch className="nc-search-icon" />
                        <input
                            type="text"
                            className="nc-search-input"
                            placeholder={t('notifications.search_placeholder', 'Search notifications...')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="nc-list">
                    {loading ? (
                        <div className="nc-loading">
                            <div className="spinner-border spinner-border-sm text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="nc-empty-list">
                            <FaBell style={{ fontSize: '2rem', opacity: 0.2 }} />
                            <p>{filter === 'unread' ? t('notifications.no_unread', 'No unread notifications') : t('notifications.no_notifications', 'No notifications')}</p>
                        </div>
                    ) : (
                        filtered.map(notif => {
                            const cfg = getConfig(notif.type);
                            const Icon = cfg.icon;
                            const isActive = activeNotif?._id === notif._id;
                            return (
                                <div
                                    key={notif._id}
                                    className={`nc-list-item ${isActive ? 'active' : ''} ${!notif.is_read ? 'unread' : ''}`}
                                    onClick={() => handleSelect(notif)}
                                >
                                    <div className="nc-item-icon" style={{ 
                                        background: notif.type === 'info' ? `${settings.primary_color}18` : cfg.bg, 
                                        color: notif.type === 'info' ? settings.primary_color : cfg.color,
                                        overflow: 'hidden'
                                    }}>
                                        {(settings.site_favicon || settings.site_logo) ? (
                                            <img 
                                                src={getImageUrl(settings.site_favicon || settings.site_logo)} 
                                                alt="" 
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                                            />
                                        ) : (
                                            <Icon />
                                        )}
                                    </div>
                                    <div className="nc-item-body">
                                        <div className="nc-item-title">{safeString(notif.title)}</div>
                                        <div className="nc-item-preview">{safeString(notif.message)}</div>
                                        <div className="nc-item-time">{formatRelativeTime(notif.created_at)}</div>
                                    </div>
                                    {!notif.is_read && <div className="nc-unread-dot" />}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className={`nc-detail ${mobileDetailOpen ? 'mobile-visible' : ''}`}>
                {activeNotif ? (() => {
                    const cfg = getConfig(activeNotif.type);
                    const Icon = cfg.icon;
                    const showMsgLink = isMessageNotif(activeNotif);
                    return (
                        <div className="nc-detail-content">
                            <div className="nc-detail-header" style={{ borderLeft: `4px solid ${activeNotif.type === 'info' ? settings.primary_color : cfg.color}` }}>
                                <button className="nc-mobile-back-btn" onClick={() => { setMobileDetailOpen(false); setActiveNotif(null); }}>
                                    <FaArrowLeft />
                                </button>
                                <div className="nc-detail-icon-wrap" style={{ 
                                    background: activeNotif.type === 'info' ? `${settings.primary_color}18` : cfg.bg, 
                                    color: activeNotif.type === 'info' ? settings.primary_color : cfg.color,
                                    overflow: 'hidden'
                                }}>
                                    {(settings.site_favicon || settings.site_logo) ? (
                                        <img 
                                            src={getImageUrl(settings.site_favicon || settings.site_logo)} 
                                            alt="" 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                                        />
                                    ) : (
                                        <Icon size={28} />
                                    )}
                                </div>
                                <div className="nc-detail-meta">
                                    <span className="nc-detail-type-label" style={{ background: cfg.bg, color: cfg.color }}>
                                        {t(cfg.labelKey, cfg.labelKey.split('.').pop())}
                                    </span>
                                    <h2 className="nc-detail-title">{safeString(activeNotif.title)}</h2>
                                    <span className="nc-detail-time">{formatFullDate(activeNotif.created_at)}</span>
                                </div>
                            </div>

                            <div className="nc-detail-body">
                                <p className="nc-detail-message">{safeString(activeNotif.message)}</p>

                                {showMsgLink && (
                                    <div className="nc-detail-action-card">
                                        <div className="nc-action-card-icon">
                                            <FaEnvelope />
                                        </div>
                                        <div className="nc-action-card-body">
                                            <p className="nc-action-card-label">
                                                {activeNotif.type === 'success'
                                                    ? t('notifications.conversation_accepted', 'Your conversation has been accepted')
                                                    : activeNotif.type === 'error'
                                                        ? t('notifications.request_declined', 'The request was declined')
                                                        : t('notifications.new_message_request', 'You have a new message or request')}
                                            </p>
                                            <button
                                                className="nc-goto-msg-btn"
                                                onClick={() => navigate(activeNotif.link)}
                                            >
                                                <FaExternalLinkAlt /> {t('notifications.open_conversation', 'Open Conversation')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeNotif.type === 'order' && activeNotif.link && (
                                    <div className="nc-detail-action-card">
                                        <div className="nc-action-card-icon" style={{ background: '#f97316' }}>
                                            <FaBox />
                                        </div>
                                        <div className="nc-action-card-body">
                                            <p className="nc-action-card-label">{t('notifications.view_manage_order', 'View and manage your order in the Orders section.')}</p>
                                            <button
                                                className="nc-goto-msg-btn"
                                                onClick={() => navigate(activeNotif.link)}
                                            >
                                                <FaExternalLinkAlt /> {t('notifications.view_order_details', 'View Order Details')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeNotif.link && !showMsgLink && activeNotif.type !== 'order' && (
                                    <button
                                        className="nc-view-link-btn"
                                        onClick={() => navigate(activeNotif.link)}
                                    >
                                        <FaExternalLinkAlt /> {t('notifications.view_details', 'View Details')}
                                    </button>
                                )}
                            </div>

                            <div className="nc-detail-footer">
                                {!activeNotif.is_read && (
                                    <button className="nc-footer-btn read" onClick={() => markAsRead(activeNotif._id)}>
                                        <FaCheck /> {t('notifications.mark_as_read', 'Mark as read')}
                                    </button>
                                )}
                                <span className="nc-status-pill" style={{
                                    background: activeNotif.is_read ? '#f1f5f9' : '#eff6ff',
                                    color: activeNotif.is_read ? '#64748b' : '#3b82f6'
                                }}>
                                    {activeNotif.is_read ? t('notifications.read', 'Read') : t('notifications.unread', 'Unread')}
                                </span>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="nc-detail-empty">
                        <FaBell size={48} style={{ opacity: 0.15 }} />
                        <p>{t('notifications.select_to_view', 'Select a notification to view details')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsContent;
