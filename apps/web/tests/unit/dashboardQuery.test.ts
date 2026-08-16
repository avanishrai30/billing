import { dashboardApi } from '../../features/dashboard/api';
import { apiClient } from '../../lib/api/client';

describe('Dashboard API Transport & Query Client Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Fetches metrics with global scope when storeId is "all" or omitted', async () => {
    const mockApiResponse = {
      success: true,
      metrics: {
        totalSales: 50000,
        netProfit: 12000,
        totalPurchases: 20000,
        franchiseEarnings: 0,
        stockAssetValuationCost: 80000,
        stockAssetValuationRetail: 120000,
        totalProducts: 50,
        ownProducts: 30,
        externalProducts: 20,
        lowStockCount: 2,
        outOfStockCount: 0,
        categoriesCount: 4,
        brandsCount: 2,
        suppliersCount: 3,
        expiryWarningsCount: 1,
        invoiceCount: 85,
        purchaseCount: 8
      },
      lowStockWatchlist: [],
      recentInvoices: [],
      recentPurchases: [],
      activeStoreId: 'all'
    };

    const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValue(mockApiResponse);

    const data = await dashboardApi.getMetrics('all');

    expect(getSpy).toHaveBeenCalledWith('/api/v1/dashboard/metrics', { params: undefined });
    expect(data.metrics.totalSales).toBe(50000);
    expect(data.metrics.netProfit).toBe(12000);
  });

  it('2. Passes storeId parameter when scoped to a specific store location', async () => {
    const mockScopedResponse = {
      success: true,
      metrics: {
        totalSales: 15000,
        netProfit: 4000,
        totalPurchases: 6000,
        franchiseEarnings: 0,
        stockAssetValuationCost: 20000,
        stockAssetValuationRetail: 30000,
        totalProducts: 25,
        ownProducts: 15,
        externalProducts: 10,
        lowStockCount: 0,
        outOfStockCount: 0,
        categoriesCount: 3,
        brandsCount: 1,
        suppliersCount: 2,
        expiryWarningsCount: 0,
        invoiceCount: 22,
        purchaseCount: 2
      },
      lowStockWatchlist: [],
      recentInvoices: [],
      recentPurchases: [],
      activeStoreId: 'store-bandra-1'
    };

    const getSpy = jest.spyOn(apiClient, 'get').mockResolvedValue(mockScopedResponse);

    const data = await dashboardApi.getMetrics('store-bandra-1');

    expect(getSpy).toHaveBeenCalledWith('/api/v1/dashboard/metrics', {
      params: { storeId: 'store-bandra-1' }
    });
    expect(data.activeStoreId).toBe('store-bandra-1');
  });
});
