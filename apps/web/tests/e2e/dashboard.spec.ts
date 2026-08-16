import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 184500.5,
    netProfit: 42000,
    totalPurchases: 64000,
    franchiseEarnings: 15400,
    stockAssetValuationCost: 310000,
    stockAssetValuationRetail: 480000,
    totalProducts: 48,
    ownProducts: 32,
    externalProducts: 16,
    lowStockCount: 2,
    outOfStockCount: 1,
    categoriesCount: 6,
    brandsCount: 4,
    suppliersCount: 5,
    expiryWarningsCount: 1,
    invoiceCount: 240,
    purchaseCount: 18
  },
  lowStockWatchlist: [
    {
      id: 'prod-1',
      name: 'Organic Cow Butter 500g',
      category: 'Dairy',
      sku: 'AIA-BUT-500',
      stock: 4,
      reorder: 10,
      cost: 280,
      price: 360,
      unit: 'pack',
      image: null
    }
  ],
  recentInvoices: [
    {
      _id: 'inv-101',
      invoiceNumber: 'INV-2026-00101',
      grandTotal: 1250,
      status: 'PAID',
      customerName: 'Rahul Sharma',
      paymentMethod: 'UPI',
      createdAt: new Date().toISOString()
    }
  ],
  recentPurchases: [
    {
      _id: 'po-501',
      purchaseNumber: 'PO-2026-00501',
      supplierName: 'Baramati Milk Cooperative',
      grandTotal: 18500,
      status: 'RECEIVED',
      createdAt: new Date().toISOString()
    }
  ],
  activeStoreId: 'all'
};

test.describe('Phase 4 Dashboard Module E2E & Real-Time Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate session
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-1',
          name: 'Super Admin',
          username: 'admin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active'
        })
      );
    });

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('1. Authenticated Dashboard renders complete KPI grid, chart, and activity tables', async ({ page }) => {
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Page Header
    await expect(
      page.getByRole('heading', { name: 'Business Intelligence & Operational KPIs' })
    ).toBeVisible();

    // Financial KPIs
    await expect(page.getByText('Total Gross Sales')).toBeVisible();
    await expect(page.getByText('Calculated Net Profit')).toBeVisible();
    await expect(page.getByText('Stock Asset Valuation')).toBeVisible();

    // Low Stock Watchlist
    await expect(page.getByText('Organic Cow Butter 500g')).toBeVisible();
    await expect(page.getByText('AIA-BUT-500')).toBeVisible();

    // Recent Sales & Purchases
    await expect(page.getByText('INV-2026-00101')).toBeVisible();
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('PO-2026-00501')).toBeVisible();
    await expect(page.getByText('Baramati Milk Cooperative')).toBeVisible();

    // Capture visual baseline
    await page.screenshot({ path: 'test-results/desktop-dashboard.png', fullPage: true });
  });

  test('2. Mobile viewport (430x932) renders dense KPIs without horizontal scroll', async ({ page }) => {
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Business Intelligence & Operational KPIs' })
    ).toBeVisible();

    // Check no horizontal body overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture mobile baseline screenshot
    await page.screenshot({ path: 'test-results/mobile-dashboard.png', fullPage: true });
  });

  test('3. API 500 error renders ErrorState with operational message and retry control', async ({ page }) => {
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'METRICS_AGGREGATION_FAILED',
            message: 'Database replica synchronization timeout'
          }
        })
      });
    });

    await page.goto('/dashboard');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(page.getByText('Dashboard Aggregation Error')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry request/i })).toBeVisible();
  });

  test('4. Empty state tables render when no active records exist', async ({ page }) => {
    const emptyResponse = {
      ...mockDashboardResponse,
      lowStockWatchlist: [],
      recentInvoices: [],
      recentPurchases: []
    };

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyResponse)
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByText('All Stock Levels Healthy')).toBeVisible();
    await expect(page.getByText('No Invoices Recorded')).toBeVisible();
    await expect(page.getByText('No Purchases Recorded')).toBeVisible();
  });
});
