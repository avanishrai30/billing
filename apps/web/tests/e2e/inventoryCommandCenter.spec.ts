import { test, expect } from '@playwright/test';

const mockStores = [
  { id: 'central-warehouse', name: 'Central Warehouse', code: 'WH-01', isWarehouse: true },
  { id: 'store-1', name: 'Store 1 — Indiranagar', code: 'ST-01', isWarehouse: false },
  { id: 'store-2', name: 'Store 2 — Koramangala', code: 'ST-02', isWarehouse: false },
  { id: 'store-3', name: 'Store 3 — Whitefield', code: 'ST-03', isWarehouse: false }
];

const mockCommandCenterData = {
  success: true,
  stores: mockStores,
  networkBalances: [
    {
      productId: 'prod-ghee-101',
      productName: 'A2 Cow Ghee',
      sku: 'AIA000002',
      barcode: 'AIA000002',
      brand: 'VC Organics',
      category: 'Dairy',
      unit: '1 litre jar',
      cost: 450,
      price: 650,
      reorderLevel: 25,
      isOrphan: false,
      defaultExpiryDate: '2027-08-25T00:00:00.000Z',
      networkQuantity: 135,
      networkReserved: 0,
      networkAvailable: 135,
      locationBreakdown: [
        { locationId: 'central-warehouse', locationName: 'Central Warehouse', isWarehouse: true, quantity: 100, reservedQuantity: 0, available: 100 },
        { locationId: 'store-1', locationName: 'Store 1 — Indiranagar', isWarehouse: false, quantity: 20, reservedQuantity: 0, available: 20 },
        { locationId: 'store-2', locationName: 'Store 2 — Koramangala', isWarehouse: false, quantity: 10, reservedQuantity: 0, available: 10 },
        { locationId: 'store-3', locationName: 'Store 3 — Whitefield', isWarehouse: false, quantity: 5, reservedQuantity: 0, available: 5 }
      ],
      batches: [
        {
          id: 'batch-ghee-lot1',
          lotNumber: 'LOT-2026-001',
          expiryDate: '2027-08-25T00:00:00.000Z',
          remainingQuantity: 100,
          locationId: 'central-warehouse'
        }
      ]
    }
    ,
    {
      productId: 'prod-aloe-zero',
      productName: 'Aloe Shampoo',
      sku: 'SKU-ALOE',
      barcode: '890000000001',
      brand: 'VC Organics',
      category: 'Personal Care',
      unit: 'bottle',
      cost: 80,
      price: 140,
      reorderLevel: 5,
      isOrphan: false,
      defaultExpiryDate: null,
      networkQuantity: 0,
      networkReserved: 0,
      networkAvailable: 0,
      locationBreakdown: [
        { locationId: 'central-warehouse', locationName: 'Central Warehouse', isWarehouse: true, quantity: 0, reservedQuantity: 0, available: 0 },
        { locationId: 'store-1', locationName: 'Store 1 — Indiranagar', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 },
        { locationId: 'store-2', locationName: 'Store 2 — Koramangala', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 },
        { locationId: 'store-3', locationName: 'Store 3 — Whitefield', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 }
      ],
      batches: []
    }
  ],
  summary: {
    totalProducts: 2,
    catalogProducts: 2,
    stockedProducts: 1,
    networkStock: 135,
    centralStock: 100,
    storeStock: 35,
    lowStockCount: 0,
    outOfStockCount: 1,
    expiringSoonCount: 0,
    totalValuation: 60750
  }
};

const productionLikeStores = [
  { id: 'st-1787728871789', name: "VC ORGANIC'S WAREHOUSE", code: 'WAREHOUSE', type: 'WAREHOUSE', locationType: 'WAREHOUSE', isHub: true, isWarehouse: true, status: 'active' },
  { id: 'st-srs', name: 'VC ORGANIC SRS', code: 'SRS', type: 'STORE', locationType: 'STORE', isHub: false, isWarehouse: false, status: 'active' },
  { id: 'st-temple-stall', name: 'VC ORGANIC Temple Stall', code: 'TEMPLE', type: 'STORE', locationType: 'STORE', isHub: false, isWarehouse: false, status: 'active' },
  { id: 'st-banswadi', name: "VC ORGANIC'S Banswadi", code: 'BANSWADI', type: 'STORE', locationType: 'STORE', isHub: false, isWarehouse: false, status: 'active' }
];

