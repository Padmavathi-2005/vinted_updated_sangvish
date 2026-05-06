import React, { Suspense } from 'react';
import ItemDetailContent from '@/components/items/ItemDetailContent';

import { BASE_URL, getImageUrl, safeString } from '@/utils/constants';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    // 1. Fetch item details
    const res = await fetch(`${BASE_URL}/api/items/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Item not found');
    const item = await res.json();
    
    // 2. Fetch site settings for name
    const setRes = await fetch(`${BASE_URL}/api/settings`, { cache: 'no-store' });
    const settings = await setRes.json().catch(() => ({}));
    
    if (!item || !item.title) return { title: 'Item Not Found' };

    const siteName = safeString(settings?.site_name, 'Marketplace');
    const title = safeString(item.title);
    const description = safeString(item.short_description || item.description)?.substring(0, 160) || `Buy ${title} on ${siteName}.`;
    const image = item.images && item.images[0] ? getImageUrl(item.images[0]) : null;

    // Use template formatting from layout by just returning the product title
    return {
      title: title,
      description,
      openGraph: {
        title: `${title} | ${siteName}`,
        description,
        url: `${BASE_URL}/items/${item.slug || id}`,
        siteName: siteName,
        images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | ${siteName}`,
        description,
        images: image ? [image] : [],
      },
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return {
      title: 'Item Details',
    };
  }
}

export default function ItemPage() {
  return (
    <Suspense fallback={<div className="container mt-5 pt-5 text-center">Loading item details...</div>}>
      <ItemDetailContent />
    </Suspense>
  );
}
