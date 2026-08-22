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
import { ErrorState, AccessDeniedState } from '../../../components/ui';
import { useStoreScope } from '../../../providers/StoreScopeProvider';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const canView = hasPermission('dashboard.view');
  const canViewInventory = hasPermission('inventory.view');
  const canViewInvoices = hasPermission('invoices.view');
  const canViewPurchases = hasPermission('purchases.view');
  const { activeStoreId } = useStoreScope();
  const storeId = activeStoreId || user?.assignedStoreId || 'all';

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useDashboardMetrics(storeId, { enabled: canView });

  if (!canView) {
    return (
      <AccessDeniedState
        title="Dashboard Overview Restricted"
        message="Your role permissions do not authorize viewing executive operational metrics and sales analytics."
        requiredPermission="dashboard.view"
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader
        storeId={storeId}
        isRefetching={isFetching}
        onRefresh={() => refetch()}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <ErrorState
          title="Dashboard Aggregation Error"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to aggregate enterprise dashboard KPIs from the store sync gateway.'
          }
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <KPIGrid metrics={data.metrics} />

          {canViewInvoices && <SalesSummaryChart metrics={data.metrics} />}

          {canViewInventory && <LowStockWatchlist items={data.lowStockWatchlist || []} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {canViewInvoices && <RecentSalesTable invoices={data.recentInvoices || []} />}
            {canViewPurchases && <RecentPurchasesTable purchases={data.recentPurchases || []} />}
          </div>
        </>
      )}
    </div>
  );
}
