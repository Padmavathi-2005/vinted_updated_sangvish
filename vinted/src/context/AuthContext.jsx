import { createContext, useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext();

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const pingTimerRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.token && (parsedUser.username || parsedUser.name || parsedUser.email)) {
                    setUser(parsedUser);
                } else {
                    console.warn('AuthContext: Stored user is missing token or details. Clearing.');
                    localStorage.removeItem('user');
                    sessionStorage.removeItem('user');
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
                localStorage.removeItem('user');
                sessionStorage.removeItem('user');
            }
        }
        
        setLoading(false);
    }, []);

    // Ping the server every 5 min to keep last_login (Last Seen) up-to-date
    useEffect(() => {
        if (!user?.token) {
            clearInterval(pingTimerRef.current);
            return;
        }

        const ping = async () => {
            try {
                const res = await axios.patch('/api/users/ping');
                // Update stored user with fresh last_login
                const fresh = { last_login: res.data.last_login };
                setUser(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, ...fresh };
                    if (localStorage.getItem('user')) {
                        localStorage.setItem('user', JSON.stringify(updated));
                    } else if (sessionStorage.getItem('user')) {
                        sessionStorage.setItem('user', JSON.stringify(updated));
                    }
                    return updated;
                });
            } catch {
                // Silent — don't break the app if ping fails
            }
        };

        // Ping immediately on login/page-load, then on every interval
        ping();
        pingTimerRef.current = setInterval(ping, PING_INTERVAL);
        return () => clearInterval(pingTimerRef.current);
    }, [user?.token]);

    const login = (userData, rememberMe = true) => {
        if (rememberMe) {
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            sessionStorage.setItem('user', JSON.stringify(userData));
        }
        setUser(userData);
    };

    const updateUser = (userData) => {
        console.log('AuthContext: Updating user with:', userData);
        setUser(prev => {
            const newUser = { ...prev, ...userData };
            console.log('AuthContext: Merged new user state:', newUser);
            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(newUser));
            } else if (sessionStorage.getItem('user')) {
                sessionStorage.setItem('user', JSON.stringify(newUser));
            }
            return newUser;
        });
    };

    const logout = () => {
        clearInterval(pingTimerRef.current);
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        setUser(null);
    };

    const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'buyer');

    const toggleMode = () => {
        setMode(prev => {
            const next = prev === 'buyer' ? 'seller' : 'buyer';
            localStorage.setItem('mode', next);
            return next;
        });
    };

    const changeMode = (newMode) => {
        setMode(newMode);
        localStorage.setItem('mode', newMode);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser, mode, toggleMode, setMode: changeMode }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;

