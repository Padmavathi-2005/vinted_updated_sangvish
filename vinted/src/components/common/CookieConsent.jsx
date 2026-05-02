import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../utils/axios';
import AuthContext from '../../context/AuthContext';
import { safeString } from '../../utils/constants';

const CookieConsent = () => {
    const { user, updateUser } = useContext(AuthContext);
    const [isVisible, setIsVisible] = useState(false);
    const [settings, setSettings] = useState(null);
    const [cookiePage, setCookiePage] = useState(null);

    // Using v2 key to force-reset for the user who requested clear
    const STORAGE_KEY = 'vinted_cookie_consent_v2';

    useEffect(() => {
        const checkConsent = async () => {
            // 1. Check LocalStorage
            const hasAcceptedLocal = localStorage.getItem(STORAGE_KEY);

            // 2. Check User Object (if logged in)
            const hasAcceptedUser = user?.cookie_consent;

            console.log("🍪 COOKIE DEBUG:", {
                hasAcceptedLocal,
                hasAcceptedUser,
                isLoggedIn: !!user
            });

            if (hasAcceptedLocal === 'true' || hasAcceptedUser === true) {
                console.log("🍪 COOKIE DEBUG: Consent already found. skipping.");
                return;
            }

            try {
                const { data } = await axios.get('/api/settings');
                setSettings(data);

                if (data.cookie_page_id) {
                    try {
                        const pageRes = await axios.get(`/api/pages/id/${data.cookie_page_id}`);
                        setCookiePage(pageRes.data);
                    } catch (e) {
                        console.error("Cookie page fetch failed", e);
                    }
                }

                setIsVisible(true);
            } catch (err) {
                console.error("Failed to fetch settings for cookie consent", err);
            }
        };

        checkConsent();
    }, [user, user?.cookie_consent]);

    const handleAccept = async () => {
        console.log("🍪 COOKIE ALERT: User accepted cookies.");

        // Save locally
        localStorage.setItem(STORAGE_KEY, 'true');

        // If logged in, sync to database so it stays accepted across devices
        if (user) {
            try {
                await axios.patch('/api/users/cookie-consent', { consent: true });
                // Update local context so it doesn't flicker or show again
                updateUser({ ...user, cookie_consent: true });
            } catch (err) {
                console.error("Failed to sync cookie consent to backend", err);
            }
        }

        setIsVisible(false);
    };

    if (!isVisible) return null;

    const pc = settings?.primary_color || '#0ea5e9';

    return (
        <>
            {/* Proper backdrop overlay for better focus and readability */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9998,
                backgroundColor: 'rgba(0,0,0,0.45)', // Darkened backdrop
                animation: 'fadeInOverlay 0.6s ease',
                cursor: 'default'
            }} />

            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '24px 0',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
                    borderTop: '1px solid #e2e8f0',
                }}>
                    <div style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        width: '90%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '24px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            gap: '20px',
                            alignItems: 'center',
                            minWidth: '280px'
                        }}>
                            <img
                                src="/eaten_cookie.png"
                                alt="Cookie"
                                style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                            />
                            <div>
                                <h1 style={{
                                    margin: '0 0 4px 0',
                                    color: '#0f172a',
                                    fontSize: '1.4rem',
                                    fontWeight: '700',
                                    letterSpacing: '-0.02em',
                                    lineHeight: '1.2'
                                }}>
                                    {safeString(settings?.cookie_heading, 'Better experience with cookies')}
                                </h1>
                                <p style={{
                                    margin: 0,
                                    color: '#64748b',
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    lineHeight: '1.5',
                                    maxWidth: '800px'
                                }}>
                                    {safeString(settings?.cookie_message, 'Our website uses cookies to improve your experience and show you relevant content. To continue, please accept our use of cookies.')}{' '}
                                    {cookiePage && (
                                        <Link
                                            to={`/pages/${cookiePage.slug}`}
                                            style={{
                                                color: '#3b82f6',
                                                textDecoration: 'underline',
                                                textUnderlineOffset: '4px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Cookies
                                        </Link>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                                onClick={handleAccept}
                                style={{
                                    backgroundColor: settings?.primary_color || '#000000',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 32px',
                                    borderRadius: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease',
                                    boxShadow: `0 4px 12px ${settings?.primary_color ? settings.primary_color + '30' : 'rgba(0,0,0,0.1)'}`,
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.filter = 'brightness(1.1)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.filter = 'brightness(1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {safeString(settings?.cookie_button_text, 'Accept All')}
                            </button>
                        </div>
                    </div>
                </div>
                <style>{`
                    @keyframes fadeInOverlay {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>
            </div>
        </>
    );
};

export default CookieConsent;
