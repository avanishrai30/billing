import { apiClient } from '../../lib/api/client';
import type {
  POSProduct,
  POSCustomer,
  POSCheckoutPayload,
  POSInvoiceResponse
} from './types';

export const posApi = {
  /**
   * Fetches active product catalog with optional query filters
   * GET /api/v1/products
   */
  async getProducts(params?: {
    search?: string;
    category?: string;
    brand?: string;
    limit?: number;
  }): Promise<POSProduct[]> {
    const queryParams: Record<string, string | number | undefined> = {
      status: 'active',
      limit: params?.limit || 200,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.category && params.category !== 'ALL' ? { category: params.category } : {}),
      ...(params?.brand && params.brand !== 'ALL' ? { brand: params.brand } : {})
    };

    const res = await apiClient.get<POSProduct[] | { success: boolean; products: POSProduct[] }>(
      '/api/v1/products',
      { params: queryParams }
    );

    if (Array.isArray(res)) return res;
    if (res && 'products' in res && Array.isArray(res.products)) return res.products;
    return [];
  },

  /**
   * Exact Barcode Resolver
   * GET /api/v1/products/by-barcode/:barcode
   */
  async getProductByBarcode(barcode: string): Promise<POSProduct | null> {
    try {
      const res = await apiClient.get<POSProduct>(
        `/api/v1/products/by-barcode/${encodeURIComponent(barcode.trim())}`
      );
      return res || null;
    } catch {
      return null;
    }
  },

  /**
   * Exact SKU Lookup
   * GET /api/v1/products/by-sku/:sku
   */
  async getProductBySku(sku: string): Promise<POSProduct | null> {
    try {
      const res = await apiClient.get<POSProduct>(
        `/api/v1/products/by-sku/${encodeURIComponent(sku.trim())}`
      );
      return res || null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches customers for POS quick-select
   * GET /api/v1/customers
   */
  async getCustomers(): Promise<POSCustomer[]> {
    try {
      const res = await apiClient.get<POSCustomer[] | { success: boolean; customers: POSCustomer[] }>(
        '/api/v1/customers'
      );
      if (Array.isArray(res)) return res;
      if (res && 'customers' in res && Array.isArray(res.customers)) return res.customers;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Quick-creates new customer during POS checkout
   * POST /api/v1/customers
   */
  async createCustomer(data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  }): Promise<{ success: boolean; customer: POSCustomer }> {
    return apiClient.post<{ success: boolean; customer: POSCustomer }>(
      '/api/v1/customers',
      data
    );
  },

  /**
   * Creates POS Invoice with server validation & atomic inventory deduction
   * POST /api/v1/invoices
   */
  async createInvoice(payload: POSCheckoutPayload): Promise<POSInvoiceResponse> {
    return apiClient.post<POSInvoiceResponse>('/api/v1/invoices', payload);
  },

  /**
   * Fetches active store outlets
   * GET /api/v1/stores
   */
  async getStores(): Promise<Array<{ id: string; name: string; code?: string }>> {
    try {
      const res = await apiClient.get<any>('/api/v1/stores');
      if (Array.isArray(res)) return res;
      if (res && 'stores' in res && Array.isArray(res.stores)) return res.stores;
      return [];
    } catch {
      return [];
    }
  }
};
