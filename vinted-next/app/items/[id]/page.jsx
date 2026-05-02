import React, { Suspense } from 'react';
import ItemDetailContent from '@/components/items/ItemDetailContent';

export async function generateMetadata({ params }) {
  const { id } = await params;
  // In a real app, you might fetch the item title here for SEO.
  // For now, using a generic title.
  return {
    title: 'Item Details',
    description: 'Explore this item on Vinted Marketplace.',
  };
}

export default function ItemPage() {
  return (
    <Suspense fallback={<div className="container mt-5 pt-5 text-center">Loading item details...</div>}>
      <ItemDetailContent />
    </Suspense>
  );
}
