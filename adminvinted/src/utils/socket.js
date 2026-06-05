import { io as socketIO } from 'socket.io-client';

let userSocket;
let adminSocket;

export const getUserSocket = () => {
    if (!userSocket && typeof window !== 'undefined') {
        let socketUrl = import.meta.env.VITE_API_BASE_URL || 'https://vinted.sangvish.com';
        
        // Dynamically connect to local backend if testing locally
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            socketUrl = 'http://localhost:5004';
        }
        
        userSocket = socketIO(socketUrl, {
            path: '/api/socket.io',
            transports: ['polling', 'websocket'], // try polling first
            upgrade: false, // force polling if websocket is failing at Nginx layer
            reconnection: true,
            reconnectionAttempts: 5
        });

        userSocket.on('connect', () => {
            console.log('✅ Connected to User Socket.IO server');
        });

        userSocket.on('disconnect', () => {
            console.log('❌ Disconnected from User Socket.IO server');
        });
    }
    return userSocket;
};

export const getAdminSocket = () => {
    if (!adminSocket && typeof window !== 'undefined') {
        let socketUrl = import.meta.env.VITE_ADMIN_API_BASE_URL || 'https://adminvinted.sangvish.com';
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            socketUrl = 'http://localhost:5007'; // Admin backend port
        }
        
        adminSocket = socketIO(socketUrl, {
            path: '/api/socket.io',
            transports: ['polling', 'websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: 5
        });

        adminSocket.on('connect', () => {
            console.log('✅ Connected to Admin Socket.IO server');
        });

        adminSocket.on('disconnect', () => {
            console.log('❌ Disconnected from Admin Socket.IO server');
        });
    }
    return adminSocket;
};
