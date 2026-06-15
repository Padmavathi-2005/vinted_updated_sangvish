import React, { Suspense } from 'react';
import ProductsContent from '@/components/products/ProductsContent';

export const metadata = {
  title: 'Filter Products',
  description: 'Filter our curated collection of pre-loved fashion items.',
};

export default function FilterPage() {
  return (
    <Suspense fallback={<div className="container mt-5 pt-5 text-center">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
