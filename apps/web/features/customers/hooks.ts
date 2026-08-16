'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { CustomerFormPayload } from './types';

export const customerQueryKeys = {
  all: ['customers'] as const,
  list: () => ['customers', 'list'] as const,
  detail: (id: string) => ['customer', id] as const
};

export function useCustomersQuery() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: customerQueryKeys.list(),
    queryFn: () => customersApi.getCustomers(),
    staleTime: 60 * 1000
  });

  useEffect(() => {
    const unsubUpdated = subscribe('customer_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
    });

    const unsubDeleted = subscribe('customer_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
    });

    return () => {
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useCustomerDetailQuery(id?: string) {
  return useQuery({
    queryKey: customerQueryKeys.detail(id || ''),
    queryFn: () => customersApi.getCustomerById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerFormPayload) => customersApi.createCustomer(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
      if (res.customer?.id) {
        queryClient.invalidateQueries({ queryKey: ['customer', res.customer.id] });
      }
    }
  });
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerFormPayload> }) =>
      customersApi.updateCustomer(id, payload),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    }
  });
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
      queryClient.removeQueries({ queryKey: ['customer', id] });
    }
  });
}
