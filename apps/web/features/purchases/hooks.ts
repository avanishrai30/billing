'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from './api';
import { queryKeys } from '../../lib/query/keys';
import { useRealtime } from '../../hooks/useRealtime';
import type { PurchaseFilterParams } from './types';

export function usePurchasesQuery(params?: PurchaseFilterParams) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: queryKeys.purchases(params as Record<string, any>),
    queryFn: () => purchasesApi.getPurchases(params),
    staleTime: 30 * 1000
  });

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    };

    const unsubCreated = subscribe('purchase_created', invalidate);
    const unsubDeleted = subscribe('purchase_deleted', invalidate);

    return () => {
      unsubCreated();
      unsubDeleted();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function usePurchaseQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.purchase(id || ''),
    queryFn: () => purchasesApi.getPurchaseById(id!),
    enabled: !!id
  });
}

export function useCreatePurchaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, any>) => purchasesApi.createPurchase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

export function useVoidPurchaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => purchasesApi.voidPurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

export function usePurchaseLookups() {
  const suppliersQuery = useQuery({
    queryKey: queryKeys.suppliers(),
    queryFn: () => purchasesApi.getSuppliers(),
    staleTime: 5 * 60 * 1000
  });

  const storesQuery = useQuery({
    queryKey: queryKeys.stores(),
    queryFn: () => purchasesApi.getStores(),
    staleTime: 5 * 60 * 1000
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.products(),
    queryFn: () => purchasesApi.getProducts(),
    staleTime: 2 * 60 * 1000
  });

  return {
    suppliers: suppliersQuery.data || [],
    stores: storesQuery.data || [],
    products: productsQuery.data || [],
    isLoadingLookups:
      suppliersQuery.isLoading || storesQuery.isLoading || productsQuery.isLoading
  };
}
