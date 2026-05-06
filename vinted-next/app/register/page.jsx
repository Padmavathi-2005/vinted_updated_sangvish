'use client';

import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useContext, useEffect } from 'react';
import axios from '@/utils/axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle, FaApple, FaFacebookSquare, FaKey, FaArrowLeft } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import AuthContext from '@/context/AuthContext';
import useRecaptcha from '@/hooks/useRecaptcha';
import { validateTextField, validateAlphaField, getAlphaError, getTextFieldError } from '@/utils/validation';
import Meta from '@/components/common/Meta';
import '@/app/styles/Auth.css';

export default function Register() {
    const { login } = useContext(AuthContext);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ 
        username: '', 
        first_name: '', 
        last_name: '', 
        email: '', 
        password: '',
        otp: ''
    });
    const [signupToken, setSignupToken] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [socialSettings, setSocialSettings] = useState(null);
    const [recaptchaSettings, setRecaptchaSettings] = useState({ 
        recaptcha_enabled: false, 
        recaptcha_site_key: '' 
    });
    const router = useRouter();
    const { username, first_name, last_name, email, password, otp } = formData;
    const { executeRecaptcha } = useRecaptcha(recaptchaSettings?.recaptcha_site_key, recaptchaSettings?.recaptcha_enabled);

    useEffect(() => {
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
                console.error("Failed to fetch register settings", err);
            }
        };
        fetchSettings();
    }, []);

    const onChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!email || !username || !password) {
            return setError('Please fill all required fields');
        }

        if (!validateTextField(username)) {
            return setError(getTextFieldError('Display Name'));
        }

        if (first_name && !validateAlphaField(first_name)) {
            return setError(getAlphaError('First Name'));
        }

        if (last_name && !validateAlphaField(last_name)) {
            return setError(getAlphaError('Last Name'));
        }
        setLoading(true);
        setError('');
        try {
            let captchaToken = '';

            if (recaptchaSettings?.recaptcha_enabled) {
                captchaToken = await executeRecaptcha('register');
                if (!captchaToken) {
                    setError('Security verification failed. This might be due to an invalid reCAPTCHA Site Key or network issue. Please check your admin settings.');
                    setLoading(false);
                    return;
                }
            }

            const response = await axios.post('/api/users/send-signup-otp', { email, captchaToken });
            if (response.data.signupToken) {
                setSignupToken(response.data.signupToken);
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/users', { 
                username, 
                email, 
                password,
                first_name,
                last_name,
                otp,
                signupToken
            });
            if (response.data) {
                login(response.data);
                router.push('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Meta title="Register" description="Join our community to buy and sell pre-loved fashion." />
            <div className="auth-page">
                <div className="auth-card">
                    {step === 2 && (
                        <div className="auth-back mb-3">
                            <span onClick={() => setStep(1)} style={{cursor: 'pointer', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <FaArrowLeft size={12} /> Edit Details
                            </span>
                        </div>
                    )}
                    
                    <h2 className="text-center">{step === 1 ? 'Create Account' : 'Verify Email'}</h2>
                    <p className="subtitle text-center">
                        {step === 1 ? 'Join our marketplace community today' : `We've sent a code to ${email}`}
                    </p>

                    {step === 1 && (socialSettings?.google_enabled || socialSettings?.facebook_enabled || socialSettings?.twitter_enabled || socialSettings?.apple_enabled) && (
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
                            <div className="divider"><span>Or sign up with email</span></div>
                        </>
                    )}

                    <form onSubmit={step === 1 ? handleSendOTP : onSubmit}>
                        {error && <div className="auth-error">{error}</div>}

                        {step === 1 ? (
                            <>
                                <div className="auth-field">
                                    <label className="auth-label">Display Name</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaUser /></span>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            name="username"
                                            value={username}
                                            placeholder="style_lover"
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="auth-field">
                                            <label className="auth-label">First Name</label>
                                            <div className="auth-input-wrapper">
                                                <span className="auth-icon"><FaUser /></span>
                                                <input
                                                    type="text"
                                                    className="auth-input"
                                                    name="first_name"
                                                    value={first_name}
                                                    placeholder="John"
                                                    onChange={onChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="auth-field">
                                            <label className="auth-label">Last Name</label>
                                            <div className="auth-input-wrapper">
                                                <span className="auth-icon"><FaUser /></span>
                                                <input
                                                    type="text"
                                                    className="auth-input"
                                                    name="last_name"
                                                    value={last_name}
                                                    placeholder="Doe"
                                                    onChange={onChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

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
                                    <label className="auth-label">Password</label>
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
                                </div>

                                <div className="auth-terms">
                                    By creating an account, you agree to our{' '}
                                    <Link href="/terms">Terms of Service</Link> and{' '}
                                    <Link href="/privacy">Privacy Policy</Link>.
                                </div>

                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Checking Email...' : 'Continue to Verify'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="auth-field">
                                    <label className="auth-label">Enter 6-Digit Code</label>
                                    <div className="auth-input-wrapper">
                                        <span className="auth-icon"><FaKey /></span>
                                        <input
                                            type="text"
                                            className="auth-input"
                                            name="otp"
                                            value={otp}
                                            placeholder="000000"
                                            maxLength="6"
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                    <p className="mt-2" style={{fontSize: '13px', color: '#64748b'}}>
                                        Check your inbox (and spam folder) for the verification code.
                                    </p>
                                </div>

                                <button type="submit" className="btn-submit" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Complete Registration'}
                                </button>

                                <p className="text-center mt-3" style={{fontSize: '14px', color: '#64748b'}}>
                                    Didn't receive it? <span onClick={handleSendOTP} style={{color: '#0ea5e9', cursor: 'pointer', fontWeight: '500'}}>Resend Code</span>
                                </p>
                            </>
                        )}
                    </form>

                    <div className="auth-footer">
                        <span>Already have an account? </span>
                        <Link href="/login">Log in</Link>
                    </div>
                </div>
            </div>
        </>
    );
}
