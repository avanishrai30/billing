import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 15000,
    netProfit: 4500,
    totalPurchases: 8000,
    franchiseEarnings: 0,
    stockAssetValuationCost: 35000,
    stockAssetValuationRetail: 55000,
    totalProducts: 10,
    ownProducts: 8,
    externalProducts: 2,
    lowStockCount: 1,
    outOfStockCount: 0,
    categoriesCount: 3,
    brandsCount: 2,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 45,
    purchaseCount: 12
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'all'
};

const mockSummary = {
  totalProducts: 10,
  totalTrackedItems: 8,
  totalUnits: 1450.5,
  lowStockCount: 1,
  outOfStockCount: 1,
  inventoryValue: 85400,
  locationId: 'all'
};

const mockProducts = [
  {
    id: 'prod-101',
    name: 'A2 Pure Cow Ghee 1L',
    sku: 'AIA-GHEE-1L',
    barcode: '8901234567890',
    price: 650,
    sellingPrice: 650,
    cost: 450,
    purchasePrice: 450,
    brand: 'VC Organic',
    category: 'Dairy',
    unit: 'tin',
    reorderLevel: 10,
    status: 'active'
  },
  {
    id: 'prod-102',
    name: 'Farm Fresh Paneer 500g',
    sku: 'AIA-PAN-500',
    barcode: '8901234567891',
    price: 220,
    sellingPrice: 220,
    cost: 160,
    purchasePrice: 160,
    brand: 'VC Organic',
    category: 'Dairy',
    unit: 'pack',
    reorderLevel: 10,
    status: 'active'
  },
  {
    id: 'prod-103',
    name: 'Artisan Sourdough Loaf',
    sku: 'AIA-BREAD-01',
    barcode: '8901234567892',
    price: 180,
    sellingPrice: 180,
    cost: 110,
    purchasePrice: 110,
    brand: 'VC Organic',
    category: 'Bakery',
    unit: 'loaf',
    reorderLevel: 5,
    status: 'active'
  }
];

let mockBalances = [
  {
    _id: 'inv-1',
    productId: 'prod-101',
    locationId: 'store-1',
    storeId: 'store-1',
    quantity: 45,
    reservedQuantity: 5,
    reorderLevel: 10,
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'inv-2',
    productId: 'prod-102',
    locationId: 'store-1',
    storeId: 'store-1',
    quantity: 4,
    reservedQuantity: 0,
    reorderLevel: 10,
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'inv-3',
    productId: 'prod-103',
    locationId: 'store-1',
    storeId: 'store-1',
    quantity: 0,
    reservedQuantity: 0,
    reorderLevel: 5,
    updatedAt: new Date().toISOString()
  },
  {
    _id: 'inv-orphan',
    productId: 'prod-missing-999',
    locationId: 'store-2',
    storeId: 'store-2',
    quantity: 12,
    reservedQuantity: 0,
    reorderLevel: 10,
    updatedAt: new Date().toISOString()
  }
];

const mockStores = [
  { id: 'store-1', name: 'VC Flagship Outlet', code: 'VCF', isWarehouse: true },
  { id: 'store-2', name: 'Bandra West Store', code: 'BWS', isWarehouse: false }
];

const mockLogs = [
  {
    _id: 'log-1',
    movementId: 'mov-1',
    productId: 'prod-101',
    locationId: 'store-1',
    type: 'PURCHASE',
    quantity: 50,
    beforeQuantity: 0,
    afterQuantity: 50,
    unitCost: 450,
    totalValue: 22500,
    referenceType: 'purchase',
    referenceId: 'PUR-2026-001',
    performedBy: 'admin',
    notes: 'Opening stock purchase receipt',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'log-2',
    movementId: 'mov-2',
    productId: 'prod-101',
    locationId: 'store-1',
    type: 'SALE',
    quantity: -5,
    beforeQuantity: 50,
    afterQuantity: 45,
    unitCost: 450,
    totalValue: 3250,
    referenceType: 'invoice',
    referenceId: 'INV-2026-101',
    performedBy: 'cashier1',
    notes: 'POS Sale Checkout #INV-2026-101',
    createdAt: new Date().toISOString()
  }
];

