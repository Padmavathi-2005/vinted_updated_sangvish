'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import axios from '@/utils/axios';
import AuthContext from '@/context/AuthContext';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';

import '@/app/styles/GlobalLoginModal.css';

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
        <Modal 
            show={show} 
            onHide={onHide} 
            centered 
            className="vinted-modal"
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header closeButton>
                <Modal.Title>{t('item_detail.login_required')}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-center text-muted mb-4 small" style={{ marginTop: '-10px' }}>
                    Please sign in to continue with your action.
                </p>
                <form onSubmit={handleLoginSubmit}>
                    <div className="mb-4">
                        <label className="form-label">{t('item_detail.email_addr')}</label>
                        <input 
                            type="email" 
                            className="form-control" 
                            placeholder="Enter your email"
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">{t('item_detail.password')}</label>
                        <div className="position-relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                className="form-control" 
                                placeholder="Enter your password"
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <div className="alert alert-danger py-2 px-3 mb-3 small border-0" style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
                            {error}
                        </div>
                    )}
                    <button 
                        type="submit" 
                        className="btn-submit-vinted w-100" 
                        disabled={loading}
                    >
                        {loading ? (
                            <><FaSpinner className="fa-spin me-2" /> {t('common.loading')}</>
                        ) : t('item_detail.sign_in')}
                    </button>
                </form>
                <div className="text-center mt-4 small">
                    <span className="text-muted">{t('item_detail.no_account')} </span>
                    <Link href="/register" className="register-link" onClick={() => onHide()}>
                        {t('item_detail.sign_up_free')}
                    </Link>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default GlobalLoginModal;
