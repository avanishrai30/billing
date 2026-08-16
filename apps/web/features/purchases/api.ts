import { apiClient } from '../../lib/api/client';
import {
  PurchasesListResponseSchema,
  PurchaseDocSchema
} from './schemas';
import type {
  PurchaseDoc,
  PurchasesListResponse,
  PurchaseFilterParams
} from './types';

export const purchasesApi = {
  getPurchases: async (params?: PurchaseFilterParams): Promise<PurchasesListResponse> => {
    const rawData = await apiClient.get<unknown>('/api/v1/purchases', { params });
    const parsed = PurchasesListResponseSchema.parse(rawData);
    return parsed as PurchasesListResponse;
  },

  getPurchaseById: async (id: string): Promise<PurchaseDoc> => {
    const rawData = await apiClient.get<unknown>(`/api/v1/purchases/${encodeURIComponent(id)}`);
    const parsed = PurchaseDocSchema.parse(rawData);
    return parsed as PurchaseDoc;
  },

  createPurchase: async (payload: Record<string, any>): Promise<{ success: boolean; purchase: PurchaseDoc }> => {
    const res = await apiClient.post<{ success: boolean; purchase: unknown }>('/api/v1/purchases', payload);
    const parsed = PurchaseDocSchema.parse(res.purchase);
    return { success: true, purchase: parsed as PurchaseDoc };
  },

  voidPurchase: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/purchases/${encodeURIComponent(id)}`);
  },

  getSuppliers: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/api/v1/suppliers');
    return Array.isArray(res) ? res : [];
  },

  getStores: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/api/v1/stores');
    return Array.isArray(res) ? res : [];
  },

  getProducts: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>('/api/v1/products');
    return Array.isArray(res) ? res : [];
  }
};
