import { io as socketIO } from 'socket.io-client';

let socket;

const getSocket = () => {
    if (!socket && typeof window !== 'undefined') {
        // Backend URL is usually the same host but different port or proxied
        // In this project, backend is on 5003, frontend on 3000
        const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';
        
        socket = socketIO(socketUrl, {
            path: '/socket.io/',
            transports: ['polling', 'websocket'],
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