function buildCommandCenterData() {
  const productsById = new Map(mockProducts.map((product) => [product.id, product]));
  const networkBalances = Array.from(
    new Set([...mockProducts.map((product) => product.id), ...mockBalances.map((balance) => balance.productId)])
  ).map((productId) => {
    const product = productsById.get(productId);
    const balances = mockBalances.filter((balance) => balance.productId === productId);
    const isOrphan = !product;
    const locationBreakdown = mockStores.map((store) => {
      const balance = balances.find((item) => item.locationId === store.id || item.storeId === store.id);
      const quantity = Number(balance?.quantity || 0);
      const reservedQuantity = Number(balance?.reservedQuantity || 0);
      return {
        locationId: store.id,
        locationName: store.name,
        isWarehouse: !!store.isWarehouse,
        quantity,
        reservedQuantity,
        available: Math.max(0, quantity - reservedQuantity)
      };
    });
    const networkQuantity = locationBreakdown.reduce((sum, location) => sum + location.quantity, 0);
    const networkReserved = locationBreakdown.reduce((sum, location) => sum + location.reservedQuantity, 0);

    return {
      productId,
      productName: product?.name || 'Product Master Missing',
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      brand: product?.brand || '',
      category: product?.category || (isOrphan ? 'Missing Master' : 'General'),
      unit: product?.unit || 'units',
      cost: product?.cost || product?.purchasePrice || 0,
      price: product?.price || product?.sellingPrice || 0,
      reorderLevel: product?.reorderLevel || 10,
      isOrphan,
      defaultExpiryDate: null,
      networkQuantity,
      networkReserved,
      networkAvailable: Math.max(0, networkQuantity - networkReserved),
      locationBreakdown,
      batches: []
    };
  });

  const totalStock = networkBalances.reduce((sum, item) => sum + item.networkQuantity, 0);
  const centralStock = networkBalances.reduce((sum, item) => {
    const central = item.locationBreakdown.find((location) => location.isWarehouse);
    return sum + (central?.quantity || 0);
  }, 0);

  return {
    success: true,
    stores: mockStores,
    networkBalances,
    summary: {
      totalProducts: mockProducts.length,
      networkStock: totalStock,
      centralStock,
      storeStock: totalStock - centralStock,
      lowStockCount: 1,
      outOfStockCount: 1,
      expiringSoonCount: 0,
      totalValuation: 85400
    }
  };
}

