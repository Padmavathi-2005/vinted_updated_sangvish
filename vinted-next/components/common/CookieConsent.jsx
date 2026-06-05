'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import axios from '@/utils/axios';
import AuthContext from '@/context/AuthContext';
import { safeString } from '@/utils/constants';

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
            const hasAcceptedLocal = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

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
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'true');
        }

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
            <div className="cookie-backdrop" />

            <div className="cookie-banner-wrapper">
                <div className="cookie-banner-content">
                    <div className="cookie-container">
                        <div className="cookie-info-section">
                            <img
                                src="/eaten_cookie.png"
                                alt="Cookie"
                                className="cookie-image"
                            />
                            <div className="cookie-text-content">
                                <h1 className="cookie-heading">
                                    {safeString(settings?.cookie_heading, 'Better experience with cookies')}
                                </h1>
                                <p 
                                    className="cookie-message"
                                    dangerouslySetInnerHTML={{ __html: safeString(settings?.cookie_message, 'Our website uses cookies to improve your experience and show you relevant content. To continue, please accept our use of cookies.') }}
                                />
                                {cookiePage && (
                                    <Link
                                        href={`/pages/${cookiePage.slug}`}
                                        className="cookie-link mt-2 d-inline-block"
                                    >
                                        Cookies
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="cookie-action-section">
                            <button
                                onClick={handleAccept}
                                className="cookie-accept-btn"
                            >
                                {safeString(settings?.cookie_button_text, 'Accept All')}
                            </button>
                        </div>
                    </div>
                </div>
                <style>{`
                    .cookie-backdrop {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 9998;
                        background-color: rgba(0,0,0,0.45);
                        animation: fadeInOverlay 0.6s ease;
                        cursor: default;
                    }
                    .cookie-banner-wrapper {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        z-index: 9999;
                        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .cookie-banner-content {
                        background-color: #ffffff;
                        padding: 24px 0;
                        box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
                        border-top: 1px solid #e2e8f0;
                    }
                    .cookie-container {
                        max-width: 1200px;
                        margin: 0 auto;
                        width: 90%;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 24px;
                    }
                    .cookie-info-section {
                        flex: 1;
                        display: flex;
                        gap: 20px;
                        align-items: center;
                    }
                    .cookie-image {
                        width: 50px;
                        height: 50px;
                        object-fit: contain;
                        flex-shrink: 0;
                    }
                    .cookie-heading {
                        margin: 0 0 4px 0;
                        color: #0f172a;
                        font-size: 1.4rem;
                        font-weight: 700;
                        letter-spacing: -0.02em;
                        line-height: 1.2;
                    }
                    .cookie-message {
                        margin: 0;
                        color: #64748b;
                        font-size: 0.95rem;
                        font-weight: 500;
                        line-height: 1.5;
                        max-width: 800px;
                    }
                    .cookie-link {
                        color: #3b82f6;
                        text-decoration: underline;
                        text-underline-offset: 4px;
                        font-weight: 600;
                    }
                    .cookie-action-section {
                        display: flex;
                        align-items: center;
                        flex-shrink: 0;
                    }
                    .cookie-accept-btn {
                        background-color: ${settings?.primary_color || '#000000'};
                        color: white;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 12px;
                        font-size: 0.95rem;
                        font-weight: 700;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.2s ease;
                        box-shadow: 0 4px 12px ${settings?.primary_color ? settings.primary_color + '30' : 'rgba(0,0,0,0.1)'};
                    }
                    .cookie-accept-btn:hover {
                        filter: brightness(1.1);
                        transform: translateY(-1px);
                    }

                    @keyframes fadeInOverlay {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }

                    /* Responsive Styles */
                    @media (max-width: 768px) {
                        .cookie-container {
                            flex-direction: column;
                            text-align: center;
                            gap: 16px;
                        }
                        .cookie-info-section {
                            flex-direction: column;
                            gap: 12px;
                        }
                        .cookie-image {
                            width: 60px;
                            height: 60px;
                        }
                        .cookie-heading {
                            font-size: 1.2rem;
                        }
                        .cookie-message {
                            font-size: 0.9rem;
                        }
                        .cookie-action-section {
                            width: 100%;
                            justify-content: center;
                        }
                        .cookie-accept-btn {
                            width: 100%;
                            padding: 14px 20px;
                        }
                    }
                `}</style>
            </div>
        </>
    );
};

export default CookieConsent;
