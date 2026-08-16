import { apiClient } from '../../lib/api/client';
import type { SupplierDoc, SupplierFormPayload } from './types';

export const suppliersApi = {
  /**
   * Fetch all registered suppliers in directory
   * GET /api/v1/suppliers
   */
  async getSuppliers(): Promise<SupplierDoc[]> {
    const res = await apiClient.get<SupplierDoc[] | { success: boolean; suppliers: SupplierDoc[] }>(
      '/api/v1/suppliers'
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'suppliers' in res && Array.isArray((res as any).suppliers)) {
      return (res as any).suppliers;
    }
    return [];
  },

  /**
   * Fetch single supplier by ID
   * GET /api/v1/suppliers/:id
   */
  async getSupplierById(id: string): Promise<SupplierDoc> {
    const res = await apiClient.get<SupplierDoc | { success: boolean; supplier: SupplierDoc }>(
      `/api/v1/suppliers/${encodeURIComponent(id)}`
    );
    if (res && typeof res === 'object' && 'supplier' in res) {
      return (res as { success: boolean; supplier: SupplierDoc }).supplier;
    }
    return res as SupplierDoc;
  },

  /**
   * Register or update supplier
   * POST /api/v1/suppliers
   */
  async createSupplier(payload: SupplierFormPayload): Promise<{ success: boolean; supplier: SupplierDoc }> {
    return apiClient.post<{ success: boolean; supplier: SupplierDoc }>(
      '/api/v1/suppliers',
      payload
    );
  },

  /**
   * Partial update existing supplier
   * PATCH /api/v1/suppliers/:id
   */
  async updateSupplier(
    id: string,
    payload: Partial<SupplierFormPayload>
  ): Promise<{ success: boolean; supplier: SupplierDoc }> {
    return apiClient.patch<{ success: boolean; supplier: SupplierDoc }>(
      `/api/v1/suppliers/${encodeURIComponent(id)}`,
      payload
    );
  },

  /**
   * Delete supplier profile
   * DELETE /api/v1/suppliers/:id
   */
  async deleteSupplier(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/suppliers/${encodeURIComponent(id)}`
    );
  }
};
