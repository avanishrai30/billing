import { apiClient } from '../../lib/api/client';
import type {
  InventoryBalance,
  InventorySummary,
  InventoryLogsResponse,
  StockAdjustmentPayload,
  StockTransferPayload,
  StockTransferResponse,
  StockAvailabilityResponse,
  CommandCenterData
} from './types';

export const inventoryApi = {
  /**
   * Fetch Multi-Store Inventory Command Center consolidated data (Phase 33)
   */
  async getCommandCenter(): Promise<CommandCenterData> {
    return apiClient.get<CommandCenterData>('/api/v1/inventory/command-center');
  },

  /**
   * Fetch aggregated summary for the location
   */
  async getSummary(locationId?: string): Promise<{ success: boolean; summary: InventorySummary }> {
    const query = locationId && locationId !== 'all' ? `?locationId=${encodeURIComponent(locationId)}` : '';
    return apiClient.get<{ success: boolean; summary: InventorySummary }>(`/api/v1/inventory/summary${query}`);
  },

  /**
   * Fetch current inventory stock records
   */
  async listBalances(locationId?: string): Promise<{ success: boolean; inventory: InventoryBalance[] }> {
    const query = locationId && locationId !== 'all' ? `?locationId=${encodeURIComponent(locationId)}` : '';
    return apiClient.get<{ success: boolean; inventory: InventoryBalance[] }>(`/api/v1/inventory${query}`);
  },

  /**
   * Fetch immutable ledger audit trail
   */
  async getLogs(params: {
    productId?: string;
    locationId?: string;
    type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<InventoryLogsResponse> {
    const searchParams = new URLSearchParams();
    if (params.productId) searchParams.set('productId', params.productId);
    if (params.locationId && params.locationId !== 'all') searchParams.set('locationId', params.locationId);
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.cursor) searchParams.set('cursor', params.cursor);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient.get<InventoryLogsResponse>(`/api/v1/inventory/logs${query}`);
  },

  /**
   * Check stock availability before checkout or transfer
   */
  async checkAvailability(items: Array<{ productId: string; quantity: number }>, locationId?: string): Promise<StockAvailabilityResponse> {
    return apiClient.post<StockAvailabilityResponse>('/api/v1/inventory/check-availability', {
      items,
      locationId: locationId || 'all'
    });
  },

  /**
   * Adjust stock atomically
   */
  async adjustStock(payload: StockAdjustmentPayload): Promise<{ success: boolean; message: string; record: any }> {
    return apiClient.post<{ success: boolean; message: string; record: any }>('/api/v1/inventory/adjust', payload);
  },

  /**
   * Inter-store atomic stock transfer with Batch preservation
   */
  async transferStock(payload: StockTransferPayload): Promise<StockTransferResponse> {
    return apiClient.post<StockTransferResponse>('/api/v1/inventory/transfer', payload);
  }
};
