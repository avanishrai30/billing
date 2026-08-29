import { apiClient } from '../../lib/api/client';
import type {
  ProductDoc,
  ProductFilterState,
  ProductBatchDoc,
  BulkImportPreviewResult,
  BulkImportCommitResult
} from './types';
import type { ProductFormValues } from './schemas';

export const productsApi = {
  /**
   * Fetch all products matching query filters.
   */
  async getProducts(filters?: Partial<ProductFilterState>): Promise<ProductDoc[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.brand && filters.brand !== 'all') params.append('brand', filters.brand);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.sellingMode && filters.sellingMode !== 'all') params.append('sellingMode', filters.sellingMode);
    if (filters?.status && filters.status !== 'active') params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = queryString ? `/api/v1/products?${queryString}` : '/api/v1/products';
    const res = await apiClient.get<ProductDoc[]>(endpoint);
    return Array.isArray(res) ? res : [];
  },

  /**
   * Fetch single product by ID or SKU.
   */
  async getProductById(id: string): Promise<ProductDoc> {
    return apiClient.get<ProductDoc>(`/api/v1/products/${encodeURIComponent(id)}`);
  },

  /**
   * Resolve product by universal barcode scan.
   */
  async getProductByBarcode(barcode: string): Promise<ProductDoc> {
    return apiClient.get<ProductDoc>(`/api/v1/products/by-barcode/${encodeURIComponent(barcode)}`);
  },

  /**
   * Save (create or update) product master record.
   */
  async saveProduct(payload: ProductFormValues): Promise<{ success: boolean; product: ProductDoc }> {
    return apiClient.post<{ success: boolean; product: ProductDoc }>('/api/v1/products', payload);
  },

  /**
   * Archive / soft-delete product record.
   */
  async archiveProduct(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/products/${encodeURIComponent(id)}`);
  },

  /**
   * Preview bulk product import payload.
   */
  async previewBulkImport(rows: unknown[], options?: Record<string, unknown>): Promise<BulkImportPreviewResult> {
    return apiClient.post<BulkImportPreviewResult>('/api/v1/products/import/preview', {
      rows,
      ...options
    });
  },

  /**
   * Commit verified bulk product import.
   */
  async commitBulkImport(importId: string, rows: unknown[], options?: Record<string, unknown>): Promise<BulkImportCommitResult> {
    return apiClient.post<BulkImportCommitResult>('/api/v1/products/import/commit', {
      importId,
      rows,
      options
    });
  },

  /**
   * Upload product image (Base64 WebP optimization).
   */
  async uploadProductImage(
    productId: string,
    fileName: string,
    base64Data: string
  ): Promise<{ success: boolean; imagePath: string; imageId: string; productId: string }> {
    return apiClient.post<{ success: boolean; imagePath: string; imageId: string; productId: string }>(
      `/api/v1/upload?type=products&productId=${encodeURIComponent(productId)}`,
      {
      fileName,
      base64Data
      }
    );
  },

  /**
   * Fetch all inventory batches and lots for a product.
   */
  async getProductBatches(productId: string): Promise<ProductBatchDoc[]> {
    const res = await apiClient.get<{ success: boolean; batches: ProductBatchDoc[] }>(
      `/api/v1/products/${encodeURIComponent(productId)}/batches`
    );
    return res?.batches || [];
  },

  /**
   * Register a new inventory batch/lot for a product.
   */
  async createProductBatch(
    productId: string,
    payload: {
      lotNumber: string;
      manufactureDate?: string;
      expiryDate?: string;
      receivedQuantity?: number;
      remainingQuantity?: number;
      unitCost?: number;
      sellingPrice?: number;
      storeId?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; batch: ProductBatchDoc }> {
    return apiClient.post<{ success: boolean; batch: ProductBatchDoc }>(
      `/api/v1/products/${encodeURIComponent(productId)}/batches`,
      payload
    );
  },

  /**
   * Atomically generate next unique AIA product barcode.
   */
  async generateAIavroBarcode(): Promise<{ success: boolean; barcode: string }> {
    try {
      return await apiClient.post<{ success: boolean; barcode: string }>('/api/v1/products/barcodes', {});
    } catch {
      return await apiClient.get<{ success: boolean; barcode: string }>('/api/v1/products/generate-barcode');
    }
  }
};
