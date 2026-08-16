import { apiClient } from '../../lib/api/client';
import type {
  FranchiseDoc,
  FranchiseFormPayload,
  FranchiseSupplyOrderDoc,
  SupplyOrderFormPayload
} from './types';

export const franchiseApi = {
  /**
   * Fetch all franchise partners
   * GET /api/v1/franchises
   */
  async getFranchises(): Promise<FranchiseDoc[]> {
    const res = await apiClient.get<FranchiseDoc[] | { success: boolean; franchises: FranchiseDoc[] }>(
      '/api/v1/franchises'
    );
    if (Array.isArray(res)) return res;
    if (res && 'franchises' in res && Array.isArray(res.franchises)) return res.franchises;
    return [];
  },

  /**
   * Fetch single franchise by ID
   * GET /api/v1/franchises/:id
   */
  async getFranchiseById(id: string): Promise<FranchiseDoc> {
    return await apiClient.get<FranchiseDoc>(`/api/v1/franchises/${encodeURIComponent(id)}`);
  },

  /**
   * Create or update franchise partner profile
   * POST /api/v1/franchises
   */
  async saveFranchise(payload: FranchiseFormPayload): Promise<{ success: boolean; franchise: FranchiseDoc }> {
    return await apiClient.post<{ success: boolean; franchise: FranchiseDoc }>('/api/v1/franchises', payload);
  },

  /**
   * Delete franchise partner profile
   * DELETE /api/v1/franchises/:id
   */
  async deleteFranchise(id: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/franchises/${encodeURIComponent(id)}`
    );
  },

  /**
   * Fetch all franchise supply orders
   * GET /api/v1/franchise-supply-orders
   */
  async getSupplyOrders(): Promise<FranchiseSupplyOrderDoc[]> {
    const res = await apiClient.get<
      FranchiseSupplyOrderDoc[] | { success: boolean; orders: FranchiseSupplyOrderDoc[] }
    >('/api/v1/franchise-supply-orders');
    if (Array.isArray(res)) return res;
    if (res && 'orders' in res && Array.isArray(res.orders)) return res.orders;
    return [];
  },

  /**
   * Record a new franchise supply order
   * POST /api/v1/franchise-supply-orders
   */
  async createSupplyOrder(
    payload: SupplyOrderFormPayload
  ): Promise<{ success: boolean; order: FranchiseSupplyOrderDoc }> {
    return await apiClient.post<{ success: boolean; order: FranchiseSupplyOrderDoc }>(
      '/api/v1/franchise-supply-orders',
      payload
    );
  }
};
