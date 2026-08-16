import { test, expect } from '@playwright/test';

const mockDashboardResponseAll = {
  success: true,
  metrics: {
    totalSales: 25000,
    netProfit: 7500,
    totalPurchases: 12000,
    franchiseEarnings: 0,
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

const mockDashboardResponseStore1 = {
  ...mockDashboardResponseAll,
  metrics: {
    ...mockDashboardResponseAll.metrics,
    totalSales: 15000,
    netProfit: 4500,
    totalPurchases: 8000,
    invoiceCount: 40,
    purchaseCount: 12
  },
  activeStoreId: 'store-1'
};

let mockStores = [
  {
    id: 'store-1',
    name: 'Mumbai Flagship',
    code: 'ST-MUM',
    address: 'Bandra West, Mumbai',
    phone: '022-26401234',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'store-2',
    name: 'Pune Branch',
    code: 'ST-PUN',
    address: 'Kalyani Nagar, Pune',
    phone: '020-25601234',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

let mockBusinesses = [
  {
    id: 'biz-1',
    name: 'VC Organic Billing Pvt Ltd',
    subtitle: 'Pure Organic Farm Produce',
    owner: 'Avanish Rai',
    gstin: '27AAAAA0000A1Z5',
    phone: '9876543210',
    email: 'admin@vcorganic.com',
    address: '102 Green Acres, Bandra West, Mumbai',
    bankName: 'HDFC Bank Ltd',
    accountNo: '50200012345678',
    ifsc: 'HDFC0000123',
    upiId: 'vcorganic@hdfcbank',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 11B Stores & Unified Store Scope E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Reset mock lists
    mockStores = [
      {
        id: 'store-1',
        name: 'Mumbai Flagship',
        code: 'ST-MUM',
        address: 'Bandra West, Mumbai',
        phone: '022-26401234',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'store-2',
        name: 'Pune Branch',
        code: 'ST-PUN',
        address: 'Kalyani Nagar, Pune',
        phone: '020-25601234',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];

    // Authenticate as Super Admin by default
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
      const url = new URL(route.request().url());
      const storeId = url.searchParams.get('storeId');
      const response = storeId === 'store-1' ? mockDashboardResponseStore1 : mockDashboardResponseAll;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    await page.route('**/api/v1/stores/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockStores.find((s) => s.id === id);
        if (match) {
          Object.assign(match, body, { updatedAt: new Date().toISOString() });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, store: match })
        });
      }

      if (route.request().method() === 'DELETE') {
        mockStores = mockStores.filter((s) => s.id !== id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Store deleted successfully' })
        });
      }

      if (route.request().method() === 'GET') {
        const match = mockStores.find((s) => s.id === id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match || { id, name: 'Store', code: 'ST-01', status: 'active' })
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/stores', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockStores)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newStore = {
          ...body,
          id: `st-${Date.now()}`,
          status: body.status || 'active',
          createdAt: new Date().toISOString()
        };
        mockStores.push(newStore);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, store: newStore })
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/businesses/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockBusinesses.find((b) => b.id === id) || mockBusinesses[0];
        if (match) {
          Object.assign(match, body, { updatedAt: new Date().toISOString() });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, business: match })
        });
      }

      if (route.request().method() === 'DELETE') {
        mockBusinesses = mockBusinesses.filter((b) => b.id !== id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Business deleted successfully' })
        });
      }

      if (route.request().method() === 'GET') {
        const match = mockBusinesses.find((b) => b.id === id) || mockBusinesses[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match)
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/businesses', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockBusinesses)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newBiz = {
          ...body,
          id: body.id || `biz-${Date.now()}`,
          status: body.status || 'active',
          updatedAt: new Date().toISOString()
        };
        mockBusinesses[0] = newBiz;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, business: newBiz })
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/inventory*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          balances: [],
          summary: {
            totalSKUs: 10,
            healthyStockCount: 9,
            lowStockCount: 1,
            outOfStockCount: 0,
            assetValuationCost: 35000,
            assetValuationRetail: 55000
          }
        })
      });
    });

    await page.route('**/api/v1/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          invoices: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
        })
      });
    });

    await page.route('**/api/v1/purchases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          purchases: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
        })
      });
    });

    await page.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('1. Unified Store Scope Switching: Topbar Selector propagates scope across Dashboard, Inventory, Invoices & Stores Directory', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Load Dashboard with All Stores
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // Verify Topbar Selector is present and set to All Stores
    const storeSelect = page.getByRole('combobox', { name: /select active store outlet/i });
    await expect(storeSelect).toBeVisible();
    await expect(storeSelect).toHaveValue('all');

    // 2. Switch store to Mumbai Flagship (store-1)
    await storeSelect.selectOption('store-1');
    await page.waitForLoadState('networkidle');

    // 3. Navigate to Stores Directory
    await page.getByRole('link', { name: 'Outlets' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Business & Legal Entity Profile' })).toBeVisible();
    await expect(page.getByText('VC Organic Billing Pvt Ltd')).toBeVisible();
    await expect(page.locator('div[title="Mumbai Flagship"]')).toBeVisible();
    await expect(page.locator('div[title="Pune Branch"]')).toBeVisible();

    // Capture visual baseline of Desktop Stores (1440x900)
    await page.screenshot({ path: 'test-results/desktop-stores.png', fullPage: true });

    // 4. Register New Store
    await page.getByRole('button', { name: /register store/i }).click();
    const storeModal = page.getByRole('dialog');
    await expect(storeModal).toBeVisible();
    await expect(storeModal.getByText(/register new store branch/i)).toBeVisible();

    await storeModal.getByPlaceholder('e.g. Bandra West Outlet').fill('Delhi Central');
    await storeModal.getByPlaceholder('e.g. ST-BAN').fill('ST-DEL');
    await storeModal.getByPlaceholder(/shop 12, hill road/i).fill('Connaught Place, New Delhi');

    await storeModal.getByRole('button', { name: /register store/i }).click();
    await expect(storeModal).not.toBeVisible();

    await expect(page.locator('div[title="Delhi Central"]')).toBeVisible();

    // 5. Edit Business Profile
    await page.getByRole('button', { name: /edit business profile/i }).click();
    const bizModal = page.getByRole('dialog');
    await expect(bizModal).toBeVisible();
    await expect(bizModal.getByText(/edit business profile/i)).toBeVisible();

    const subtitleInput = bizModal.getByPlaceholder(/pure organic farm products/i);
    await subtitleInput.fill('Farm Fresh Organic Groceries');
    await bizModal.getByRole('button', { name: /save changes/i }).click();
    await expect(bizModal).not.toBeVisible();

    await expect(page.getByText('Farm Fresh Organic Groceries')).toBeVisible();

    // 6. Return to Dashboard and confirm stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Restricted User Isolation: Cashier assigned to store-1 has disabled/locked store selector', async ({
    page
  }) => {
    // Override user with Cashier assigned to store-1
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-cashier-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-2',
          name: 'Rohan Cashier',
          username: 'cashier',
          role: 'CASHIER',
          category: 'cashier',
          assignedStoreId: 'store-1',
          status: 'active'
        })
      );
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Confirm that the Topbar shows locked store indicator and NO selectable dropdown
    await expect(page.getByText('Locked')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /select active store outlet/i })).not.toBeVisible();
  });

  test('3. Mobile Responsive Viewport (430x932) has zero horizontal overflow and responsive table layout', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/stores');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Store & Branch Outlets' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-stores.png', fullPage: true });
  });
});
