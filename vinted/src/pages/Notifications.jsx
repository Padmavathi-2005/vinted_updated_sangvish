import { useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NotificationContext from '../context/NotificationContext';
import AuthContext from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FaBell, FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaEnvelope, FaBox, FaLongArrowAltRight } from 'react-icons/fa';
import { safeString } from '../utils/constants';
import '../styles/Notifications.css';

const Notifications = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { notifications, loading, markAsRead, markAllAsRead, fetchNotifications } = useContext(NotificationContext);

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            fetchNotifications();
        }
    }, [user, navigate, fetchNotifications]);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <FaCheckCircle className="notif-icon success" />;
            case 'error': return <FaExclamationCircle className="notif-icon error" />;
            case 'message':
            case 'request': return <FaEnvelope className="notif-icon message" />;
            case 'order': return <FaBox className="notif-icon order" />;
            default: return <FaInfoCircle className="notif-icon info" />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="notifications-page">
            <div className="notif-container">
                <div className="notif-header">
                    <div className="notif-title-section">
                        <FaBell className="header-bell" />
                        <h1>{t('notifications.title', 'Notifications')}</h1>
                    </div>
                    {notifications.length > 0 && (
                        <button className="mark-all-btn" onClick={markAllAsRead}>
                            {t('notifications.mark_all_read', 'Mark all as read')}
                        </button>
                    )}
                </div>

                <div className="notif-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon-wrapper">
                                <FaBell className="empty-icon" />
                            </div>
                            <h3>{t('notifications.empty_title', 'All Caught Up!')}</h3>
                            <p>{t('notifications.empty_text', 'No new notifications to show right now.')}</p>
                            <Link to="/" className="home-btn">{t('notifications.back_home', 'Back to Home')}</Link>
                        </div>
                    ) : (
                        <div className="notif-list">
                            {notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`notif-item ${!notif.is_read ? 'unread' : ''}`}
                                    onClick={() => !notif.is_read && markAsRead(notif._id)}
                                >
                                    <div className="notif-icon-col">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="notif-info-col">
                                        <div className="notif-top-row">
                                            <h3>{safeString(notif.title)}</h3>
                                            <span className="notif-time">{formatDate(notif.created_at)}</span>
                                        </div>
                                        <p className="notif-msg">{safeString(notif.message)}</p>
                                        {notif.link && (
                                            <Link to={notif.link} className="notif-link">
                                                {t('notifications.view_details', 'View details')} <FaLongArrowAltRight />
                                            </Link>
                                        )}
                                    </div>
                                    {!notif.is_read && <div className="unread-dot"></div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
