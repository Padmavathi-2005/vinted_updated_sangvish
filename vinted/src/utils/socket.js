import { io as socketIO } from 'socket.io-client';

let socket;

const getSocket = () => {
    if (!socket && typeof window !== 'undefined') {
        // Use the defined Vite API base URL or fallback
        const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004';
        
        socket = socketIO(socketUrl, {
            path: '/api/socket.io',
            transports: ['polling'],
            reconnection: true,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('✅ Connected to Socket.IO server');
        });

        socket.on('disconnect', () => {
            console.log('❌ Disconnected from Socket.IO server');
        });
    }
    return socket;
};

export default getSocket;
