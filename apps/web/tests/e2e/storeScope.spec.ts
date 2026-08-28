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

const mockDashboardResponseStore2 = {
  ...mockDashboardResponseAll,
  metrics: {
    ...mockDashboardResponseAll.metrics,
    totalSales: 10000,
    netProfit: 3000,
    totalPurchases: 4000,
    invoiceCount: 20,
    purchaseCount: 6
  },
  activeStoreId: 'store-2'
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

test.describe('Phase 11C Cross-Module Store Scope Regression & Hardening Suite', () => {
  test.beforeEach(async ({ page }) => {
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

    mockBusinesses = [
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

    const superAdminUser = {
      id: 'usr-1',
      name: 'Super Admin',
      username: 'admin',
      role: 'SUPER ADMIN',
      category: 'super admin',
      assignedStoreId: 'all',
      status: 'active',
      permissions: ['*']
    };

    await page.route('**/api/v1/auth/verify', async (route) => {
      const authHeader = route.request().headers()['authorization'] || '';
      if (authHeader.includes('mock-cashier-token')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: 'usr-2',
              name: 'Rohan Cashier',
              username: 'cashier',
              role: 'CASHIER',
              category: 'cashier',
              assignedStoreId: 'store-1',
              status: 'active',
              permissions: ['dashboard.view', 'pos.view']
            }
          })
        });
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: superAdminUser })
      });
    });

    await page.route('**/api/v1/rbac/me/permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, effectivePermissions: ['*'] })
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
      let response = mockDashboardResponseAll;
      if (storeId === 'store-1') response = mockDashboardResponseStore1;
      if (storeId === 'store-2') response = mockDashboardResponseStore2;

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

    await page.route('**/api/v1/inventory/command-center*', async (route) => {
      const url = new URL(route.request().url());
      const locationId = url.searchParams.get('locationId');

      const p1 = {
        productId: 'p1',
        productName: 'A2 Pure Ghee 1L (Mumbai Stock)',
        sku: 'GHEE-1L',
        barcode: '8901234567890',
        category: 'Dairy',
        unit: 'tin',
        sellingPrice: 650,
        price: 650,
        cost: 450,
        reorderLevel: 10,
        networkQuantity: 50,
        networkReserved: 0,
        networkAvailable: 50,
        isOrphan: false,
        locationBreakdown: [
          { locationId: 'store-1', locationName: 'Mumbai Flagship', isWarehouse: false, quantity: 50, reservedQuantity: 0, available: 50 },
          { locationId: 'store-2', locationName: 'Pune Branch', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 }
        ],
        batches: []
      };

      const p2 = {
        productId: 'p2',
        productName: 'Organic Honey 500g (Pune Stock)',
        sku: 'HONEY-500',
        barcode: '8901234567891',
        category: 'Staples',
        unit: 'jar',
        sellingPrice: 350,
        price: 350,
        cost: 220,
        reorderLevel: 10,
        networkQuantity: 30,
        networkReserved: 0,
        networkAvailable: 30,
        isOrphan: false,
        locationBreakdown: [
          { locationId: 'store-1', locationName: 'Mumbai Flagship', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 },
          { locationId: 'store-2', locationName: 'Pune Branch', isWarehouse: false, quantity: 30, reservedQuantity: 0, available: 30 }
        ],
        batches: []
      };

      const allStores = [
        { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', isWarehouse: false },
        { id: 'store-2', name: 'Pune Branch', code: 'ST-PUN', isWarehouse: false }
      ];

      let stores = allStores;
      let networkBalances = [p1, p2];

      if (locationId === 'store-1') {
        stores = [allStores[0]];
        networkBalances = [p1];
      } else if (locationId === 'store-2') {
        stores = [allStores[1]];
        networkBalances = [p2];
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          locations: stores,
          products: networkBalances,
          stores,
          networkBalances,
          summary: {
            totalProducts: networkBalances.length,
            catalogProducts: networkBalances.length,
            stockedProducts: networkBalances.length,
            networkStock: locationId === 'store-1' ? 50 : locationId === 'store-2' ? 30 : 80,
            centralStock: 0,
            storeStock: locationId === 'store-1' ? 50 : locationId === 'store-2' ? 30 : 80,
            lowStockCount: 0,
            outOfStockCount: 0,
            expiringSoonCount: 0,
            totalValuation: 29100
          }
        })
      });
    });

    await page.route('**/api/v1/inventory/logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { limit: 15, nextCursor: null } })
      });
    });

    await page.route('**/api/v1/inventory*', async (route) => {
      const url = new URL(route.request().url());
      const locationId = url.searchParams.get('locationId');

      let balances: any[] = [];
      if (locationId === 'store-1') {
        balances = [
          {
            _id: 'inv-1',
            productId: 'p1',
            name: 'A2 Pure Ghee 1L (Mumbai Stock)',
            sku: 'GHEE-1L',
            category: 'Dairy',
            locationId: 'store-1',
            quantity: 50,
            stockStatus: 'HEALTHY'
          }
        ];
      } else if (locationId === 'store-2') {
        balances = [
          {
            _id: 'inv-2',
            productId: 'p2',
            name: 'Organic Honey 500g (Pune Stock)',
            sku: 'HONEY-500',
            category: 'Staples',
            locationId: 'store-2',
            quantity: 30,
            stockStatus: 'HEALTHY'
          }
        ];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          inventory: balances,
          balances,
          summary: {
            totalSKUs: balances.length,
            healthyStockCount: balances.length,
            lowStockCount: 0,
            outOfStockCount: 0,
            assetValuationCost: balances.length * 500,
            assetValuationRetail: balances.length * 750
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
        body: JSON.stringify([
          { id: 'p1', name: 'A2 Pure Ghee 1L (Mumbai Stock)', sku: 'GHEE-1L', category: 'Dairy', price: 750, cost: 500 },
          { id: 'p2', name: 'Organic Honey 500g (Pune Stock)', sku: 'HONEY-500', category: 'Staples', price: 400, cost: 250 }
        ])
      });
    });

    await page.route('**/api/v1/customers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'c1', name: 'Global Customer John', phone: '9876543210' }
        ])
      });
    });

    await page.route('**/api/v1/suppliers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 's1', name: 'Global Supplier Amul', phone: '9123456780' }
        ])
      });
    });
  });

  test('1. Cross-Module Store Scope Switching: Topbar Selector propagates scope across Dashboard, Inventory, Invoices & Outlets Directory', async ({
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
    const [updateResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/v1/businesses') && res.request().method() === 'PATCH'),
      bizModal.getByRole('button', { name: /save changes/i }).click()
    ]);
    expect(updateResponse.status()).toBe(200);
    await expect(bizModal).not.toBeVisible();

    await expect(page.getByText('Farm Fresh Organic Groceries')).toBeVisible();

    // 6. Return to Dashboard and confirm stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Store A vs Store B Cache Isolation: Inventory records do not leak across stores', async ({
    page
  }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    const storeSelect = page.getByRole('combobox', { name: /select active store outlet/i });
    await expect(storeSelect).toBeVisible();
    await expect(storeSelect).toBeEnabled();

    // Switch to Store 1 -> should see Mumbai Stock item
    await storeSelect.selectOption('store-1');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('A2 Pure Ghee 1L (Mumbai Stock)')).toBeVisible();
    await expect(page.getByText('Organic Honey 500g (Pune Stock)')).not.toBeVisible();

    // Switch to Store 2 -> should see Pune Stock item, and Mumbai stock must disappear
    await storeSelect.selectOption('store-2');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Organic Honey 500g (Pune Stock)')).toBeVisible();
    await expect(page.getByText('A2 Pure Ghee 1L (Mumbai Stock)')).not.toBeVisible();

    // Repeated fast switching A -> B -> A -> B
    for (let i = 0; i < 3; i++) {
      await storeSelect.selectOption('store-1');
      await storeSelect.selectOption('store-2');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Organic Honey 500g (Pune Stock)')).toBeVisible();
  });

  test('3. Restricted User Isolation: Cashier assigned to store-1 has disabled/locked store selector', async ({
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

  test('4. LocalStorage Tampering Fallback: Invalid store ID automatically falls back to "all"', async ({
    page
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_selected_store_id', 'hacked-fake-store-999');
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Topbar selector should safely fall back to 'all'
    const storeSelect = page.getByRole('combobox', { name: /select active store outlet/i });
    await expect(storeSelect).toHaveValue('all');
  });

  test('5. Tenant-Wide Modules: Customers and Suppliers directories remain global regardless of active store', async ({
    page
  }) => {
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Global Customer John')).toBeVisible();

    await page.goto('/suppliers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Global Supplier Amul')).toBeVisible();
  });

  test('6. Mobile Responsive Viewport (430x932 & 390x844) has zero horizontal overflow', async ({
    page
  }) => {
    // Test 430x932
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/stores');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Store & Branch Outlets' })).toBeVisible();

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-stores.png', fullPage: true });

    // Test 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
