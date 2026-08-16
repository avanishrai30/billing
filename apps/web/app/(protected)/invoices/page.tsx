'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function InvoicesPage() {
  return (
    <PlaceholderView
      title="Invoices & Transaction History"
      description="Store-scoped sales bills, customer search, thermal receipt reprints, PDF downloads, and void reversals"
      phase="Phase 8"
      endpoint="/api/v1/invoices"
    />
  );
}
