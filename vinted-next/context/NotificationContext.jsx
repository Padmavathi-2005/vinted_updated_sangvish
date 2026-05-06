'use client';

import { createContext, useState, useEffect, useContext } from 'react';
import axios from '@/utils/axios';
import AuthContext from '@/context/AuthContext';
import getSocket from '@/utils/socket';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

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
            const socket = getSocket();
            if (socket) {
                // Join personal room
                socket.emit('join_user', user._id);

                // Listen for new notifications
                socket.on('new_notification', (notif) => {
                    console.log('🔔 New real-time notification received:', notif);
                    setNotifications(prev => [notif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // Show a simple browser notification or visual feedback if desired
                    // (Optional: can be expanded with a toast library)
                });
            }

            // Optional: poll every 30 seconds as fallback
            const interval = setInterval(fetchNotifications, 30000);
            return () => {
                clearInterval(interval);
                if (socket) {
                    socket.off('new_notification');
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
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
