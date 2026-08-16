import { test, expect } from '@playwright/test';

const mockAuditLogs = [
  {
    _id: 'audit-1',
    eventType: 'invoice_created',
    entity: 'billing',
    entityId: 'INV-1001',
    before: {},
    after: {
      invoiceId: 'INV-1001',
      grandTotal: 3450,
      customerName: 'Anil Deshpande',
      itemsCount: 4
    },
    performedBy: 'ramesh.cashier',
    user: 'Ramesh Patil (@ramesh.cashier)',
    role: 'EMPLOYEE',
    action: 'billing',
    view: 'billing',
    details: "Completed POS transaction for customer 'Anil Deshpande'. Created Invoice #INV-1001 (Total: ₹3450)",
    businessId: 'store-1',
    businessName: 'Mumbai Flagship',
    ip: '192.168.1.50',
    userAgent: 'Mozilla/5.0 Chrome/120.0',
    requestId: 'req-1723812001',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: 'audit-2',
    eventType: 'LOGIN_SUCCESS',
    entity: 'auth',
    entityId: 'usr-1',
    before: {},
    after: {
      username: 'admin',
      role: 'SUPER ADMIN'
    },
    performedBy: 'admin',
    user: 'Super Admin (@admin)',
    role: 'SUPER ADMIN',
    action: 'auth',
    view: 'login',
    details: 'User session authenticated successfully',
    businessId: 'all',
    businessName: 'All Outlets',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 Safari/605.1.15',
    requestId: 'req-1723812002',
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    _id: 'audit-3',
    eventType: 'inventory_updated',
    entity: 'inventory',
    entityId: 'prod-45',
    before: {
      quantity: 50,
      password: 'secretShouldBeRedacted'
    },
    after: {
      quantity: 45,
      reason: 'Physical count adjustment'
    },
    performedBy: 'vikram.s',
    user: 'Vikram Shinde (@vikram.s)',
    role: 'ADMIN',
    action: 'update',
    view: 'inventory',
    details: 'Adjusted inventory stock levels for product ID prod-45 to 45 units',
    businessId: 'store-1',
    businessName: 'Mumbai Flagship',
    ip: '192.168.1.10',
    userAgent: 'Mozilla/5.0 Chrome/120.0',
    requestId: 'req-1723812003',
    timestamp: new Date(Date.now() - 10800000).toISOString()
  }
];

const mockStores = [
  { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active' },
  { id: 'store-2', name: 'Thane Outlet', code: 'ST-THN', status: 'active' }
];

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 25000,
    netProfit: 7500,
    totalPurchases: 12000,
    franchiseEarnings: 10500,
    stockAssetValuationCost: 45000,
    stockAssetValuationRetail: 70000,
    totalProducts: 10,
    ownProducts: 8,
    externalProducts: 2,
    lowStockCount: 1,
    outOfStockCount: 0,
    categoriesCount: 3,
    brandsCount: 2,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 60,
    purchaseCount: 18
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'all'
};

test.describe('Phase 14B Security & Immutable Audit Trail E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'VC Organic Billing',
          logo: '/uploads/logos/brand-logo.webp'
        })
      });
    });

    await page.route('**/uploads/logos/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        )
      });
    });

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });

    await page.route('**/api/v1/audit-logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAuditLogs)
      });
    });
  });

  test('1. Complete Audit Trail Lifecycle: List, Inspect Detail Drawer, Sanitized Diffs & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Audit Trail
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Security & Immutable Audit Trail' })
    ).toBeVisible();

    await expect(page.getByText('POS SALE', { exact: true })).toBeVisible();
    await expect(page.getByText('LOGIN SUCCESS', { exact: true })).toBeVisible();
    await expect(page.getByText('STOCK ADJUST', { exact: true })).toBeVisible();

    // 2. Filter by search query
    await page.getByPlaceholder(/search by actor/i).fill('INV-1001');
    await expect(page.getByText('INV-1001', { exact: true })).toBeVisible();
    await expect(page.getByText('prod-45')).not.toBeVisible();

    // Reset search
    await page.getByPlaceholder(/search by actor/i).fill('');

    // 3. Inspect Detail Drawer
    await page.getByLabel('Inspect audit log details for inventory_updated').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Audit Event Details')).toBeVisible();
    await expect(drawer.getByText('Actor & Security Attribution')).toBeVisible();
    await expect(drawer.getByText('Vikram Shinde (@vikram.s)')).toBeVisible();
    await expect(drawer.getByText('192.168.1.10')).toBeVisible();

    // Close drawer
    await drawer.getByRole('button', { name: 'Close Inspection' }).click();
    await expect(drawer).not.toBeVisible();

    // 4. Return to Dashboard and confirm stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Mobile Responsive Viewport (430x932 & 390x844) has zero horizontal overflow', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Security & Immutable Audit Trail' })
    ).toBeVisible();

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Test 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
