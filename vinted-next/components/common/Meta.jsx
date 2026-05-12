'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSettings } from '@/context/SettingsContext';
import { getImageUrl, safeString } from '@/utils/constants';

const Meta = ({ 
    title = "", 
    description = "", 
    image = "", 
    url = "",
    type = "website",
    keywords = ""
}) => {
    const { settings } = useSettings();
    const [currentUrl, setCurrentUrl] = useState(url);
    
    useEffect(() => {
        if (!url && typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, [url]);

    const siteName = safeString(settings.site_name, "Resale");
    const metaTitle = title ? `${safeString(title)} | ${siteName}` : siteName;

    // App Router compatibility: manually update title for Client-side navigation
    useEffect(() => {
        if (typeof document !== 'undefined' && metaTitle) {
            document.title = metaTitle;
        }
    }, [metaTitle]);
    const siteFavicon = settings.site_favicon ? getImageUrl(settings.site_favicon) : "/favicon.ico";
    const siteLogo = settings.site_logo ? getImageUrl(settings.site_logo) : "";
    const siteOgImage = settings.site_og_image ? getImageUrl(settings.site_og_image) : siteLogo;
    
    // Default values if props are missing
    const defaultDesc = "Join our community to buy and sell pre-loved fashion. Sustainable, affordable, and easy.";
    const metaDesc = safeString(description || settings?.site_description) || defaultDesc;
    const metaKeywords = safeString(keywords || settings?.site_keywords) || "marketplace, resale, fashion";
    
    // IMAGE HANDLING: Ensure it's absolute for social crawlers
    let metaImage = image;
    if (!metaImage && siteOgImage) {
        metaImage = siteOgImage;
    }
    
    const metaUrl = currentUrl;

    return (
        <Head>
            {/* Favicon */}
            <link rel="icon" href={siteFavicon} />
            <link rel="shortcut icon" href={siteFavicon} />
            <link rel="apple-touch-icon" href={siteFavicon} />

            {/* Standard Meta Tags */}
            <title>{metaTitle}</title>
            <meta name="title" content={metaTitle} />
            <meta name="description" content={metaDesc} />
            <meta name="keywords" content={metaKeywords} />
            <meta name="robots" content="index, follow" />
            
            {/* Open Graph / Facebook */}
            <meta property="og:url" content={metaUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDesc} />
            <meta property="og:image" content={metaImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={metaTitle} />
            <meta name="twitter:description" content={metaDesc} />
            <meta name="twitter:image" content={metaImage} />
            <meta name="twitter:url" content={metaUrl} />
            
            {/* Robots & Viewport */}
            <meta name="robots" content="index, follow" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            
            {/* Canonical Link */}
            {metaUrl && <link rel="canonical" href={metaUrl} />}
        </Head>
    );
};

export default Meta;
