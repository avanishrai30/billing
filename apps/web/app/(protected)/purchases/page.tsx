'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function PurchasesPage() {
  return (
    <PlaceholderView
      title="Supplier Purchases & Inward Stock"
      description="Procurement orders, supplier invoice tracking, stock batch ingestion, and voiding"
      phase="Phase 7"
      endpoint="/api/v1/purchases"
    />
  );
}
