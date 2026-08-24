import { apiClient } from '../../lib/api/client';
import type {
  CleanupDomain,
  CleanupAction,
  CleanupFilterState,
  CleanupDomainSummary,
  CleanupQueryResult,
  CleanupPreviewResult,
  CleanupOperationDoc
} from './types';

export const adminCleanupApi = {
  /**
   * Fetch high-level domain summary stats
   */
  async getSummary(): Promise<CleanupDomainSummary> {
    const res = await apiClient.get<{ success: boolean; summary: CleanupDomainSummary }>('/api/v1/admin/cleanup/summary');
    return res.summary;
  },

  /**
   * Query records for a domain with filtering and pagination
   */
  async queryRecords<T = any>(
    domain: CleanupDomain,
    filters: CleanupFilterState,
    pagination: { page: number; limit: number }
  ): Promise<CleanupQueryResult<T>> {
    return apiClient.post<CleanupQueryResult<T>>(`/api/v1/admin/cleanup/${domain}/query`, {
      filters,
      pagination
    });
  },

  /**
   * Preview a cleanup action (dry run)
   */
  async previewCleanup(
    domain: CleanupDomain,
    action: CleanupAction,
    targetIds: string[],
    filters?: CleanupFilterState
  ): Promise<CleanupPreviewResult> {
    const res = await apiClient.post<{ success: boolean; preview: CleanupPreviewResult }>(
      `/api/v1/admin/cleanup/${domain}/preview`,
      {
        action,
        targetIds,
        filters
      }
    );
    return res.preview;
  },

  /**
   * Execute an administrative cleanup operation
   */
  async executeCleanup(
    domain: CleanupDomain,
    action: CleanupAction,
    targetIds: string[],
    previewToken?: string | null,
    confirmCode?: string,
    filters?: CleanupFilterState
  ): Promise<{ success: boolean; result: any }> {
    return apiClient.post<{ success: boolean; result: any }>(
      `/api/v1/admin/cleanup/${domain}/execute`,
      {
        action,
        targetIds,
        previewToken,
        confirmCode,
        filters
      }
    );
  },

  /**
   * List historical cleanup operations
   */
  async listOperations(limit = 20, skip = 0): Promise<{ operations: CleanupOperationDoc[]; total: number }> {
    return apiClient.get<{ operations: CleanupOperationDoc[]; total: number }>(
      `/api/v1/admin/cleanup/operations?limit=${limit}&skip=${skip}`
    );
  },

  /**
   * Fetch specific operation status
   */
  async getOperation(operationId: string): Promise<CleanupOperationDoc> {
    const res = await apiClient.get<{ success: boolean; operation: CleanupOperationDoc }>(
      `/api/v1/admin/cleanup/operations/${encodeURIComponent(operationId)}`
    );
    return res.operation;
  },

  /**
   * Rollback a reversible cleanup operation
   */
  async rollbackOperation(operationId: string): Promise<{ success: boolean; result: any }> {
    return apiClient.post<{ success: boolean; result: any }>(
      `/api/v1/admin/cleanup/operations/${encodeURIComponent(operationId)}/rollback`,
      {}
    );
  }
};
