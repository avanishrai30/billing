import { apiClient } from '../../lib/api/client';
import type { CustomerDoc, CustomerFormPayload } from './types';

export const customersApi = {
  /**
   * Fetch all registered customers in directory
   * GET /api/v1/customers
   */
  async getCustomers(): Promise<CustomerDoc[]> {
    const res = await apiClient.get<CustomerDoc[] | { success: boolean; customers: CustomerDoc[] }>(
      '/api/v1/customers'
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && 'customers' in res && Array.isArray((res as any).customers)) {
      return (res as any).customers;
    }
    return [];
  },

  /**
   * Fetch single customer by ID
   * GET /api/v1/customers/:id
   */
  async getCustomerById(id: string): Promise<CustomerDoc> {
    const res = await apiClient.get<CustomerDoc | { success: boolean; customer: CustomerDoc }>(
      `/api/v1/customers/${encodeURIComponent(id)}`
    );
    if (res && typeof res === 'object' && 'customer' in res) {
      return (res as { success: boolean; customer: CustomerDoc }).customer;
    }
    return res as CustomerDoc;
  },

  /**
   * Register or update customer
   * POST /api/v1/customers
   */
  async createCustomer(payload: CustomerFormPayload): Promise<{ success: boolean; customer: CustomerDoc }> {
    return apiClient.post<{ success: boolean; customer: CustomerDoc }>(
      '/api/v1/customers',
      payload
    );
  },

  /**
   * Partial update existing customer
   * PATCH /api/v1/customers/:id
   */
  async updateCustomer(
    id: string,
    payload: Partial<CustomerFormPayload>
  ): Promise<{ success: boolean; customer: CustomerDoc }> {
    return apiClient.patch<{ success: boolean; customer: CustomerDoc }>(
      `/api/v1/customers/${encodeURIComponent(id)}`,
      payload
    );
  },

  /**
   * Delete customer profile
   * DELETE /api/v1/customers/:id
   */
  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/api/v1/customers/${encodeURIComponent(id)}`
    );
  }
};
