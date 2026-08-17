'use client';

import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';
import { AccessDeniedState } from '../../../components/ui';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('products.view');

  if (!canView) {
    return (
      <AccessDeniedState
        title="Product Master Restricted"
        message="Your role permissions do not authorize browsing catalog SKU master records."
        requiredPermission="products.view"
      />
    );
  }

  return (
    <PlaceholderView
      title="Product Master Catalog"
      description="SKU records, multi-barcode mappings, loose/packaged items, and bulk import pipeline"
      phase="Phase 5"
      endpoint="/api/v1/products"
    />
  );
}
