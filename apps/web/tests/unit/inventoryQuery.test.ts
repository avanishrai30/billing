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
    expect(res.stores[0]).toMatchObject({
      id: 'central-warehouse',
      type: 'WAREHOUSE',
      status: 'active',
      locationType: 'WAREHOUSE',
      isHub: true,
      isWarehouse: true
    });
  });

  it('3. inventoryApi.getCommandCenter normalizes production warehouse metadata from code and hub flag', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      stores: [
        { id: 'st-1787728871789', name: "VC ORGANIC'S WAREHOUSE", code: 'WAREHOUSE', isHub: true },
        { id: 'st-srs', name: 'VC ORGANIC SRS', code: 'SRS' }
      ],
      networkBalances: [
        {
          productId: 'prod-production-parity',
          productName: 'Production Parity Product',
          sku: 'SKU-PROD-PARITY',
          barcode: '890000000117',
          category: 'Grocery',
          unit: 'units',
          cost: 100,
          price: 140,
          reorderLevel: 10,
          isOrphan: false,
          networkQuantity: 117,
          networkReserved: 0,
          networkAvailable: 117,
          locationBreakdown: [
            { locationId: 'st-1787728871789', locationName: "VC ORGANIC'S WAREHOUSE", isHub: true, quantity: 0, reservedQuantity: 0, available: 0 },
            { locationId: 'st-srs', locationName: 'VC ORGANIC SRS', quantity: 115, reservedQuantity: 0, available: 115 }
          ],
          batches: []
        }
      ],
      summary: {
        totalProducts: 1,
        networkStock: 117,
        centralStock: 0,
        storeStock: 117,
        lowStockCount: 0,
        outOfStockCount: 0,
        expiringSoonCount: 0,
        totalValuation: 11700
      }
    });

    const res = await inventoryApi.getCommandCenter();

    expect(res.stores[0]).toMatchObject({
      id: 'st-1787728871789',
      name: "VC ORGANIC'S WAREHOUSE",
      code: 'WAREHOUSE',
      type: 'WAREHOUSE',
      locationType: 'WAREHOUSE',
      isHub: true,
      isWarehouse: true
    });
    expect(res.stores[1]).toMatchObject({
      id: 'st-srs',
      type: 'STORE',
      locationType: 'STORE',
      isWarehouse: false
    });
    expect(res.networkBalances[0].locationBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({ locationId: 'st-1787728871789', type: 'WAREHOUSE', isWarehouse: true }),
      expect.objectContaining({ locationId: 'st-srs', type: 'STORE', isWarehouse: false })
    ]));
  });

  it('4. inventoryApi.getSummary requests GET /api/v1/inventory/summary with store param', async () => {
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

  it('5. inventoryApi.adjustStock posts to /api/v1/inventory/adjust', async () => {
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

  it('6. inventoryApi.transferStock posts to /api/v1/inventory/transfer with batchId', async () => {
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
