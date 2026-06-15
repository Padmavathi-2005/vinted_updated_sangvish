import { io as socketIO } from 'socket.io-client';

let socket;

const getSocket = () => {
    if (!socket && typeof window !== 'undefined') {
        // Backend URL is usually the same host but different port or proxied
        // In this project, backend is on 5003, frontend on 3000
        let socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        
        // If socketUrl is empty, OR if it's pointing to localhost but we are accessing via a real domain/IP
        if (!socketUrl || (socketUrl.includes('localhost') && window.location.hostname !== 'localhost')) {
            const hostname = window.location.hostname;
            const protocol = window.location.protocol;
            // If we are on a real domain with https, we should route to the same domain (path will handle the API routing)
            if (hostname !== 'localhost' && !hostname.match(/^[0-9.]+$/)) {
                socketUrl = `${protocol}//${hostname}`;
            } else {
                // IP address or localhost fallback
                socketUrl = `${protocol}//${hostname}:5004`;
            }
        }
        
        socket = socketIO(socketUrl, {
            path: '/api/socket.io',
            transports: ['websocket', 'polling'],
            upgrade: true,
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
