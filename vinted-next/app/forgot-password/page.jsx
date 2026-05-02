'use client';

import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaLock, FaKey, FaChevronLeft, FaCheckCircle } from 'react-icons/fa';
import axios from '@/utils/axios';
import useRecaptcha from '@/hooks/useRecaptcha';
import '@/app/styles/Auth.css';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [recaptchaSettings, setRecaptchaSettings] = useState({ 
        recaptcha_enabled: false, 
        recaptcha_site_key: '' 
    });
    const router = useRouter();

    const { executeRecaptcha } = useRecaptcha(recaptchaSettings?.recaptcha_site_key, recaptchaSettings?.recaptcha_enabled);

    useEffect(() => {
        setRecaptchaSettings({
            recaptcha_enabled: process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true',
            recaptcha_site_key: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''
        });

        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/settings/recaptcha_settings');
                if (data) {
                    setRecaptchaSettings(prev => ({
                        ...prev,
                        ...data,
                        recaptcha_site_key: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || data.recaptcha_site_key
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch recaptcha settings", err);
            }
        };
        fetchSettings();
    }, []);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            let captchaToken = '';

            if (recaptchaSettings?.recaptcha_enabled) {
                captchaToken = await executeRecaptcha('forgot_password');
                if (!captchaToken) {
                    setError('Security verification failed. This might be due to an invalid reCAPTCHA Site Key or network issue. Please check your admin settings.');
                    setLoading(false);
                    return;
                }
            }

            await axios.post('/api/users/forgotpassword', { email, captchaToken });
            setStep(2);
            setMessage('Verification code sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/users/verify-otp', { email, otp });
            setResetToken(res.data.resetToken);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        setError('');
        try {
            await axios.put(`/api/users/resetpassword/${resetToken}`, { password });
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <title>Reset Password | Resale Marketplace</title>
            <meta name="description" content="Securely reset your Vinted account password." />
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-back mb-4">
                        <Link href="/login" className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2" style={{borderRadius: '10px', padding: '10px', fontSize: '14px', fontWeight: '500', color: '#64748b', border: '1px solid #e2e8f0'}}>
                            <FaChevronLeft size={12} /> Back to Login
                        </Link>
                    </div>

                    {step === 1 && (
                        <>
                            <h2 className="text-center">Forgot Password?</h2>
                            <p className="subtitle text-center">Don't worry, it happens. Enter your email below to receive a verification code.</p>
                            <form onSubmit={handleSendOTP}>
                                {error && <div className="auth-error">{error}</div>}
                                <div className="auth-field">
                                    <label className="auth-label">Email Address</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaEnvelope /></span>
                                        <input
                                            type="email"
                                            className="auth-input"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Verification Code'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-center">Verify Identity</h2>
                            <p className="subtitle text-center">We've sent a 6-digit code to <strong>{email}</strong>. Please enter it below.</p>
                            <form onSubmit={handleVerifyOTP}>
                                {error && <div className="auth-error">{error}</div>}
                                {message && <div className="auth-success mb-3" style={{color: '#10b981', background: '#ecfdf5', padding: '10px', borderRadius: '8px', fontSize: '14px'}}>{message}</div>}
                                <div className="auth-field">
                                    <label className="auth-label">Verification Code</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaKey /></span>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            placeholder="Enter 6-digit code"
                                            maxLength="6"
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                                <p className="text-center mt-3" style={{fontSize: '14px', color: '#64748b'}}>
                                    Didn't receive it? <span onClick={handleSendOTP} style={{color: '#0ea5e9', cursor: 'pointer', fontWeight: '500'}}>Resend Code</span>
                                </p>
                            </form>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="text-center">Set New Password</h2>
                            <p className="subtitle text-center">Your identity is verified. Now, choose a strong new password for your account.</p>
                            <form onSubmit={handleResetPassword}>
                                {error && <div className="auth-error">{error}</div>}
                                <div className="auth-field">
                                    <label className="auth-label">New Password</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaLock /></span>
                                        <input
                                            type="password"
                                            className="auth-input"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min. 6 characters"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="auth-field">
                                    <label className="auth-label">Confirm New Password</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaLock /></span>
                                        <input
                                            type="password"
                                            className="auth-input"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat new password"
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Updating...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 4 && (
                        <div className="text-center py-4">
                            <div style={{fontSize: '60px', color: '#10b981', margin: '0 auto 20px', display: 'flex', justifyContent: 'center'}}><FaCheckCircle /></div>
                            <h2>Success!</h2>
                            <p className="subtitle">Your password has been reset successfully. You can now login with your new credentials.</p>
                            <Link href="/login" className="btn-submit d-block text-decoration-none">Go to Login</Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
