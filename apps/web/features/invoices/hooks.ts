'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from './api';
import { useRealtime } from '../../hooks/useRealtime';
import type { InvoiceQueryParams } from './types';

export const invoiceQueryKeys = {
  all: ['invoices'] as const,
  list: (params?: InvoiceQueryParams) =>
    [
      'invoices',
      'list',
      params?.page || 1,
      params?.limit || 50,
      params?.status || 'ALL',
      params?.customerId || 'all',
      params?.locationId || params?.storeId || 'all',
      params?.startDate || '',
      params?.endDate || '',
      params?.search || ''
    ] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const
};

export function useInvoicesQuery(params?: InvoiceQueryParams) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtime();

  const query = useQuery({
    queryKey: invoiceQueryKeys.list(params),
    queryFn: () => invoicesApi.getInvoices(params),
    staleTime: 30 * 1000
  });

  useEffect(() => {
    const unsubCreated = subscribe('invoice_created', () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    });

    const unsubVoided = subscribe('invoice_voided', () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    });

    return () => {
      unsubCreated();
      unsubVoided();
    };
  }, [subscribe, queryClient]);

  return query;
}

export function useInvoiceDetailQuery(id?: string) {
  return useQuery({
    queryKey: invoiceQueryKeys.detail(id || ''),
    queryFn: () => invoicesApi.getInvoiceById(id!),
    enabled: !!id,
    staleTime: 60 * 1000
  });
}

export function useVoidInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      invoicesApi.voidInvoice(id, reason),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    }
  });
}
