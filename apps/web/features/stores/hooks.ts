'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { StoreFormPayload } from './types';

export const storeQueryKeys = {
  all: ['stores'] as const,
  list: () => ['stores', 'list'] as const,
  detail: (id: string) => ['store', id] as const
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

    return () => {
      unsubUpdated();
      unsubDeleted();
    };
  }, [enabled, subscribe, queryClient]);

  return query;
}

export function useStoreDetailQuery(id?: string) {
  return useQuery({
    queryKey: storeQueryKeys.detail(id || ''),
    queryFn: () => storesApi.getStoreById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
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
