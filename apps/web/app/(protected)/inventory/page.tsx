'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function InventoryPage() {
  return (
    <PlaceholderView
      title="Inventory Management"
      description="Authoritative stock balances, manual cycle counts, inter-store transfers, and audit ledger"
      phase="Phase 6"
      endpoint="/api/v1/inventory"
    />
  );
}
