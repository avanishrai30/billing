'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from './api';
import { queryKeys } from '../../lib/query/keys';
import { useRealtime } from '../../hooks/useRealtime';
import type { DashboardMetricsResponse } from './types';

export function useDashboardMetrics(storeId?: string, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();
  const enabled = options.enabled ?? true;

  const effectiveStoreId = storeId || 'all';

  const query = useQuery<DashboardMetricsResponse>({
    queryKey: queryKeys.dashboardMetrics(effectiveStoreId),
    queryFn: () => dashboardApi.getMetrics(effectiveStoreId),
    enabled,
    staleTime: 60 * 1000, // 1 minute fresh
    refetchOnWindowFocus: false
  });

  // Targeted Realtime Subscriptions for Dashboard Invalidation
  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled, subscribe, queryClient, effectiveStoreId]);

  return query;
}
