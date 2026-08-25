import { inventoryApi } from '../../features/inventory/api';
import { inventoryQueryKeys } from '../../features/inventory/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

describe('Inventory API & Query Keys Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Generates deterministic query keys', () => {
    expect(inventoryQueryKeys.commandCenter).toEqual([
      'inventory',
      'command-center'
    ]);
    expect(inventoryQueryKeys.summary('store-1')).toEqual([
      'inventory',
      'summary',
      'store-1'
    ]);
    expect(inventoryQueryKeys.balances()).toEqual([
      'inventory',
      'balances',
      'all'
    ]);
    expect(
      inventoryQueryKeys.logs({ productId: 'p1', locationId: 's1', type: 'SALE' })
    ).toEqual(['inventory', 'logs', 'p1', 's1', 'SALE']);
  });

  it('2. inventoryApi.getCommandCenter requests GET /api/v1/inventory/command-center', async () => {
    const mockData = {
      success: true,
      stores: [{ id: 'central-warehouse', name: 'Central Warehouse', code: 'WH-01', isWarehouse: true }],
      networkBalances: [],
      summary: {
        totalProducts: 5,
        networkStock: 100,
        centralStock: 80,
        storeStock: 20,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiringSoonCount: 0,
        totalValuation: 45000
      }
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockData);

    const res = await inventoryApi.getCommandCenter();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/inventory/command-center');
    expect(res.success).toBe(true);
    expect(res.summary.networkStock).toBe(100);
  });

  it('3. inventoryApi.getSummary requests GET /api/v1/inventory/summary with store param', async () => {
    const mockSummary = {
      totalProducts: 10,
      totalTrackedItems: 8,
      totalUnits: 500,
      lowStockCount: 1,
      outOfStockCount: 0,
      inventoryValue: 25000,
      locationId: 'store-1'
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      summary: mockSummary
    });

    const res = await inventoryApi.getSummary('store-1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/inventory/summary?locationId=store-1');
    expect(res.summary).toEqual(mockSummary);
  });

  it('4. inventoryApi.adjustStock posts to /api/v1/inventory/adjust', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Inventory adjusted successfully',
      record: 50
    });

    const payload = {
      productId: 'p-1',
      locationId: 'store-1',
      quantity: 50,
      notes: 'Physical count match'
    };

    const res = await inventoryApi.adjustStock(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/inventory/adjust', payload);
    expect(res.success).toBe(true);
  });

  it('5. inventoryApi.transferStock posts to /api/v1/inventory/transfer with batchId', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Stock transfer completed successfully',
      referenceId: 'tf-123'
    });

    const payload = {
      productId: 'p-1',
      fromLocationId: 'central-warehouse',
      toLocationId: 'store-1',
      quantity: 10,
      batchId: 'batch-01'
    };

    const res = await inventoryApi.transferStock(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/inventory/transfer', payload);
    expect(res.referenceId).toBe('tf-123');
  });
});
