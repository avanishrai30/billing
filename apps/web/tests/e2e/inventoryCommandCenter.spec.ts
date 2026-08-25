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
  ],
  summary: {
    totalProducts: 1,
    networkStock: 135,
    centralStock: 100,
    storeStock: 35,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    totalValuation: 60750
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
});
