'use client';

import React from 'react';
import { PlaceholderView } from '../../../components/layout/PlaceholderView';

export default function DashboardPage() {
  return (
    <PlaceholderView
      title="Dashboard & Business Intelligence"
      description="Enterprise aggregated KPIs, financial metrics, and inventory valuations"
      phase="Phase 3"
      endpoint="/api/v1/dashboard/metrics"
    />
  );
}
