'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function PosPage() {
  return (
    <PlaceholderView
      title="POS Billing Terminal"
      description="Cashier checkout, barcode scanning, thermal printing, and transaction commit"
      phase="Phase 4"
      endpoint="/api/v1/invoices"
    />
  );
}
