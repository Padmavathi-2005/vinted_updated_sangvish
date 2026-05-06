'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/utils/axios';
import Meta from '@/components/common/Meta';
import { useSettings } from '@/context/SettingsContext';
import { safeString } from '@/utils/constants';
import '@/app/styles/DynamicPage.css';

const DynamicPage = () => {
    const { slug } = useParams();
    const router = useRouter();
    const { settings } = useSettings();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/pages/${slug}`);
                setPage(data);
            } catch (error) {
                console.error('Page not found', error);
                router.push('/404');
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchPage();
    }, [slug, router]);

    if (loading) {
        return (
            <div className="dp-loading-screen">
                <div className="dp-loading-pulse">
                    <div className="dp-pulse-ring" />
                    <div className="dp-pulse-ring dp-pulse-ring-2" />
                    <div className="dp-pulse-core" />
                </div>
                <p className="dp-loading-text">Loading page...</p>
            </div>
        );
    }

    if (!page) return null;

    return (
        <>
            <Meta 
                title={safeString(page.title)} 
                description={safeString(page.content).substring(0, 160).replace(/<[^>]*>?/gm, '')} 
            />

            <div className="dp-page">
                {/* ── Hero Banner ── */}
                <div className="dp-hero" style={{ 
                    background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.primary_color}dd 100%)` 
                }}>
                    <div className="dp-hero-bg-shapes">
                        <div className="dp-shape dp-shape-1" style={{ background: 'white' }} />
                        <div className="dp-shape dp-shape-2" style={{ background: 'white' }} />
                        <div className="dp-shape dp-shape-3" style={{ background: 'white' }} />
                    </div>
                    <div className="dp-hero-content">
                        <nav className="dp-breadcrumb">
                            <Link href="/" className="dp-bc-link">Home</Link>
                            <span className="dp-bc-sep">›</span>
                            <span className="dp-bc-current">{safeString(page.title)}</span>
                        </nav>
                        <h1 className="dp-hero-title">{safeString(page.title)}</h1>
                        <div className="dp-hero-meta">
                            {page.updated_at && (
                                <span className="dp-meta-chip">
                                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                                    </svg>
                                    Updated {new Date(page.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Article Body ── */}
                <div className="dp-body">
                    <div className="dp-article-card">
                        <div
                            className="dp-content ql-editor"
                            dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                    </div>

                    {/* ── Back Link ── */}
                    <div className="dp-footer-nav">
                        <Link href="/" className="dp-back-btn">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                            </svg>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default function DynamicPagePage() { return <DynamicPage />; }
