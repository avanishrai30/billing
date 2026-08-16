import {
  DashboardMetricsSchema,
  LowStockItemSchema,
  RecentInvoiceSchema,
  RecentPurchaseSchema,
  DashboardMetricsResponseSchema
} from '../../features/dashboard/schemas';

describe('Dashboard Zod Runtime Schema Validation', () => {
  it('1. Parses valid backend metrics payload with all numerical aggregates', () => {
    const rawMetrics = {
      totalSales: 154200.5,
      netProfit: 45000,
      totalPurchases: 89000,
      franchiseEarnings: 12000,
      stockAssetValuationCost: 340000,
      stockAssetValuationRetail: 520000,
      totalProducts: 140,
      ownProducts: 90,
      externalProducts: 50,
      lowStockCount: 3,
      outOfStockCount: 1,
      categoriesCount: 8,
      brandsCount: 5,
      suppliersCount: 6,
      expiryWarningsCount: 2,
      invoiceCount: 420,
      purchaseCount: 15
    };

    const parsed = DashboardMetricsSchema.parse(rawMetrics);
    expect(parsed.totalSales).toBe(154200.5);
    expect(parsed.netProfit).toBe(45000);
    expect(parsed.totalProducts).toBe(140);
  });

  it('2. Fills default fallback values for partial/missing numeric aggregates', () => {
    const parsed = DashboardMetricsSchema.parse({});
    expect(parsed.totalSales).toBe(0);
    expect(parsed.netProfit).toBe(0);
    expect(parsed.lowStockCount).toBe(0);
    expect(parsed.brandsCount).toBe(1);
  });

  it('3. Parses low stock items and fills defaults', () => {
    const item = LowStockItemSchema.parse({
      id: 'p-1',
      name: 'Paneer 1kg',
      category: 'Dairy',
      sku: 'PAN-101',
      stock: 2,
      reorder: 10,
      cost: 300,
      price: 420,
      unit: 'kg'
    });

    expect(item.name).toBe('Paneer 1kg');
    expect(item.stock).toBe(2);
    expect(item.unit).toBe('kg');
  });

  it('4. Parses complete DashboardMetricsResponseSchema payload', () => {
    const fullResponse = {
      success: true,
      metrics: {
        totalSales: 10000,
        netProfit: 2500,
        totalPurchases: 5000,
        franchiseEarnings: 0,
        stockAssetValuationCost: 20000,
        stockAssetValuationRetail: 35000,
        totalProducts: 20,
        ownProducts: 15,
        externalProducts: 5,
        lowStockCount: 1,
        outOfStockCount: 0,
        categoriesCount: 3,
        brandsCount: 2,
        suppliersCount: 2,
        expiryWarningsCount: 0,
        invoiceCount: 30,
        purchaseCount: 5
      },
      lowStockWatchlist: [],
      recentInvoices: [],
      recentPurchases: [],
      activeStoreId: 'all'
    };

    const parsed = DashboardMetricsResponseSchema.parse(fullResponse);
    expect(parsed.success).toBe(true);
    expect(parsed.activeStoreId).toBe('all');
  });
});
