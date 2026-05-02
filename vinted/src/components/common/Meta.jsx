import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../../context/SettingsContext';
import { getImageUrl, safeString } from '../../utils/constants';

const Meta = ({ 
    title = "", 
    description = "", 
    image = "", 
    url = window.location.href,
    type = "website"
}) => {
    const { settings } = useSettings();
    const siteName = safeString(settings.site_name, "Resale");
    const siteUrl = settings.site_url || window.location.origin;
    const siteFavicon = settings.site_favicon ? getImageUrl(settings.site_favicon) : "/vite.svg";
    const siteLogo = settings.site_logo ? getImageUrl(settings.site_logo) : "";
    
    // Default values if props are missing
    const metaTitle = title ? `${title} | ${siteName}` : siteName;
    const defaultDesc = "Join our community to buy and sell pre-loved fashion. Sustainable, affordable, and easy.";
    const metaDesc = description || defaultDesc;
    
    // IMAGE HANDLING: Ensure it's absolute for social crawlers
    let metaImage = image;
    if (!metaImage && siteLogo) {
        metaImage = siteLogo;
    }
    if (!metaImage) {
        // Fallback to a generic OG image if no logo is available
        metaImage = `${siteUrl}/og-image.jpg`;
    }
    
    // Ensure image is an absolute URL
    if (metaImage && !metaImage.startsWith('http')) {
        const base = (settings.site_url || window.location.origin).replace(/\/+$/, '');
        metaImage = `${base}/${metaImage.replace(/^\/+/, '')}`;
    }

    const metaUrl = url || window.location.href;

    return (
        <Helmet>
            {/* Favicon */}
            <link rel="icon" type="image/png" href={siteFavicon} />

            {/* Standard Meta Tags */}
            <title>{metaTitle}</title>
            <meta name="title" content={metaTitle} />
            <meta name="description" content={metaDesc} />
            
            {/* Open Graph / Facebook */}
            <meta property="og:url" content={metaUrl} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={metaTitle} />
            <meta property="og:description" content={metaDesc} />
            <meta property="og:image" content={metaImage} />
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
            <link rel="canonical" href={metaUrl} />
        </Helmet>
    );
};

export default Meta;
