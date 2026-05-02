import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { setAdminInfo } from '../utils/auth';
import '../styles/Admin.css';

const AdminLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const { email, password } = formData;

    useEffect(() => {
        // We defer any settings fetches until after successful login
        // to prevent premature 401 Unauthorized errors in the console.
    }, []);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/admin/login', formData);
            if (response.data && response.data.token) {
                // Save to storage using utility
                setAdminInfo(response.data);
                window.location.href = '/dashboard';
            } else {
                setError('Login failed: Invalid server response.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.message || 'Admin login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-overlay"></div>
            <div className="admin-card">
                <div className="text-center">
                    <div className="admin-icon-wrapper">
                        <FaUserShield size={36} className="text-white" />
                    </div>
                    <h2>Resale Admin</h2>
                    <p className="subtitle">Secure workspace for administrators</p>
                </div>

                <form onSubmit={onSubmit} className="admin-login-form">
                    {error && <div className="alert alert-admin-danger animated shake">{error}</div>}

                    <div className="form-group-custom">
                        <label className="form-label">Email Address</label>
                        <div className="input-group-custom">
                            <span className="input-icon-custom"><FaEnvelope /></span>
                            <input
                                type="email"
                                className="input-field-custom"
                                name="email"
                                value={email}
                                placeholder="name@example.com"
                                onChange={onChange}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="form-group-custom">
                        <label className="form-label">Password</label>
                        <div className="input-group-custom">
                            <span className="input-icon-custom"><FaLock /></span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field-custom"
                                name="password"
                                value={password}
                                placeholder="••••••••"
                                onChange={onChange}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-admin-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                            'Access Dashboard'
                        )}
                    </button>

                    <div className="admin-login-footer">
                        <p>Authorized access only. All actions are logged.</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
