import { apiClient } from '../../lib/api/client';
import type { StoreDoc, StoreFormPayload } from './types';

export const storesApi = {
  /**
   * Fetch all registered store outlets
   * GET /api/v1/stores
   */
  async getStores(): Promise<StoreDoc[]> {
    const res = await apiClient.get<StoreDoc[] | { success: boolean; stores: StoreDoc[] }>(
      '/api/v1/stores'
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'stores' in res && Array.isArray((res as any).stores)) {
      return (res as any).stores;
    }
    return [];
  },

  /**
   * Fetch single store by ID
   * GET /api/v1/stores/:id
   */
  async getStoreById(id: string): Promise<StoreDoc> {
    const res = await apiClient.get<StoreDoc | { success: boolean; store: StoreDoc }>(
      `/api/v1/stores/${encodeURIComponent(id)}`
    );
    if (res && typeof res === 'object' && 'store' in res) {
      return (res as { success: boolean; store: StoreDoc }).store;
    }
    return res as StoreDoc;
  },

  /**
   * Register or update store outlet
   * POST /api/v1/stores
   */
  async createStore(payload: StoreFormPayload): Promise<{ success: boolean; store: StoreDoc }> {
    return apiClient.post<{ success: boolean; store: StoreDoc }>(
      '/api/v1/stores',
      payload
    );
  },

  /**
   * Partial update existing store outlet
   * PATCH /api/v1/stores/:id
   */
  async updateStore(
    id: string,
    payload: Partial<StoreFormPayload>
  ): Promise<{ success: boolean; store: StoreDoc }> {
    return apiClient.patch<{ success: boolean; store: StoreDoc }>(
      `/api/v1/stores/${encodeURIComponent(id)}`,
      payload
    );
  },

  /**
   * Delete store outlet
   * DELETE /api/v1/stores/:id
   */
  async deleteStore(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/stores/${encodeURIComponent(id)}`
    );
  }
};
