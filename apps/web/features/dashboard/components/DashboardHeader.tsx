'use client';

import React from 'react';
import { Store, RefreshCw } from 'lucide-react';
import { PageHeader, Button, Badge } from '../../../components/ui';

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
      description="Real-time synchronized revenue, margin valuations, inventory ledger, and procurement flow."
      badge={
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
          <Store className="w-3.5 h-3.5 text-blue-400" />
          <span>{storeLabel}</span>
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
