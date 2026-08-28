'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type {
  StockAdjustmentPayload,
  StockTransferPayload,
  CommandCenterData
} from './types';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  commandCenter: (locationId?: string) => ['inventory', 'command-center', locationId || 'all'] as const,
  summary: (locationId?: string) => ['inventory', 'summary', locationId || 'all'] as const,
  balances: (locationId?: string) => ['inventory', 'balances', locationId || 'all'] as const,
  logs: (params?: { productId?: string; locationId?: string; type?: string }) =>
    [
      'inventory',
      'logs',
      params?.productId || 'all',
      params?.locationId || 'all',
      params?.type || 'ALL'
    ] as const
};

/**
 * Hook to query Multi-Store Consolidated Command Center data with Realtime invalidation
 */
export function useInventoryCommandCenterQuery(locationId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery<CommandCenterData, Error>({
    queryKey: inventoryQueryKeys.commandCenter(locationId),
    queryFn: () => inventoryApi.getCommandCenter(locationId),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('inventory.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'command-center'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });
    const unsubBulk = subscribe('inventory.bulk_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'command-center'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });
    const unsubProd = subscribe('product_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'command-center'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });
    const unsubProdDel = subscribe('product_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'command-center'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });

    return () => {
      unsubUpdated();
      unsubBulk();
      unsubProd();
      unsubProdDel();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useInventorySummaryQuery(locationId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: inventoryQueryKeys.summary(locationId),
    queryFn: () => inventoryApi.getSummary(locationId),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('inventory.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    });
    const unsubBulk = subscribe('inventory.bulk_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    });

    return () => {
      unsubUpdated();
      unsubBulk();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useInventoryBalancesQuery(locationId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: inventoryQueryKeys.balances(locationId),
    queryFn: () => inventoryApi.listBalances(locationId),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('inventory.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });
    const unsubBulk = subscribe('inventory.bulk_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });
    const unsubProd = subscribe('product_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
    });

    return () => {
      unsubUpdated();
      unsubBulk();
      unsubProd();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useInventoryLogsQuery(params?: {
  productId?: string;
  locationId?: string;
  type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: inventoryQueryKeys.logs(params),
    queryFn: () => inventoryApi.getLogs(params || {}),
    staleTime: 30 * 1000
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StockAdjustmentPayload) => inventoryApi.adjustStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    }
  });
}

export function useTransferStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StockTransferPayload) => inventoryApi.transferStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    }
  });
}
