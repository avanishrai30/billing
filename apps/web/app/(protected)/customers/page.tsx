'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function CustomersPage() {
  return (
    <PlaceholderView
      title="Customer CRM"
      description="Customer directory, phone lookups, store credit balances, and transaction history"
      phase="Phase 9"
      endpoint="/api/v1/customers"
    />
  );
}
