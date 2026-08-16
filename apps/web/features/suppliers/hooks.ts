'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { SupplierFormPayload } from './types';

export const supplierQueryKeys = {
  all: ['suppliers'] as const,
  list: () => ['suppliers', 'list'] as const,
  detail: (id: string) => ['supplier', id] as const
};

export function useSuppliersQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: supplierQueryKeys.list(),
    queryFn: () => suppliersApi.getSuppliers(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('supplier_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
    });

    const unsubDeleted = subscribe('supplier_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
    });

    return () => {
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useSupplierDetailQuery(id?: string) {
  return useQuery({
    queryKey: supplierQueryKeys.detail(id || ''),
    queryFn: () => suppliersApi.getSupplierById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierFormPayload) => suppliersApi.createSupplier(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
      if (res.supplier?.id) {
        queryClient.invalidateQueries({ queryKey: ['supplier', res.supplier.id] });
      }
    }
  });
}

export function useUpdateSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupplierFormPayload> }) =>
      suppliersApi.updateSupplier(id, payload),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
    }
  });
}

export function useDeleteSupplierMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => suppliersApi.deleteSupplier(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
      queryClient.removeQueries({ queryKey: ['supplier', id] });
    }
  });
}
