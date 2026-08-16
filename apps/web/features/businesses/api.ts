import { apiClient } from '../../lib/api/client';
import type { BusinessDoc, BusinessFormPayload } from './types';

export const businessesApi = {
  /**
   * Fetch all business configurations
   * GET /api/v1/businesses
   */
  async getBusinesses(): Promise<BusinessDoc[]> {
    const res = await apiClient.get<BusinessDoc[] | { success: boolean; businesses: BusinessDoc[] }>(
      '/api/v1/businesses'
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'businesses' in res && Array.isArray((res as any).businesses)) {
      return (res as any).businesses;
    }
    return [];
  },

  /**
   * Fetch single business by ID
   * GET /api/v1/businesses/:id
   */
  async getBusinessById(id: string): Promise<BusinessDoc> {
    const res = await apiClient.get<BusinessDoc | { success: boolean; business: BusinessDoc }>(
      `/api/v1/businesses/${encodeURIComponent(id)}`
    );
    if (res && typeof res === 'object' && 'business' in res) {
      return (res as { success: boolean; business: BusinessDoc }).business;
    }
    return res as BusinessDoc;
  },

  /**
   * Create or update business profile
   * POST /api/v1/businesses
   */
  async createBusiness(payload: BusinessFormPayload): Promise<{ success: boolean; business: BusinessDoc }> {
    return apiClient.post<{ success: boolean; business: BusinessDoc }>(
      '/api/v1/businesses',
      payload
    );
  },

  /**
   * Partial update existing business profile
   * PATCH /api/v1/businesses/:id
   */
  async updateBusiness(
    id: string,
    payload: Partial<BusinessFormPayload>
  ): Promise<{ success: boolean; business: BusinessDoc }> {
    return apiClient.patch<{ success: boolean; business: BusinessDoc }>(
      `/api/v1/businesses/${encodeURIComponent(id)}`,
      payload
    );
  },

  /**
   * Delete business profile
   * DELETE /api/v1/businesses/:id
   */
  async deleteBusiness(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/businesses/${encodeURIComponent(id)}`
    );
  }
};