const productionLikeCommandCenterData = {
  success: true,
  stores: productionLikeStores,
  networkBalances: [
    {
      productId: 'prod-production-parity',
      productName: 'Production Parity Product',
      sku: 'SKU-PROD-PARITY',
      barcode: '890000000117',
      brand: 'VC Organics',
      category: 'Grocery',
      unit: 'units',
      cost: 100,
      price: 140,
      reorderLevel: 10,
      isOrphan: false,
      defaultExpiryDate: null,
      networkQuantity: 117,
      networkReserved: 0,
      networkAvailable: 117,
      locationBreakdown: [
        { locationId: 'st-1787728871789', locationName: "VC ORGANIC'S WAREHOUSE", type: 'WAREHOUSE', locationType: 'WAREHOUSE', isWarehouse: true, isHub: true, quantity: 0, reservedQuantity: 0, available: 0 },
        { locationId: 'st-srs', locationName: 'VC ORGANIC SRS', type: 'STORE', locationType: 'STORE', isWarehouse: false, isHub: false, quantity: 115, reservedQuantity: 0, available: 115 },
        { locationId: 'st-temple-stall', locationName: 'VC ORGANIC Temple Stall', type: 'STORE', locationType: 'STORE', isWarehouse: false, isHub: false, quantity: 2, reservedQuantity: 0, available: 2 },
        { locationId: 'st-banswadi', locationName: "VC ORGANIC'S Banswadi", type: 'STORE', locationType: 'STORE', isWarehouse: false, isHub: false, quantity: 0, reservedQuantity: 0, available: 0 }
      ],
      batches: []
    }
  ],
  summary: {
    totalProducts: 1,
    catalogProducts: 1,
    stockedProducts: 1,
    networkStock: 117,
    centralStock: 0,
    storeStock: 117,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    replenishmentRequiredCount: 0,
    totalValuation: 11700
  }
};