test.describe('Phase 7B Inventory & Stock Management E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Reset mock state
    mockBalances = [
      {
        _id: 'inv-1',
        productId: 'prod-101',
        locationId: 'store-1',
        storeId: 'store-1',
        quantity: 45,
        reservedQuantity: 5,
        reorderLevel: 10,
        updatedAt: new Date().toISOString()
      },
      {
        _id: 'inv-2',
        productId: 'prod-102',
        locationId: 'store-1',
        storeId: 'store-1',
        quantity: 4,
        reservedQuantity: 0,
        reorderLevel: 10,
        updatedAt: new Date().toISOString()
      },
      {
        _id: 'inv-3',
        productId: 'prod-103',
        locationId: 'store-1',
        storeId: 'store-1',
        quantity: 0,
        reservedQuantity: 0,
        reorderLevel: 5,
        updatedAt: new Date().toISOString()
      },
      {
        _id: 'inv-orphan',
        productId: 'prod-missing-999',
        locationId: 'store-2',
        storeId: 'store-2',
        quantity: 12,
        reservedQuantity: 0,
        reorderLevel: 10,
        updatedAt: new Date().toISOString()
      }
    ];

    // Authenticate
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

    await page.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProducts)
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });

    await page.route('**/api/v1/inventory/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, summary: mockSummary })
      });
    });

    await page.route('**/api/v1/inventory/command-center', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildCommandCenterData())
      });
    });

    await page.route('**/api/v1/inventory/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockLogs,
          pagination: { limit: 50, nextCursor: null }
        })
      });
    });

    await page.route('**/api/v1/inventory', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, inventory: mockBalances })
        });
      }
    });

    await page.route('**/api/v1/inventory/adjust', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockBalances.find((b) => b.productId === body.productId);
        if (match) {
          match.quantity = body.quantity;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Inventory adjusted successfully',
            record: body.quantity
          })
        });
      }
    });

    await page.route('**/api/v1/inventory/transfer', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockBalances.find((b) => b.productId === body.productId);
        if (match) {
          match.quantity = Math.max(0, match.quantity - body.quantity);
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Stock transfer completed successfully',
            referenceId: 'tf-mock-123',
            transfer: {
              success: true,
              referenceId: 'tf-mock-123',
              fromBefore: 45,
              fromAfter: 35,
              toBefore: 0,
              toAfter: 10
            }
          })
        });
      }
    });
  });

  test('1. Complete Inventory Lifecycle: Summary Cards, Search, Filter, Movement Ledger, Stock Adjustment, Transfer, and Isolation', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Start on Dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to Inventory
    await page.getByRole('link', { name: 'Inventory' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Inventory Command Center' })).toBeVisible();
    await expect(page.getByText('Network Stock')).toBeVisible();
    await expect(page.getByText('61')).toBeVisible();

    // 3. Search Product
    const searchInput = page.getByPlaceholder(/search by product name, sku, or barcode/i);
    await searchInput.fill('Paneer');
    await expect(page.getByText('Farm Fresh Paneer 500g')).toBeVisible();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).not.toBeVisible();

    // Clear search
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();

    // 4. Status Filter Pills
    await page.getByRole('button', { name: 'Low Stock' }).click();
    await expect(page.getByText('Farm Fresh Paneer 500g')).toBeVisible();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).not.toBeVisible();

    await page.getByRole('button', { name: 'All Items' }).click();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();

    await page.getByRole('button', { name: 'Orphan Inventory' }).click();
    await expect(page.getByText('Product Master Missing').first()).toBeVisible();
    await expect(page.getByText('ORPHAN INVENTORY').first()).toBeVisible();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).not.toBeVisible();

    await page.getByRole('button', { name: 'All Items' }).click();

    // 5. Open Movement History Ledger Drawer
    await page.getByText('A2 Pure Cow Ghee 1L').click();

    const ledgerDrawer = page.getByRole('dialog');
    await expect(ledgerDrawer).toBeVisible();
    await expect(ledgerDrawer.getByText(/stock by location breakdown/i)).toBeVisible();
    await expect(ledgerDrawer.getByText('PURCHASE', { exact: true })).toBeVisible();
    await expect(ledgerDrawer.getByText('SALE', { exact: true })).toBeVisible();

    // Capture visual baseline of Desktop Inventory with Drawer (1440x900)
    await page.screenshot({ path: 'test-results/desktop-inventory.png', fullPage: true });

    // Close Drawer
    await page.getByLabel('Close drawer').click();
    await expect(ledgerDrawer).not.toBeVisible();

    // 6. Stock Level Adjustment
    const adjustBtn = page.getByRole('button', { name: 'Adjust Stock' }).first();
    await adjustBtn.click();

    const adjustModal = page.getByRole('dialog');
    await expect(adjustModal).toBeVisible();
    await expect(adjustModal.getByText(/stock level adjustment/i)).toBeVisible();

    const qtyInput = adjustModal.getByPlaceholder('0.00');
    await qtyInput.fill('60');

    const notesInput = adjustModal.getByPlaceholder(/physical count reconciliation/i);
    await notesInput.fill('Annual audit count reconciliation');

    await adjustModal.getByRole('button', { name: /confirm adjustment/i }).click();
    await expect(adjustModal).not.toBeVisible();

    // 7. Inter-Store Transfer
    const transferBtn = page.getByRole('button', { name: 'Transfer Stock' }).first();
    await transferBtn.click();

    const transferModal = page.getByRole('dialog');
    await expect(transferModal).toBeVisible();
    await expect(transferModal.getByText(/inter-store stock transfer/i)).toBeVisible();

    const transferQtyInput = transferModal.getByRole('spinbutton');
    await transferQtyInput.fill('10');

    await transferModal.getByRole('button', { name: /confirm transfer/i }).click();
    await expect(transferModal).not.toBeVisible();

    // 8. Cross-Module Isolation: Navigate back to Dashboard and verify integrity
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Mobile Responsive Viewport (430x932) has zero horizontal overflow and stacked KPI summary', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Inventory Command Center' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-inventory.png', fullPage: true });
  });
});
