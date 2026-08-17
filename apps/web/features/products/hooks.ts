import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { productsApi } from './api';
import { realtimeManager } from '../../lib/realtime/socket';
import type { ProductDoc, ProductFilterState } from './types';
import type { ProductFormValues } from './schemas';

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  list: (filters?: Partial<ProductFilterState>) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  barcode: (code: string) => ['products', 'barcode', code] as const
};

/**
 * Query hook to fetch and filter product catalog with Realtime sync.
 */
export function useProductsQuery(
  filters?: Partial<ProductFilterState>,
  onProductUpdated?: (productId: string) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubProductUpdated = realtimeManager.subscribe('product_updated', (envelope) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      const id = (envelope?.data as { id?: string; _id?: string })?.id || (envelope?.data as { id?: string; _id?: string })?._id;
      if (id && onProductUpdated) {
        onProductUpdated(String(id));
      }
    });

    const unsubProductDeleted = realtimeManager.subscribe('product_deleted', () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    });

    return () => {
      unsubProductUpdated();
      unsubProductDeleted();
    };
  }, [queryClient, onProductUpdated]);

  return useQuery<ProductDoc[], Error>({
    queryKey: PRODUCT_KEYS.list(filters),
    queryFn: () => productsApi.getProducts(filters),
    staleTime: 30000
  });
}

/**
 * Query hook for single product details.
 */
export function useProductDetailQuery(id?: string) {
  return useQuery<ProductDoc, Error>({
    queryKey: PRODUCT_KEYS.detail(id || ''),
    queryFn: () => productsApi.getProductById(id!),
    enabled: !!id
  });
}

/**
 * Mutation hook to create or update product master records.
 */
export function useSaveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductFormValues) => productsApi.saveProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

/**
 * Mutation hook to soft-delete/archive a product.
 */
export function useArchiveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.archiveProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

/**
 * Mutation hook for bulk import preview.
 */
export function useBulkImportPreviewMutation() {
  return useMutation({
    mutationFn: ({ rows, options }: { rows: unknown[]; options?: Record<string, unknown> }) =>
      productsApi.previewBulkImport(rows, options)
  });
}

/**
 * Mutation hook for bulk import commit.
 */
export function useBulkImportCommitMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ importId, rows, options }: { importId: string; rows: unknown[]; options?: Record<string, unknown> }) =>
      productsApi.commitBulkImport(importId, rows, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}
