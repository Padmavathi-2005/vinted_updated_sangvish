import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Providers } from './providers';
import LayoutWrapper from './LayoutWrapper';

import { BASE_URL, getImageUrl, safeString } from '@/utils/constants';

export const revalidate = 0; // Force Next.js to always fetch fresh metadata

export async function generateMetadata() {
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, { cache: 'no-store' });
    const settings = await res.json();

    const siteName = safeString(settings?.site_name, 'Resale');
    const siteLogo = settings?.site_logo ? getImageUrl(settings.site_logo) : `${BASE_URL}/images/site/logo.png`;
    const siteOgImage = settings?.site_og_image ? getImageUrl(settings.site_og_image) : siteLogo;
    const siteFavicon = settings?.site_favicon ? getImageUrl(settings.site_favicon) : '/favicon.ico';

    return {
      title: {
        default: siteName,
        template: `%s | ${siteName}`,
      },
      description: safeString(settings?.site_description) || 'Buy and sell pre-loved fashion.',
      keywords: safeString(settings?.site_keywords) || 'marketplace, resale, fashion, pre-loved, sustainable',
      icons: {
        icon: [
          { url: siteFavicon },
          { url: siteFavicon, rel: 'shortcut icon' },
        ],
        apple: [
          { url: siteFavicon, sizes: '180x180', type: 'image/png' },
        ],
      },
      openGraph: {
        title: siteName,
        description: safeString(settings?.site_description) || 'Buy and sell pre-loved fashion.',
        url: BASE_URL,
        siteName: siteName,
        images: [
          {
            url: siteOgImage,
            width: 1200,
            height: 630,
            alt: siteName,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: siteName,
        description: safeString(settings?.site_description) || 'Buy and sell pre-loved fashion.',
        images: [siteOgImage],
      },
    };
  } catch (error) {
    return {
      title: {
        default: 'Resale',
        template: '%s | Resale',
      },
      description: 'Buy and sell pre-loved fashion.',
    };
  }
}

import Script from 'next/script';

export default async function RootLayout({ children }) {
  let primaryColor = null;
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, { cache: 'no-store' });
    const settings = await res.json();
    if (settings?.primary_color) {
      primaryColor = settings.primary_color;
    }
  } catch (error) {}

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {primaryColor && (
          <style dangerouslySetInnerHTML={{ __html: `:root { --primary-color: ${primaryColor}; }` }} />
        )}
      </head>
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            try {
              var cached = localStorage.getItem('site_settings');
              if (cached) {
                var settings = JSON.parse(cached);
                if (settings.primary_color) {
                  document.documentElement.style.setProperty('--primary-color', settings.primary_color);
                }
              }
            } catch(e) {}
          `}
        </Script>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
