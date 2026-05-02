import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Badge, Spinner, Form, InputGroup } from 'react-bootstrap';
import { FaBell, FaCheck, FaCircle, FaSearch, FaInfoCircle, FaEnvelope, FaShoppingCart, FaArrowLeft, FaEye, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import axios from '../utils/axios';
import { showToast, showConfirm } from '../utils/swal';
import '../styles/Notifications.css';

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'unread'
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [showDetailMobile, setShowDetailMobile] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/api/admin/notifications');
            setNotifications(res.data);
            if (res.data && res.data.length > 0) {
                setSelectedId(res.data[0]._id);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            const mockData = [
                { _id: '67c25e4d7b69e05f5d3869f1', title: 'Order Cancelled', message: 'Order #ORD-1771929831080-472 has been cancelled by the buyer.', created_at: new Date().toISOString(), is_read: false, type: 'info' },
                { _id: '67c25e4d7b69e05f5d3869f2', title: 'New Message', message: 'You have a new message from sangili_raja', created_at: new Date(Date.now() - 3600000).toISOString(), is_read: true, type: 'message' },
                { _id: '67c25e4d7b69e05f5d3869f3', title: 'Withdrawal Request', message: 'User requested a withdrawal of $50.', created_at: new Date(Date.now() - 86400000).toISOString(), is_read: false, type: 'request' },
            ];
            setNotifications(mockData);
            if (mockData.length > 0) setSelectedId(mockData[0]._id);
        } finally {
            setLoading(false);
        }
    };

    const mapLink = (link) => {
        if (!link) return null;
        if (link.includes('/profile?tab=orders')) return '/orders';
        if (link.includes('/profile?tab=messages')) return '/messages';
        if (link.includes('/profile?tab=listings')) return '/listings';
        const adminRoutes = ['/dashboard', '/users', '/listings', '/orders', '/wallet', '/categories', '/settings', '/notifications', '/messages', '/reports'];
        if (link.startsWith('/') && !adminRoutes.some(route => link.startsWith(route))) {
            return '/notifications';
        }
        return link;
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/admin/notifications/${id}/read`);
            setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            setNotifications(notifications.map(n => n._id === id ? { ...n, is_read: true } : n));
        }
    };

    useEffect(() => {
        if (selectedId) {
            const notif = notifications.find(n => n._id === selectedId);
            if (notif && !notif.is_read) {
                markAsRead(selectedId);
            }
        }
    }, [selectedId, notifications]);

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter = filter === 'all' || !n.is_read;
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.message.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const selectedNotification = notifications.find(n => n._id === selectedId);

    const getIcon = (type) => {
        switch (type) {
            case 'message': return <FaEnvelope />;
            case 'order': return <FaShoppingCart />;
            case 'request': return <FaInfoCircle />;
            case 'success': return <FaCheckCircle />;
            case 'error': return <FaExclamationCircle />;
            case 'info': return <FaInfoCircle />;
            default: return <FaBell />;
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
        </div>
    );

    return (
        <div className="notifications-container p-4">
            <h2 className="page-title fw-bold mb-4">Notifications</h2>

            <div className="notifications-layout overflow-hidden">
                <Row className="g-0 flex-grow-1">
                    {/* Left Panel: List */}
                    <Col lg={4} className={`border-end list-panel-bg d-flex flex-column ${showDetailMobile ? 'd-none d-lg-flex' : 'd-flex'}`}>
                        <div className="list-panel-header p-3 border-bottom">
                            <div className="d-flex gap-2 mb-3">
                                <Button
                                    size="sm"
                                    variant={filter === 'all' ? 'primary' : 'outline-secondary'}
                                    className="rounded-pill px-3"
                                    onClick={() => setFilter('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    size="sm"
                                    variant={filter === 'unread' ? 'primary' : 'outline-secondary'}
                                    className="rounded-pill px-3"
                                    onClick={() => setFilter('unread')}
                                >
                                    Unread
                                </Button>
                            </div>
                            <InputGroup className="bg-light rounded-3 overflow-hidden border-0">
                                <InputGroup.Text className="bg-transparent border-0 pe-1">
                                    <FaSearch size={14} className="text-secondary" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search notifications..."
                                    className="bg-transparent border-0 shadow-none ps-2 py-2"
                                    style={{ fontSize: '0.9rem' }}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </InputGroup>
                        </div>

                        <div className="notification-list-scrollable scroll-area" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                            {filteredNotifications.length > 0 ? (
                                filteredNotifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`notif-list-item p-3 border-bottom d-flex gap-3 cursor-pointer transition-all ${selectedId === n._id ? 'active-item' : ''}`}
                                        onClick={() => {
                                            setSelectedId(n._id);
                                            setShowDetailMobile(true);
                                        }}
                                    >
                                        <div className={`notif-icon-box ${n.type || 'info'} flex-shrink-0`}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="notif-content flex-grow-1 min-w-0">
                                            <div className="d-flex justify-content-between align-items-start gap-2">
                                                <h6 className={`mb-1 text-truncate ${!n.is_read ? 'fw-bold text-dark' : 'text-secondary'}`} style={{ fontSize: '0.9rem' }}>
                                                    {n.title}
                                                </h6>
                                                {!n.is_read && <div className="unread-dot-indicator"></div>}
                                            </div>
                                            <p className="notif-summary text-secondary mb-1 text-truncate-2" style={{ fontSize: '0.8rem' }}>
                                                {n.message}
                                            </p>
                                            <span className="notif-date text-muted" style={{ fontSize: '0.75rem' }}>
                                                {new Date(n.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-5 text-center text-muted">
                                    <FaBell size={40} className="mb-3 opacity-20" />
                                    <p style={{ fontSize: '0.9rem' }}>No notifications found</p>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Right Panel: Detail */}
                    <Col lg={8} className={`bg-white d-flex flex-column detail-pane ${!showDetailMobile ? 'd-none d-lg-flex' : 'd-flex'}`}>
                        {selectedNotification ? (
                            <>
                                <div className="detail-header p-3 p-md-4 border-bottom d-flex align-items-center gap-3">
                                    <Button
                                        variant="light"
                                        className="d-lg-none rounded-circle p-2 border-0 shadow-none bg-transparent"
                                        onClick={() => setShowDetailMobile(false)}
                                    >
                                        <FaArrowLeft />
                                    </Button>
                                    <div className={`detail-icon-box ${selectedNotification.type || 'info'} d-none d-sm-flex`}>
                                        {getIcon(selectedNotification.type)}
                                    </div>
                                    <div>
                                        <div className="text-uppercase text-secondary fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                                            {selectedNotification.type || 'INFO'}
                                        </div>
                                        <h4 className="mb-0 fw-bold" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>{selectedNotification.title}</h4>
                                        <span className="text-muted small">
                                            {new Date(selectedNotification.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="ms-auto d-flex gap-2">
                                        {/* Activity log style - no delete button */}
                                    </div>
                                </div>
                                <div className="detail-body p-4 flex-grow-1">
                                    <div className="notif-content-box p-4 bg-light rounded-4 mb-4 shadow-none border-0">
                                        <p className="lead" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                                            {selectedNotification.message}
                                        </p>
                                    </div>

                                    <div className="d-flex gap-3">
                                        {selectedNotification.link && (
                                            <Button
                                                variant="primary"
                                                className="rounded-pill px-4 shadow-sm"
                                                onClick={() => {
                                                    const mapped = mapLink(selectedNotification.link);
                                                    if (mapped) navigate(mapped);
                                                }}
                                            >
                                                <FaEye className="me-2" /> View details
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-muted p-5">
                                <FaBell size={64} className="opacity-25 mb-3" />
                                <h5>Select a notification to view details</h5>
                            </div>
                        )}
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default Notifications;
