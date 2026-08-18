'use client';

import React from 'react';
import { Store, RefreshCw, Activity } from 'lucide-react';
import { PageHeader, Button } from '../../../components/ui';

export interface DashboardHeaderProps {
  storeId?: string;
  isRefetching?: boolean;
  onRefresh?: () => void;
}

export function DashboardHeader({
  storeId = 'all',
  isRefetching = false,
  onRefresh
}: DashboardHeaderProps) {
  const storeLabel = storeId === 'all' ? 'All Stores (Enterprise)' : `Store: ${storeId}`;

  return (
    <PageHeader
      title="Business Intelligence & Operational KPIs"
      description="Revenue, margin, inventory risk, and procurement flow in one synchronized owner view."
      badge={
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.035)]">
          <Store className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono">{storeLabel}</span>
          <Activity className={`w-3.5 h-3.5 text-emerald-600 ${isRefetching ? 'animate-pulse' : ''}`} />
        </div>
      }
      actions={
        onRefresh && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={isRefetching}
            onClick={onRefresh}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />}
          >
            Sync Metrics
          </Button>
        )
      }
    />
  );
}
