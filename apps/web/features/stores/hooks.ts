'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { StoreFormPayload } from './types';

export const storeQueryKeys = {
  all: ['stores'] as const,
  list: () => ['stores', 'list'] as const,
  summary: () => ['stores', 'summary'] as const,
  detail: (id: string) => ['store', id] as const,
  employees: (storeId: string) => ['stores', storeId, 'employees'] as const
};

export function useStoresQuery(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();
  const enabled = options.enabled ?? true;

  const query = useQuery({
    queryKey: storeQueryKeys.list(),
    queryFn: () => storesApi.getStores(),
    enabled,
    staleTime: 60 * 1000
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubUpdated = subscribe('store_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    });

    const unsubDeleted = subscribe('store_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    });

    const unsubMembership = subscribe('store_membership_updated', (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      if (payload?.storeId) {
        queryClient.invalidateQueries({ queryKey: storeQueryKeys.employees(payload.storeId) });
      }
    });

    return () => {
      unsubUpdated();
      unsubDeleted();
      unsubMembership();
    };
  }, [enabled, subscribe, queryClient]);

  return query;
}

export function useStoreSummaryQuery(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  return useQuery({
    queryKey: storeQueryKeys.summary(),
    queryFn: () => storesApi.getStoreSummary(),
    enabled,
    staleTime: 60 * 1000
  });
}

export function useStoreDetailQuery(id?: string) {
  return useQuery({
    queryKey: storeQueryKeys.detail(id || ''),
    queryFn: () => storesApi.getStoreById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}

export function useStoreEmployeesQuery(storeId?: string) {
  return useQuery({
    queryKey: storeQueryKeys.employees(storeId || ''),
    queryFn: () => storesApi.getStoreEmployees(storeId!),
    enabled: !!storeId,
    staleTime: 30 * 1000
  });
}

export function useCreateStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StoreFormPayload) => storesApi.createStore(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      if (res.store?.id) {
        queryClient.invalidateQueries({ queryKey: ['store', res.store.id] });
      }
    }
  });
}

export function useUpdateStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StoreFormPayload> }) =>
      storesApi.updateStore(id, payload),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['store', variables.id] });
    }
  });
}

export function useDeleteStoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => storesApi.deleteStore(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.removeQueries({ queryKey: ['store', id] });
    }
  });
}

export function useAddStoreEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, userId }: { storeId: string; userId: string }) =>
      storesApi.addStoreEmployee(storeId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: storeQueryKeys.employees(variables.storeId) });
    }
  });
}

export function useRemoveStoreEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, userId }: { storeId: string; userId: string }) =>
      storesApi.removeStoreEmployee(storeId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: storeQueryKeys.employees(variables.storeId) });
    }
  });
}

export function useSetStoreHubStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, isHub, hubPriority }: { storeId: string; isHub: boolean; hubPriority?: number }) =>
      isHub ? storesApi.promoteToHub(storeId, hubPriority) : storesApi.demoteFromHub(storeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['store', variables.storeId] });
    }
  });
}
