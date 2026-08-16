'use client';

import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useDashboardMetrics } from '../../../features/dashboard/hooks';
import {
  DashboardHeader,
  KPIGrid,
  SalesSummaryChart,
  LowStockWatchlist,
  RecentSalesTable,
  RecentPurchasesTable,
  DashboardSkeleton
} from '../../../features/dashboard/components';
import { ErrorState } from '../../../components/ui';

export default function DashboardPage() {
  const { user } = useAuth();
  const storeId = user?.assignedStoreId || 'all';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useDashboardMetrics(storeId);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : 'Failed to aggregate enterprise dashboard KPIs from the store sync gateway.';

    return (
      <div className="space-y-6">
        <DashboardHeader
          storeId={storeId}
          isRefetching={isFetching}
          onRefresh={() => refetch()}
        />
        <ErrorState
          title="Dashboard Aggregation Error"
          message={errorMsg}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { metrics, lowStockWatchlist, recentInvoices, recentPurchases } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header with Scope & Live Sync */}
      <DashboardHeader
        storeId={storeId}
        isRefetching={isFetching}
        onRefresh={() => refetch()}
      />

      {/* 2. Top Metric Cards (Financial + Operational) */}
      <KPIGrid metrics={metrics} />

      {/* 3. Analytics & Portfolio Distribution */}
      <SalesSummaryChart metrics={metrics} />

      {/* 4. Critical Stock Breaches Watchlist */}
      <LowStockWatchlist items={lowStockWatchlist} />

      {/* 5. Dual Activity Tables (Recent Sales & Purchases) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSalesTable invoices={recentInvoices} />
        <RecentPurchasesTable purchases={recentPurchases} />
      </div>
    </div>
  );
}
