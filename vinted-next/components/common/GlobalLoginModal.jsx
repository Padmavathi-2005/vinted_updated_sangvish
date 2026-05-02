'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import axios from '@/utils/axios';
import AuthContext from '@/context/AuthContext';
import { FaEye, FaEyeSlash, FaEnvelope } from 'react-icons/fa';

const GlobalLoginModal = ({ show, onHide }) => {
    const { t } = useTranslation();
    const { login } = useContext(AuthContext);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show) {
            setError('');
            setEmail('');
            setPassword('');
        }
    }, [show]);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/users/login', {
                email,
                password
            });
            const userData = res.data;
            if (!userData || !userData.token) {
                throw new Error('Invalid response from server');
            }
            login(userData, true);
            onHide();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{t('item_detail.login_required')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={handleLoginSubmit}>
                    <div className="mb-3">
                        <label className="form-label">{t('item_detail.email_addr')}</label>
                        <input 
                            type="email" 
                            className="form-control" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">{t('item_detail.password')}</label>
                        <div className="position-relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                className="form-control" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                            <button 
                                type="button" 
                                className="btn position-absolute top-50 end-0 translate-middle-y border-0"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ zIndex: 5 }}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {error && <div className="text-danger mb-3 small">{error}</div>}
                    <Button type="submit" variant="primary" className="w-100" disabled={loading} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                        {loading ? t('common.loading') : t('item_detail.sign_in')}
                    </Button>
                </form>
                <div className="text-center mt-3 small">
                    <span>{t('item_detail.no_account')} </span>
                    <a href="/register" className="text-primary text-decoration-none fw-bold" onClick={(e) => { e.preventDefault(); /* Navigate to register or show register modal */ }}>{t('item_detail.sign_up_free')}</a>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default GlobalLoginModal;
