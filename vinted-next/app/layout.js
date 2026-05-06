import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Providers } from './providers';
import LayoutWrapper from './LayoutWrapper';

import { BASE_URL, getImageUrl, safeString } from '@/utils/constants';

export async function generateMetadata() {
  try {
    const res = await fetch(`${BASE_URL}/api/settings`, { cache: 'no-store' });
    const settings = await res.json();
    
    const siteName = safeString(settings?.site_name, 'Resale');
    const siteLogo = settings?.site_logo ? getImageUrl(settings.site_logo) : `${BASE_URL}/images/site/logo.png`;
    const siteFavicon = settings?.site_favicon ? getImageUrl(settings.site_favicon) : '/favicon.ico';

    return {
      title: {
        default: siteName,
        template: `%s | ${siteName}`,
      },
      description: settings?.site_description || 'Buy and sell pre-loved fashion.',
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
        description: settings?.site_description || 'Buy and sell pre-loved fashion.',
        url: BASE_URL,
        siteName: siteName,
        images: [
          {
            url: siteLogo,
            alt: siteName,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: siteName,
        description: settings?.site_description || 'Buy and sell pre-loved fashion.',
        images: [siteLogo],
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
