'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function SuppliersPage() {
  return (
    <PlaceholderView
      title="Supplier & Vendor Directory"
      description="Supplier contacts, GSTIN records, ledger summaries, and procurement histories"
      phase="Phase 10"
      endpoint="/api/v1/suppliers"
    />
  );
}
