import { apiClient } from '../../lib/api/client';
import type {
  InventorySummary,
  InventoryBalance,
  InventoryLogsResponse,
  StockAvailabilityResponse,
  StockAdjustmentPayload,
  StockTransferPayload,
  StockTransferResponse
} from './types';

export const inventoryApi = {
  /**
   * Fast aggregated inventory metrics
   * GET /api/v1/inventory/summary
   */
  async getSummary(locationId?: string): Promise<InventorySummary> {
    const params: Record<string, string | undefined> = {};
    if (locationId && locationId !== 'all') {
      params.locationId = locationId;
    }

    const res = await apiClient.get<
      | { success: boolean; summary: InventorySummary }
      | InventorySummary
    >('/api/v1/inventory/summary', { params });

    if ('summary' in res && res.summary) {
      return res.summary;
    }
    return res as InventorySummary;
  },

  /**
   * Current inventory snapshot
   * GET /api/v1/inventory
   */
  async getInventory(params?: {
    storeId?: string;
    locationId?: string;
    productId?: string;
  }): Promise<InventoryBalance[]> {
    const queryParams: Record<string, string | undefined> = {};
    const loc = params?.locationId || params?.storeId;
    if (loc && loc !== 'all') {
      queryParams.locationId = loc;
    }
    if (params?.productId) {
      queryParams.productId = params.productId;
    }

    const res = await apiClient.get<
      | { success: boolean; inventory: InventoryBalance[] }
      | InventoryBalance[]
    >('/api/v1/inventory', { params: queryParams });

    if (Array.isArray(res)) return res;
    if ('inventory' in res && Array.isArray(res.inventory)) return res.inventory;
    return [];
  },

  /**
   * Paginated immutable inventory ledger records
   * GET /api/v1/inventory/logs
   */
  async getLogs(params?: {
    productId?: string;
    storeId?: string;
    locationId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    cursor?: string;
  }): Promise<InventoryLogsResponse> {
    const queryParams: Record<string, any> = {};
    if (params?.productId) queryParams.productId = params.productId;
    const loc = params?.locationId || params?.storeId;
    if (loc && loc !== 'all') queryParams.locationId = loc;
    if (params?.type && params.type !== 'ALL') queryParams.type = params.type;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.cursor) queryParams.cursor = params.cursor;

    const res = await apiClient.get<InventoryLogsResponse>('/api/v1/inventory/logs', {
      params: queryParams
    });

    return res;
  },

  /**
   * Pre-flight stock availability check
   * POST /api/v1/inventory/check-availability
   */
  async checkAvailability(payload: {
    locationId: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<StockAvailabilityResponse> {
    return apiClient.post<StockAvailabilityResponse>(
      '/api/v1/inventory/check-availability',
      payload
    );
  },

  /**
   * Adjust stock atomically with reason and audit trail
   * POST /api/v1/inventory/adjust
   */
  async adjustStock(payload: StockAdjustmentPayload): Promise<{
    success: boolean;
    message: string;
    record: number;
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      record: number;
    }>('/api/v1/inventory/adjust', payload);
  },

  /**
   * Transfer stock atomically between stores with idempotency
   * POST /api/v1/inventory/transfer
   */
  async transferStock(payload: StockTransferPayload): Promise<StockTransferResponse> {
    return apiClient.post<StockTransferResponse>(
      '/api/v1/inventory/transfer',
      payload
    );
  }
};
