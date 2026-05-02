import React, { Suspense } from 'react';
import ProductsContent from '@/components/products/ProductsContent';

export const metadata = {
  title: 'Shop Collection',
  description: 'Explore our curated collection of pre-loved fashion items.',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mt-5 pt-5 text-center">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
