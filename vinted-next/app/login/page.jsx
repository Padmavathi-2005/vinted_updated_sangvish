'use client';

import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useContext, useEffect, Suspense } from 'react';
import axios from '@/utils/axios';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaGoogle, FaApple, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaFacebookSquare } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import AuthContext from '@/context/AuthContext';
import useRecaptcha from '@/hooks/useRecaptcha';
import '@/app/styles/Auth.css';

const LoginContent = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [socialSettings, setSocialSettings] = useState(null);
    const [recaptchaSettings, setRecaptchaSettings] = useState({ 
        recaptcha_enabled: false, 
        recaptcha_site_key: '' 
    });
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const { email, password } = formData;

    const { executeRecaptcha } = useRecaptcha(recaptchaSettings?.recaptcha_site_key, recaptchaSettings?.recaptcha_enabled);

    useEffect(() => {
        // Safe access to environment variables in Next.js
        setRecaptchaSettings({
            recaptcha_enabled: process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true',
            recaptcha_site_key: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''
        });

        const fetchSettings = async () => {
            try {
                const [socialRes, recaptchaRes] = await Promise.all([
                    axios.get('/api/settings/social_login_settings'),
                    axios.get('/api/settings/recaptcha_settings')
                ]);
                
                if (socialRes.data) setSocialSettings(socialRes.data);
                if (recaptchaRes.data) {
                    setRecaptchaSettings(prev => ({
                        ...prev,
                        ...recaptchaRes.data,
                        recaptcha_site_key: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || recaptchaRes.data.recaptcha_site_key
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch login settings", err);
            }
        };

        const socialToken = searchParams.get('social_token');
        const socialError = searchParams.get('error');

        if (socialToken) {
            login({ token: socialToken }, rememberMe);
            router.push('/');
        } else if (socialError) {
            setError(socialError);
            router.replace('/login');
        }

        fetchSettings();
    }, [login, router, rememberMe, searchParams]);

    const onChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            let captchaToken = '';

            if (recaptchaSettings?.recaptcha_enabled) {
                captchaToken = await executeRecaptcha('login');
                if (!captchaToken) {
                    setError('Security verification failed. This might be due to an invalid reCAPTCHA Site Key or network issue. Please check your admin settings.');
                    return;
                }
            }

            const response = await axios.post('/api/users/login', {
                ...formData,
                captchaToken
            });

            if (response.data) {
                login(response.data, rememberMe);
                router.push('/');
            }
        } catch (err) {
            console.error("Login Error Details:", err.response);
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="text-center">Welcome Back</h2>
                <p className="subtitle text-center">Securely access your marketplace account</p>

                {(socialSettings?.google_enabled || socialSettings?.facebook_enabled || socialSettings?.twitter_enabled || socialSettings?.apple_enabled) && (
                    <>
                        <div className="social-buttons">
                            {socialSettings?.google_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/google`}><FaGoogle /> Google</button>
                            )}
                            {socialSettings?.facebook_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/facebook`}><FaFacebookSquare style={{ color: '#1877F2' }} /> Facebook</button>
                            )}
                            {socialSettings?.twitter_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/twitter`}><FaXTwitter style={{ color: '#000000' }} /> X</button>
                            )}
                            {socialSettings?.apple_enabled && (
                                <button type="button" className="social-btn" onClick={() => window.location.href = `${axios.defaults.baseURL}/api/auth/apple`}><FaApple className="text-dark" /> Apple</button>
                            )}
                        </div>
                        <div className="divider"><span>Or continue with email</span></div>
                    </>
                )}

                <form onSubmit={onSubmit}>
                    {error && <div className="auth-error">{error}</div>}

                    <div className="auth-field">
                        <label className="auth-label">Email Address</label>
                        <div className="auth-input-wrapper">
                            <span className="auth-icon"><FaEnvelope /></span>
                            <input
                                type="email"
                                className="auth-input"
                                name="email"
                                value={email}
                                placeholder="user@email.com"
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-field">
                        <div className="auth-label-row">
                            <label className="auth-label">Password</label>
                        </div>
                        <div className="auth-input-wrapper">
                            <span className="auth-icon"><FaLock /></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="auth-input"
                                name="password"
                                value={password}
                                placeholder="Min. 6 characters"
                                onChange={onChange}
                                required
                            />
                            <span
                                className="auth-icon auth-icon-right"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                        <div className="d-flex justify-content-end mt-2">
                            <Link href="/forgot-password" style={{fontSize: '13px', color: '#0ea5e9', fontWeight: '500', textDecoration: 'none'}}>Forgot password?</Link>
                        </div>
                    </div>

                    <div className="auth-remember">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="rememberMe">Keep me logged in</label>
                    </div>

                    <button type="submit" className="btn-submit">Login to Account</button>
                </form>

                <div className="auth-footer">
                    <span>Don't have an account? </span>
                    <Link href="/register">Create an account</Link>
                </div>
            </div>
        </div>
    );
};

export default function Login() {
    return (
        <Suspense fallback={<div className="d-flex justify-content-center p-5"><div className="spinner-border text-primary" /></div>}>
            <title>Login | Resale Marketplace</title>
            <meta name="description" content="Sign in to your account to buy and sell pre-loved fashion." />
            <LoginContent />
        </Suspense>
    );
}
