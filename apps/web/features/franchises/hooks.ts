'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { franchiseApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { FranchiseFormPayload, SupplyOrderFormPayload } from './types';

export const franchiseQueryKeys = {
  all: ['franchises'] as const,
  list: () => ['franchises', 'list'] as const,
  detail: (id: string) => ['franchises', 'detail', id] as const,
  supplyOrders: () => ['franchise-supply-orders', 'list'] as const
};

export function useFranchisesQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: franchiseQueryKeys.list(),
    queryFn: () => franchiseApi.getFranchises(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('franchise_updated', () => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.all });
    });
    const unsubDeleted = subscribe('franchise_deleted', () => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.all });
    });

    return () => {
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useFranchiseQuery(id?: string) {
  return useQuery({
    queryKey: franchiseQueryKeys.detail(id || ''),
    queryFn: () => franchiseApi.getFranchiseById(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000
  });
}

export function useSaveFranchiseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FranchiseFormPayload) => franchiseApi.saveFranchise(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.list() });
      if (data?.franchise?.id) {
        queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.detail(data.franchise.id) });
      }
    }
  });
}

export function useDeleteFranchiseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => franchiseApi.deleteFranchise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.all });
    }
  });
}

export function useSupplyOrdersQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: franchiseQueryKeys.supplyOrders(),
    queryFn: () => franchiseApi.getSupplyOrders(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubCreated = subscribe('franchise_order_created', () => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.supplyOrders() });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    });

    return () => {
      unsubCreated();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useCreateSupplyOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplyOrderFormPayload) => franchiseApi.createSupplyOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: franchiseQueryKeys.supplyOrders() });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    }
  });
}
