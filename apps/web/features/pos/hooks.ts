'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from './api';
import { queryKeys } from '../../lib/query/keys';
import { useRealtime } from '../../hooks/useRealtime';
import type { POSCheckoutPayload, POSCustomer } from './types';

export const posQueryKeys = {
  products: (params?: { category?: string; search?: string }) => [
    'pos',
    'products',
    params?.category || 'ALL',
    params?.search || ''
  ],
  customers: () => ['pos', 'customers'],
  stores: () => ['pos', 'stores']
};

export function usePOSProductsQuery(params?: { category?: string; search?: string }) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: posQueryKeys.products(params),
    queryFn: () => posApi.getProducts(params),
    staleTime: 60 * 1000 // 1 minute
  });

  // Targeted realtime invalidation for catalog updates
  useEffect(() => {
    const unsubProductUpdated = subscribe('product_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
    });

    const unsubInventoryUpdated = subscribe('inventory_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
    });

    return () => {
      unsubProductUpdated();
      unsubInventoryUpdated();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function usePOSCustomersQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: posQueryKeys.customers(),
    queryFn: () => posApi.getCustomers(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  useEffect(() => {
    const unsubCustomer = subscribe('customer_updated', () => {
      queryClient.invalidateQueries({ queryKey: posQueryKeys.customers() });
    });
    return () => {
      unsubCustomer();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function usePOSStoresQuery() {
  return useQuery({
    queryKey: posQueryKeys.stores(),
    queryFn: () => posApi.getStores(),
    staleTime: 10 * 60 * 1000
  });
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: POSCheckoutPayload) => posApi.createInvoice(payload),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; phone: string; email?: string; address?: string }) =>
      posApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posQueryKeys.customers() });
    }
  });
}
