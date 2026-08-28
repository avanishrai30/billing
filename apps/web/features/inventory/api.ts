import { apiClient } from '../../lib/api/client';
import type {
  InventoryBalance,
  InventorySummary,
  InventoryLogsResponse,
  StockAdjustmentPayload,
  StockTransferPayload,
  StockTransferResponse,
  StockAvailabilityResponse,
  CommandCenterData,
  CommandCenterStore,
  LocationStockBreakdown
} from './types';

function inferLocationType(location: {
  type?: string;
  locationType?: string;
  code?: string;
  name?: string;
  id?: string;
  isWarehouse?: boolean;
  isHub?: boolean;
}): 'WAREHOUSE' | 'STORE' {
  const explicit = String(location.locationType || location.type || '').trim().toUpperCase();
  if (explicit === 'WAREHOUSE' || explicit === 'STORE') return explicit;

  const code = String(location.code || '').trim().toUpperCase();
  const name = String(location.name || '').toLowerCase();
  if (
    location.isWarehouse === true ||
    location.isHub === true ||
    location.id === 'central-warehouse' ||
    code === 'WAREHOUSE' ||
    code.startsWith('WH') ||
    name.includes('warehouse')
  ) {
    return 'WAREHOUSE';
  }

  return 'STORE';
}

function normalizeLocation(location: Partial<CommandCenterStore>): CommandCenterStore {
  const type = inferLocationType(location);
  const name = String(location.name || location.id || 'Location').trim();
  return {
    id: String(location.id || ''),
    name,
    code: String(location.code || (type === 'WAREHOUSE' ? 'WAREHOUSE' : `ST-${name.substring(0, 3).toUpperCase()}`)),
    type,
    status: location.status === 'inactive' ? 'inactive' : 'active',
    locationType: type,
    isHub: location.isHub === true || type === 'WAREHOUSE',
    isWarehouse: type === 'WAREHOUSE'
  };
}

function normalizeBreakdown(location: LocationStockBreakdown): LocationStockBreakdown {
  const type = inferLocationType({
    id: location.locationId,
    name: location.locationName,
    type: location.type,
    locationType: location.locationType,
    isHub: location.isHub,
    isWarehouse: location.isWarehouse
  });
  return {
    ...location,
    type,
    status: location.status === 'inactive' ? 'inactive' : 'active',
    locationType: type,
    isHub: location.isHub === true || type === 'WAREHOUSE',
    isWarehouse: type === 'WAREHOUSE'
  };
}

function normalizeCommandCenterData(data: CommandCenterData): CommandCenterData {
  return {
    ...data,
    stores: (data.stores || []).map(normalizeLocation),
    networkBalances: (data.networkBalances || []).map(item => ({
      ...item,
      locationBreakdown: (item.locationBreakdown || []).map(normalizeBreakdown)
    }))
  };
}

export const inventoryApi = {
  /**
   * Fetch Multi-Store Inventory Command Center consolidated data (Phase 33)
   */
  async getCommandCenter(locationId?: string): Promise<CommandCenterData> {
    const query = locationId && locationId !== 'all' && locationId !== 'network'
      ? `?locationId=${encodeURIComponent(locationId)}`
      : '';
    const data = await apiClient.get<CommandCenterData>(`/api/v1/inventory/command-center${query}`);
    return normalizeCommandCenterData(data);
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
