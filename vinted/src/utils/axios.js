import axios from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL === '/' ? '' : (import.meta.env.VITE_API_BASE_URL || 'https://vinted.sangvish.com'),
});

// Add interceptors to handle authentication tokens
instance.interceptors.request.use(
    (config) => {
        // console.log(`Axios: Intercepting request to ${config.url}`);
        // If it's an admin route, ONLY use the admin token
        if (config.url && config.url.includes('/api/admin')) {
            const adminInfo = localStorage.getItem('admin') || sessionStorage.getItem('admin');

            if (adminInfo) {
                try {
                    const { token } = JSON.parse(adminInfo);
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (e) {
                    // Error parsing admin info
                }
            }
        } else {
            // Regular user token logic...
            const localUser = localStorage.getItem('user');
            const sessionUser = sessionStorage.getItem('user');
            const userInfo = localUser || sessionUser;

            if (userInfo) {
                // console.log(`Axios: Found data in storage (length: ${userInfo.length})`);
                try {
                    const parsed = JSON.parse(userInfo);
                    if (parsed && parsed.token) {
                        // console.log(`Axios: FOUND token for ${config.url}`);
                        config.headers.Authorization = `Bearer ${parsed.token}`;
                    }
                } catch (e) {
                    // console.log(`Axios: PARSE ERROR for user info`);
                }
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor to handle admin session expiration
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 errors for admin routes
        if (error.response && error.response.status === 401) {
            const isLoginRequest = error.config.url.includes('/login') || error.config.url.includes('/api/users/login');

            if (error.config.url.includes('/api/admin')) {
                if (!isLoginRequest) {
                    localStorage.removeItem('admin');
                    sessionStorage.removeItem('admin');
                    if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin') {
                        window.location.href = '/admin';
                    }
                }
            } else {
                // Regular user 401
                if (!isLoginRequest) {
                    // Only clear if the request HAD a token and it was rejected
                    const authHeader = error.config.headers?.Authorization;
                    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 15) {
                        console.log(`Axios: 401 received for authenticated request to ${error.config.url}. Clearing session.`);
                        localStorage.removeItem('user');
                        sessionStorage.removeItem('user');

                        // Only redirect if it's a hard failure on a main page
                        const protectedPaths = ['/profile', '/checkout', '/sell', '/messages'];
                        const isProtected = protectedPaths.some(p => window.location.pathname.startsWith(p));
                        const isPaymentRoute = error.config.url.includes('/api/payments');

                        if (isProtected && !isPaymentRoute) {
                            window.location.href = '/login?expired=true';
                        }
                    } else {
                        console.log(`Axios: 401 received for request to ${error.config.url} without valid token. Ignoring for session status.`);
                    }
                }
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
