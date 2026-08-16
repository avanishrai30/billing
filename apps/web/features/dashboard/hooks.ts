'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from './api';
import { queryKeys } from '../../lib/query/keys';
import { useRealtime } from '../../hooks/useRealtime';
import type { DashboardMetricsResponse } from './types';

export function useDashboardMetrics(storeId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const effectiveStoreId = storeId || 'all';

  const query = useQuery<DashboardMetricsResponse>({
    queryKey: queryKeys.dashboardMetrics(effectiveStoreId),
    queryFn: () => dashboardApi.getMetrics(effectiveStoreId),
    staleTime: 60 * 1000, // 1 minute fresh
    refetchOnWindowFocus: false
  });

  // Targeted Realtime Subscriptions for Dashboard Invalidation
  useEffect(() => {
    const invalidateDashboard = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboardMetrics(effectiveStoreId)
      });
    };

    const unsubInvoiceCreated = subscribe('invoice_created', invalidateDashboard);
    const unsubInvoiceVoided = subscribe('invoice_voided', invalidateDashboard);
    const unsubPurchaseCreated = subscribe('purchase_created', invalidateDashboard);
    const unsubPurchaseDeleted = subscribe('purchase_deleted', invalidateDashboard);
    const unsubInventoryUpdated = subscribe('inventory.updated', invalidateDashboard);

    return () => {
      unsubInvoiceCreated();
      unsubInvoiceVoided();
      unsubPurchaseCreated();
      unsubPurchaseDeleted();
      unsubInventoryUpdated();
    };
  }, [subscribe, queryClient, effectiveStoreId]);

  return query;
}
