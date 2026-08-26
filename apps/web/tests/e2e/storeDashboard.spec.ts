import { test, expect } from '@playwright/test';

const mockStores = [
  { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active', isHub: false },
  { id: 'store-2', name: 'Thane Hub', code: 'ST-THN', status: 'active', isHub: true }
];

const mockMetricsStore1 = {
  success: true,
  metrics: {
    totalSales: 150000,
    netProfit: 45000,
    totalPurchases: 80000,
    franchiseEarnings: 0,
    stockAssetValuationCost: 250000,
    stockAssetValuationRetail: 380000,
    totalProducts: 25,
    ownProducts: 20,
    externalProducts: 5,
    lowStockCount: 2,
    outOfStockCount: 0,
    categoriesCount: 5,
    brandsCount: 4,
    suppliersCount: 3,
    expiryWarningsCount: 0,
    invoiceCount: 120,
    purchaseCount: 15
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'store-1'
};

const mockMetricsStore2 = {
  success: true,
  metrics: {
    totalSales: 95000,
    netProfit: 28000,
    totalPurchases: 50000,
    franchiseEarnings: 0,
    stockAssetValuationCost: 180000,
    stockAssetValuationRetail: 270000,
    totalProducts: 18,
    ownProducts: 15,
    externalProducts: 3,
    lowStockCount: 0,
    outOfStockCount: 0,
    categoriesCount: 4,
    brandsCount: 3,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 75,
    purchaseCount: 8
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'store-2'
};

test.describe('Store Scoped Dashboard & Sales Metrics E2E Suite', () => {
  test('1. Dashboard metrics reflect store-scoped financial KPIs and update upon switching store', async ({ page }) => {
    const multiStoreAdmin = {
      id: 'usr-admin',
      username: 'admin.west',
      name: 'Regional Admin',
      role: 'Operations Head',
      category: 'admin',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1', 'store-2'],
      permissions: ['*']
    };

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
      localStorage.setItem('aiavro_selected_store_id', 'store-1');
    }, multiStoreAdmin);

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }

      if (url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: multiStoreAdmin }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: ['*'] }) });
      }

      if (url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStores) });
      }

      if (url.includes('/api/v1/dashboard/metrics')) {
        if (url.includes('storeId=store-2')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockMetricsStore2)
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMetricsStore1)
        });
      }

      return route.continue();
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify initial metrics for Store 1
    const totalSalesCard = page.locator('text=₹1,50,000').or(page.locator('text=150,000')).first();
    await expect(totalSalesCard).toBeVisible();

    // Switch store in Topbar to Thane Hub (store-2)
    const storeSelect = page.locator('select[aria-label="Select active store outlet"]');
    await expect(storeSelect).toBeVisible();
    await storeSelect.selectOption('store-2');

    // Verify metrics updated to Store 2 values
    const store2SalesCard = page.locator('text=₹95,000').or(page.locator('text=95,000')).first();
    await expect(store2SalesCard).toBeVisible();
  });
});