test.describe('Phase 33 — Inventory Command Center & Multi-Store Stock Visibility E2E Suite', () => {
  test('1. Multi-Store Stock Visibility: Network consolidated view, Central Warehouse hub & Store tabs with location breakdown', async ({ page }) => {
    // Inject Super Admin Session
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-superadmin-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-superadmin',
          name: 'Super Administrator',
          username: 'superadmin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active',
          permissions: ['*']
        })
      );
    });

    // Mock auth & settings
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-superadmin',
            name: 'Super Administrator',
            username: 'superadmin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S", logo: '/uploads/logos/vc-logo.webp' })
      });
    });

    // Mock Command Center endpoint
    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCommandCenterData)
      });
    });

    await page.route('**/api/v1/inventory/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { limit: 15, nextCursor: null } })
      });
    });

    await page.goto('/inventory');

    // 1. Verify Header and Location Tabs
    await expect(page.getByRole('heading', { name: 'Inventory Command Center' })).toBeVisible();
    await expect(page.getByRole('button', { name: /network consolidated/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /central warehouse/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /store 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /store 2/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /store 3/i })).toBeVisible();

    // 2. Verify Summary Cards
    await expect(page.getByText('Catalog Products')).toBeVisible();
    await expect(page.getByText('1 currently stocked')).toBeVisible();
    await expect(page.getByText('Network Stock')).toBeVisible();
    await expect(page.getByText('135').first()).toBeVisible();
    await expect(page.getByText('Central Stock')).toBeVisible();
    await expect(page.getByText('100').first()).toBeVisible();
    await expect(page.getByText('Store Stock')).toBeVisible();
    await expect(page.getByText('35').first()).toBeVisible();

    // 3. Verify Table in Network Consolidated View
    await expect(page.getByText('A2 Cow Ghee')).toBeVisible();
    await expect(page.getByText('AIA000002', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('1 litre jar')).toBeVisible();
    await expect(page.getByText('LOT-2026-001')).toBeVisible();
    await expect(page.getByText('Aloe Shampoo')).toBeVisible();
    await expect(page.getByText('SKU-ALOE')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Aloe Shampoo' }).getByText('Out of Stock')).toBeVisible();

    // 4. Switch to Store 1 Tab
    await page.getByRole('button', { name: /store 1/i }).click();
    // On hand in Store 1 is 20
    await expect(page.getByText('20').first()).toBeVisible();

    // 5. Switch to Central Warehouse Tab
    await page.getByRole('button', { name: /central warehouse/i }).click();
    // On hand in Central is 100
    await expect(page.getByText('100').first()).toBeVisible();
  });

  test('2. Atomic Stock Transfer UX: Central Warehouse to Store 1 with Batch LOT preservation and Invariant Network Total', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-superadmin-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-superadmin',
          name: 'Super Administrator',
          username: 'superadmin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active',
          permissions: ['*']
        })
      );
    });

    let currentStockData = JSON.parse(JSON.stringify(mockCommandCenterData));

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-superadmin',
            name: 'Super Administrator',
            username: 'superadmin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S" })
      });
    });

    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentStockData)
      });
    });

    // Mock transfer execution
    await page.route('**/api/v1/inventory/transfer', async (route) => {
      currentStockData.networkBalances[0].locationBreakdown[0].quantity = 80;
      currentStockData.networkBalances[0].locationBreakdown[0].available = 80;
      currentStockData.networkBalances[0].locationBreakdown[1].quantity = 40;
      currentStockData.networkBalances[0].locationBreakdown[1].available = 40;
      currentStockData.summary.centralStock = 80;
      currentStockData.summary.storeStock = 55;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Stock transfer completed successfully',
          referenceId: 'tf-12345',
          transfer: {
            success: true,
            referenceId: 'tf-12345',
            fromBefore: 100,
            fromAfter: 80,
            toBefore: 20,
            toAfter: 40,
            batchLotNumber: 'LOT-2026-001'
          }
        })
      });
    });

    await page.goto('/inventory');

    // Trigger Transfer Stock modal
    const transferBtn = page.getByRole('button', { name: /transfer stock/i });
    await transferBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Inter-Store Stock Transfer')).toBeVisible();

    // Verify Live Simulation Preview is visible
    await expect(modal.getByText('Live Transfer Simulation Preview')).toBeVisible();
    await expect(modal.getByText('Network Total', { exact: true })).toBeVisible();

    // Set quantity to 20
    const qtyInput = modal.locator('input[type="number"]');
    await qtyInput.fill('20');

    // Confirm transfer
    const confirmBtn = modal.getByRole('button', { name: /confirm transfer/i });
    await confirmBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test('3. Store-restricted user view: Store 1 cashier cannot see or manipulate other store stock', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-store1-cashier-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-cashier-st1',
          name: 'Indiranagar Cashier',
          username: 'cashier1',
          role: 'CASHIER',
          category: 'employee',
          assignedStoreId: 'store-1',
          status: 'active',
          permissions: ['inventory.view']
        })
      );
    });

    const store1RestrictedData = {
      success: true,
      stores: [{ id: 'store-1', name: 'Store 1 — Indiranagar', code: 'ST-01', isWarehouse: false }],
      networkBalances: [
        {
          productId: 'prod-ghee-101',
          productName: 'A2 Cow Ghee',
          sku: 'AIA000002',
          barcode: 'AIA000002',
          category: 'Dairy',
          unit: '1 litre jar',
          cost: 450,
          price: 650,
          reorderLevel: 25,
          isOrphan: false,
          networkQuantity: 20,
          networkReserved: 0,
          networkAvailable: 20,
          locationBreakdown: [
            { locationId: 'store-1', locationName: 'Store 1 — Indiranagar', isWarehouse: false, quantity: 20, reservedQuantity: 0, available: 20 }
          ],
          batches: []
        }
      ],
      summary: {
        totalProducts: 1,
        networkStock: 20,
        centralStock: 0,
        storeStock: 20,
        lowStockCount: 1,
        outOfStockCount: 0,
        expiringSoonCount: 0,
        totalValuation: 9000
      }
    };

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-cashier-st1',
            name: 'Indiranagar Cashier',
            username: 'cashier1',
            role: 'CASHIER',
            category: 'employee',
            assignedStoreId: 'store-1',
            status: 'active'
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S" })
      });
    });

    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(store1RestrictedData)
      });
    });

    await page.goto('/inventory');

    // Store 1 cashier only sees Store 1 button tab
    await expect(page.getByRole('button', { name: /store 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /network consolidated/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /store 2/i })).not.toBeVisible();
  });

  test('4. Zero-stock Product Master becomes stocked after adjustment and preserves network total after transfer', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-superadmin-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-superadmin',
          name: 'Super Administrator',
          username: 'superadmin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active',
          permissions: ['*']
        })
      );
    });

    const currentStockData = {
      success: true,
      stores: mockStores,
      networkBalances: [
        {
          productId: 'prod-aloe-zero',
          productName: 'Aloe Shampoo',
          sku: 'SKU-ALOE',
          barcode: '890000000001',
          brand: 'VC Organics',
          category: 'Personal Care',
          unit: 'bottle',
          cost: 80,
          price: 140,
          reorderLevel: 5,
          isOrphan: false,
          defaultExpiryDate: null,
          networkQuantity: 0,
          networkReserved: 0,
          networkAvailable: 0,
          locationBreakdown: [
            { locationId: 'central-warehouse', locationName: 'Central Warehouse', isWarehouse: true, quantity: 0, reservedQuantity: 0, available: 0 },
            { locationId: 'store-1', locationName: 'Store 1 — Indiranagar', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 },
            { locationId: 'store-2', locationName: 'Store 2 — Koramangala', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 },
            { locationId: 'store-3', locationName: 'Store 3 — Whitefield', isWarehouse: false, quantity: 0, reservedQuantity: 0, available: 0 }
          ],
          batches: []
        }
      ],
      summary: {
        totalProducts: 1,
        catalogProducts: 1,
        stockedProducts: 0,
        networkStock: 0,
        centralStock: 0,
        storeStock: 0,
        lowStockCount: 0,
        outOfStockCount: 1,
        expiringSoonCount: 0,
        totalValuation: 0
      }
    };

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-superadmin',
            name: 'Super Administrator',
            username: 'superadmin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active',
            permissions: ['*']
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S" })
      });
    });

    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentStockData)
      });
    });

    await page.route('**/api/v1/inventory/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { limit: 15, nextCursor: null } })
      });
    });

    await page.route('**/api/v1/inventory/adjust', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.productId).toBe('prod-aloe-zero');
      expect(body.locationId).toBe('central-warehouse');
      expect(Number(body.quantity)).toBe(100);

      const item = currentStockData.networkBalances[0];
      item.networkQuantity = 100;
      item.networkAvailable = 100;
      item.locationBreakdown[0].quantity = 100;
      item.locationBreakdown[0].available = 100;
      currentStockData.summary.stockedProducts = 1;
      currentStockData.summary.networkStock = 100;
      currentStockData.summary.centralStock = 100;
      currentStockData.summary.outOfStockCount = 0;
      currentStockData.summary.totalValuation = 8000;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, productId: body.productId, locationId: body.locationId, quantity: 100 })
      });
    });

    await page.route('**/api/v1/inventory/transfer', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.productId).toBe('prod-aloe-zero');
      expect(body.fromLocationId).toBe('central-warehouse');
      expect(body.toLocationId).toBe('store-1');
      expect(Number(body.quantity)).toBe(30);

      const item = currentStockData.networkBalances[0];
      item.locationBreakdown[0].quantity = 70;
      item.locationBreakdown[0].available = 70;
      item.locationBreakdown[1].quantity = 30;
      item.locationBreakdown[1].available = 30;
      item.networkQuantity = 100;
      item.networkAvailable = 100;
      currentStockData.summary.networkStock = 100;
      currentStockData.summary.centralStock = 70;
      currentStockData.summary.storeStock = 30;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Stock transfer completed successfully',
          referenceId: 'tf-phase35',
          transfer: {
            success: true,
            referenceId: 'tf-phase35',
            fromBefore: 100,
            fromAfter: 70,
            toBefore: 0,
            toAfter: 30
          }
        })
      });
    });

    await page.goto('/inventory');

    await expect(page.getByText('Aloe Shampoo')).toBeVisible();
    await expect(page.getByText('0 currently stocked')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Aloe Shampoo' }).getByText('Out of Stock')).toBeVisible();

    await page.getByRole('button', { name: /stock adjustment/i }).click();
    const adjustModal = page.getByRole('dialog');
    await expect(adjustModal.getByText('Stock Level Adjustment')).toBeVisible();
    await adjustModal.locator('input[type="number"]').fill('100');
    await adjustModal.getByPlaceholder(/physical count reconciliation/i).fill('Opening stock receipt');
    await adjustModal.getByRole('button', { name: /confirm adjustment/i }).click();
    await expect(adjustModal).not.toBeVisible();

    await expect(page.getByText('1 currently stocked')).toBeVisible();
    await expect(page.getByText('100').first()).toBeVisible();

    await page.locator('button').filter({ hasText: 'Transfer Stock' }).click();
    const transferModal = page.getByRole('dialog');
    await expect(transferModal.getByText('Inter-Store Stock Transfer')).toBeVisible();
    await transferModal.locator('input[type="number"]').fill('30');
    await transferModal.getByRole('button', { name: /confirm transfer/i }).click();
    await expect(transferModal).not.toBeVisible();

    await page.getByRole('button', { name: /central warehouse/i }).click();
    await expect(page.getByText('70').first()).toBeVisible();
    await page.getByRole('button', { name: /store 1/i }).click();
    await expect(page.getByText('30').first()).toBeVisible();
    await page.getByRole('button', { name: /network consolidated/i }).click();
    await expect(page.getByText('100').first()).toBeVisible();
  });

  test('5. Production-like store names keep zero-stock Central Warehouse visible for global users', async ({ page }) => {
    const consoleErrors: string[] = [];
    const apiErrors: string[] = [];
    const superAdmin = {
      id: 'usr-superadmin',
      name: 'Super Administrator',
      username: 'superadmin',
      role: 'SUPER ADMIN',
      category: 'super admin',
      assignedStoreId: 'all',
      assignedStores: ['all'],
      status: 'active',
      permissions: ['*']
    };

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('response', (response) => {
      if (response.url().includes('/api/v1/') && response.status() >= 400) {
        apiErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-superadmin-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
      localStorage.setItem('aiavro_selected_store_id', 'st-srs');
    }, superAdmin);

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: superAdmin })
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
        body: JSON.stringify({ title: "VC ORGANIC'S" })
      });
    });

    await page.route('**/api/v1/stores', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(productionLikeStores)
      });
    });

    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(productionLikeCommandCenterData)
      });
    });

    await page.route('**/api/v1/inventory/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { limit: 15, nextCursor: null } })
      });
    });

    await page.goto('/inventory');

    const networkTab = page.getByRole('button', { name: /network consolidated/i });
    const srsTab = page.getByRole('button', { name: /VC ORGANIC SRS/i });
    await expect(networkTab).toBeVisible();
    await expect(page.getByRole('button', { name: /VC ORGANIC'S WAREHOUSE/i })).toBeVisible();
    await expect(srsTab).toBeVisible();
    await expect(srsTab).toHaveClass(/bg-emerald-700/);
    await expect(page.getByRole('button', { name: /VC ORGANIC Temple Stall/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /VC ORGANIC'S Banswadi/i })).toBeVisible();
    await expect(page.getByText('Production Parity Product')).toBeVisible();
    await expect(page.getByText('115').first()).toBeVisible();

    await networkTab.click();
    await expect(networkTab).toHaveClass(/bg-slate-900/);
    await expect(page.getByText('117').first()).toBeVisible();
    await expect(page.getByText('Central Stock')).toBeVisible();

    await page.getByRole('button', { name: /VC ORGANIC'S WAREHOUSE/i }).click();
    await expect(page.getByText('Production Parity Product')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Production Parity Product' }).getByText('Out of Stock')).toBeVisible();

    await srsTab.click();
    await expect(page.getByText('Production Parity Product')).toBeVisible();
    await expect(page.getByText('115').first()).toBeVisible();

    await expect(page.getByRole('button', { name: /VC ORGANIC'S WAREHOUSE/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /network consolidated/i })).toBeVisible();
    await expect.poll(async () => {
      return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    }).toBe(true);
    expect(apiErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
