import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCleanupApi } from './api';
import type {
  CleanupDomain,
  CleanupAction,
  CleanupFilterState,
  CleanupDomainSummary,
  CleanupQueryResult,
  CleanupPreviewResult
} from './types';

export const CLEANUP_KEYS = {
  summary: ['admin-cleanup', 'summary'] as const,
  query: (domain: CleanupDomain, filters: CleanupFilterState, page: number, limit: number) =>
    ['admin-cleanup', 'query', domain, filters, page, limit] as const,
  operations: ['admin-cleanup', 'operations'] as const,
  operation: (id: string) => ['admin-cleanup', 'operation', id] as const
};

/**
 * Hook to fetch high-level cleanup summary statistics
 */
export function useCleanupSummaryQuery() {
  return useQuery<CleanupDomainSummary, Error>({
    queryKey: CLEANUP_KEYS.summary,
    queryFn: () => adminCleanupApi.getSummary()
  });
}

/**
 * Hook to query domain records for table selection
 */
export function useCleanupRecordsQuery<T = any>(
  domain: CleanupDomain,
  filters: CleanupFilterState,
  pagination: { page: number; limit: number }
) {
  return useQuery<CleanupQueryResult<T>, Error>({
    queryKey: CLEANUP_KEYS.query(domain, filters, pagination.page, pagination.limit),
    queryFn: () => adminCleanupApi.queryRecords<T>(domain, filters, pagination)
  });
}

/**
 * Hook for previewing cleanup impact (dry-run)
 */
export function useCleanupPreviewMutation() {
  return useMutation<
    CleanupPreviewResult,
    Error,
    { domain: CleanupDomain; action: CleanupAction; targetIds: string[]; filters?: CleanupFilterState }
  >({
    mutationFn: ({ domain, action, targetIds, filters }) =>
      adminCleanupApi.previewCleanup(domain, action, targetIds, filters)
  });
}

/**
 * Hook for executing cleanup operations
 */
export function useCleanupExecuteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domain,
      action,
      targetIds,
      previewToken,
      confirmCode,
      filters,
      password
    }: {
      domain: CleanupDomain;
      action: CleanupAction;
      targetIds: string[];
      previewToken?: string | null;
      confirmCode?: string;
      filters?: CleanupFilterState;
      password?: string;
    }) => adminCleanupApi.executeCleanup(domain, action, targetIds, previewToken, confirmCode, filters, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cleanup'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}

/**
 * Hook to list past cleanup operations
 */
export function useCleanupOperationsQuery(limit = 20, skip = 0) {
  return useQuery({
    queryKey: [...CLEANUP_KEYS.operations, limit, skip],
    queryFn: () => adminCleanupApi.listOperations(limit, skip)
  });
}

/**
 * Hook to rollback a reversible operation
 */
export function useCleanupRollbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (operationId: string) => adminCleanupApi.rollbackOperation(operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cleanup'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
}
