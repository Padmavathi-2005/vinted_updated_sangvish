import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import axios from '../utils/axios';
import { getAdminInfo, clearAdminInfo } from '../utils/auth';
import '../styles/Admin.css';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const adminData = getAdminInfo();
            const isLoginPage = location.pathname === '/login';

            if (!adminData) {
                if (!isLoginPage) {
                    navigate('/login');
                }
                setLoading(false);
                return;
            }

            if (isLoginPage && adminData) {
                navigate('/dashboard');
                setLoading(false);
                return;
            }

            if (isLoginPage && !adminData) {
                setLoading(false);
                return;
            }

            // Normal protected page - verification
            try {
                await axios.get('/api/settings/general_settings');
                setVerified(true);
            } catch (err) {
                console.error('Settings fetch failed', err);
                if (err.response?.status === 401) {
                    clearAdminInfo();
                    if (!isLoginPage) navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [location.pathname, navigate]);

    if (loading && location.pathname !== '/login') {
        return (
            <div className="admin-loading-screen">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Special case for login page which has its own layout
    if (location.pathname === '/login') {
        return children;
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
