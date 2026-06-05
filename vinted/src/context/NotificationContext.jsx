import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import AuthContext from './AuthContext';
import getSocket from '../utils/socket';
import { Toast, ToastContainer } from 'react-bootstrap';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [toasts, setToasts] = useState([]);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await axios.get('/api/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            
            // Socket logic
            const notifSocket = getSocket();
            let joinRoom;
            if (notifSocket) {
                joinRoom = () => notifSocket.emit('join_user', user._id || user.id);
                
                // Join personal room immediately
                joinRoom();

                // Re-join automatically if socket reconnects
                notifSocket.on('connect', joinRoom);

                // Listen for new notifications
                notifSocket.on('new_notification', (notif) => {
                    console.log('🔔 New real-time notification received:', notif);
                    setNotifications(prev => [notif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Show a toast push notification
                    const id = Date.now() + Math.random();
                    setToasts(prev => [...prev, { id, title: notif.title, message: notif.message, type: notif.type }]);
                    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
                });
            }

            // Optional: poll every 30 seconds as fallback
            const interval = setInterval(fetchNotifications, 30000);
            return () => {
                clearInterval(interval);
                if (notifSocket) {
                    if (joinRoom) notifSocket.off('connect', joinRoom);
                    notifSocket.off('new_notification');
                }
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch('/api/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            markAsRead,
            markAllAsRead
        }}>
            {children}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050, position: 'fixed' }}>
                {toasts.map(toast => (
                    <Toast key={toast.id} onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} autohide delay={5000} bg={toast.type === 'success' ? 'success' : toast.type === 'alert' || toast.type === 'error' ? 'danger' : 'primary'}>
                        <Toast.Header closeButton>
                            <strong className="me-auto text-dark">{toast.title}</strong>
                        </Toast.Header>
                        <Toast.Body className="text-white">{toast.message}</Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
