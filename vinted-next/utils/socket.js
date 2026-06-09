import { io as socketIO } from 'socket.io-client';

let socket;

const getSocket = () => {
    if (!socket && typeof window !== 'undefined') {
        // Backend URL is usually the same host but different port or proxied
        // In this project, backend is on 5003, frontend on 3000
        let socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        
        if (!socketUrl) {
            // Dynamically detect hostname so it works on mobile testing (e.g. 192.168.x.x)
            const hostname = window.location.hostname;
            const protocol = window.location.protocol;
            socketUrl = `${protocol}//${hostname}:5003`;
        }
        
        socket = socketIO(socketUrl, {
            path: '/api/socket.io',
            transports: ['polling', 'websocket'],
            upgrade: false,
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
