'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function ProductsPage() {
  return (
    <PlaceholderView
      title="Product Master Catalog"
      description="SKU records, multi-barcode mappings, loose/packaged items, and bulk import pipeline"
      phase="Phase 5"
      endpoint="/api/v1/products"
    />
  );
}
