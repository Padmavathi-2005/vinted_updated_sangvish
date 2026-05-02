import axios from 'axios';
import { clearAdminInfo } from './auth';

const instance = axios.create({
    baseURL: import.meta.env.VITE_ADMIN_API_BASE_URL || 'https://adminvinted.sangvish.com',
});

// Separate URL for serving images/media (always main backend port 5000)
export const imageBaseURL = import.meta.env.VITE_IMAGE_BASE_URL || 'https://vinted.sangvish.com';

// Add interceptors to handle authentication tokens
instance.interceptors.request.use(
    (config) => {
        // If it's the admin dashboard axios instance, we prioritize the admin token
        const adminInfo = localStorage.getItem('admin') || sessionStorage.getItem('admin');
        const userInfo = localStorage.getItem('user') || sessionStorage.getItem('user');

        if (adminInfo) {
            try {
                const { token } = JSON.parse(adminInfo);
                if (token) {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${token}`;
                    return config;
                }
            } catch (e) {
                console.error('Axios Interceptor: Failed parsing adminInfo', e);
            }
        }

        // Fallback to user token if no admin token is found
        if (userInfo) {
            try {
                const { token } = JSON.parse(userInfo);
                if (token) {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (e) {
                // Error parsing user info
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
        // Handle 401 errors for admin and settings routes
        if (error.response && error.response.status === 401) {
            const isLoginRequest = error.config.url.includes('/api/admin/login');

            console.log('Admin 401 Error:', {
                url: error.config.url,
                currentPath: window.location.pathname,
                isLogin: isLoginRequest,
                responseData: error.response.data
            });

            if (!isLoginRequest) {
                console.log('Admin session invalid - clearing and redirecting');
                clearAdminInfo();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
