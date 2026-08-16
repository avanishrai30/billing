import { test, expect } from '@playwright/test';

let mockFranchises = [
  {
    id: 'fran-1',
    name: 'VC Organics Thane West',
    location: 'Thane, Maharashtra',
    owner: 'Vikram Shinde',
    phone: '9876543210',
    email: 'thane@vcorganic.com',
    gstin: '27AAAAA0000A1Z5',
    status: 'active',
    supplyList: [
      {
        productId: 'prod-1',
        name: 'A2 Pure Ghee 1L',
        supplyPrice: 500,
        retailPrice: 750,
        isCustom: false
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'fran-2',
    name: 'VC Organics Kalyan East',
    location: 'Kalyan, Maharashtra',
    owner: 'Ramesh Patil',
    phone: '9123456780',
    email: 'kalyan@vcorganic.com',
    gstin: '27BBBBB1111B1Z2',
    status: 'active',
    supplyList: [
      {
        productId: 'prod-2',
        name: 'Raw Forest Honey 500g',
        supplyPrice: 250,
        retailPrice: 400,
        isCustom: false
      }
    ],
    createdAt: new Date().toISOString()
  }
];

let mockSupplyOrders = [
  {
    id: 'fso-1',
    franchiseId: 'fran-1',
    date: '2026-08-15',
    items: [
      {
        productId: 'prod-1',
        name: 'A2 Pure Ghee 1L',
        qty: 20,
        supplyPrice: 500,
        gst: 5,
        isCustom: false
      }
    ],
    subtotal: 10000,
    tax: 500,
    grandTotal: 10500,
    paymentStatus: 'paid',
    notes: 'Initial opening stock batch',
    createdAt: new Date().toISOString()
  }
];

const mockProducts = [
  {
    id: 'prod-1',
    name: 'A2 Pure Ghee 1L',
    sku: 'GHEE-1L',
    category: 'Dairy',
    cost: 400,
    price: 750,
    purchasePrice: 500,
    sellingPrice: 750,
    gst: 5,
    stock: 100
  },
  {
    id: 'prod-2',
    name: 'Raw Forest Honey 500g',
    sku: 'HONEY-500',
    category: 'Staples',
    cost: 200,
    price: 400,
    purchasePrice: 250,
    sellingPrice: 400,
    gst: 12,
    stock: 80
  }
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

test.describe('Phase 12B Franchise CRM & Supply Chain E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    mockFranchises = [
      {
        id: 'fran-1',
        name: 'VC Organics Thane West',
        location: 'Thane, Maharashtra',
        owner: 'Vikram Shinde',
        phone: '9876543210',
        email: 'thane@vcorganic.com',
        gstin: '27AAAAA0000A1Z5',
        status: 'active',
        supplyList: [
          {
            productId: 'prod-1',
            name: 'A2 Pure Ghee 1L',
            supplyPrice: 500,
            retailPrice: 750,
            isCustom: false
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'fran-2',
        name: 'VC Organics Kalyan East',
        location: 'Kalyan, Maharashtra',
        owner: 'Ramesh Patil',
        phone: '9123456780',
        email: 'kalyan@vcorganic.com',
        gstin: '27BBBBB1111B1Z2',
        status: 'active',
        supplyList: [
          {
            productId: 'prod-2',
            name: 'Raw Forest Honey 500g',
            supplyPrice: 250,
            retailPrice: 400,
            isCustom: false
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];

    mockSupplyOrders = [
      {
        id: 'fso-1',
        franchiseId: 'fran-1',
        date: '2026-08-15',
        items: [
          {
            productId: 'prod-1',
            name: 'A2 Pure Ghee 1L',
            qty: 20,
            supplyPrice: 500,
            gst: 5,
            isCustom: false
          }
        ],
        subtotal: 10000,
        tax: 500,
        grandTotal: 10500,
        paymentStatus: 'paid',
        notes: 'Initial opening stock batch',
        createdAt: new Date().toISOString()
      }
    ];

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
        body: JSON.stringify([
          { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active' }
        ])
      });
    });

    // Franchises API Handlers
    await page.route('**/api/v1/franchises/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      if (route.request().method() === 'DELETE') {
        mockFranchises = mockFranchises.filter((f) => f.id !== id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Franchise deleted successfully' })
        });
      }

      if (route.request().method() === 'GET') {
        const match = mockFranchises.find((f) => f.id === id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match || { id, name: 'Franchise Partner' })
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/franchises', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockFranchises)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const id = body.id || `fran-${Date.now()}`;
        const newFran = {
          ...body,
          id,
          status: body.status || 'active',
          createdAt: body.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const existingIdx = mockFranchises.findIndex((f) => f.id === id);
        if (existingIdx !== -1) {
          mockFranchises[existingIdx] = newFran;
        } else {
          mockFranchises.push(newFran);
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, franchise: newFran })
        });
      }

      route.continue();
    });

    // Supply Orders API Handlers
    await page.route('**/api/v1/franchise-supply-orders', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSupplyOrders)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newOrder = {
          ...body,
          id: `fso-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        mockSupplyOrders.push(newOrder);

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, order: newOrder })
        });
      }

      route.continue();
    });
  });

  test('1. Complete Franchise CRM & Supply Order Lifecycle: Directory, Profile, Supply Dispatch, Ledger & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Franchises
    await page.goto('/franchises');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Franchise CRM & Supply Chain' })).toBeVisible();
    await expect(page.getByText('VC Organics Thane West')).toBeVisible();
    await expect(page.getByText('VC Organics Kalyan East')).toBeVisible();

    // Verify KPI Cards
    await expect(page.locator('span').filter({ hasText: 'Active Partners' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Supply Dispatches' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Earnings Realized' })).toBeVisible();

    // Capture visual baseline of Desktop Franchises (1440x900)
    await page.screenshot({ path: 'test-results/desktop-franchises.png', fullPage: true });

    // 2. Open Detail Drawer for Thane West
    await page.getByLabel('View franchise details for VC Organics Thane West').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Franchise Partner Profile')).toBeVisible();
    await expect(drawer.getByText('Vikram Shinde')).toBeVisible();
    await expect(drawer.getByText('27AAAAA0000A1Z5')).toBeVisible();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).not.toBeVisible();

    // 3. Register New Franchise Partner
    await page.getByRole('button', { name: /add franchise/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/register new franchise partner/i)).toBeVisible();

    await modal.getByPlaceholder(/vc organics - thane west/i).fill('VC Organics Navi Mumbai');
    await modal.getByPlaceholder(/thane, maharashtra/i).fill('Vashi, Navi Mumbai');
    await modal.getByPlaceholder(/vikram shinde/i).fill('Sanjay Deshmukh');
    await modal.getByPlaceholder(/9876543210/i).fill('9988776655');
    await modal.getByPlaceholder(/franchise@example.com/i).fill('vashi@vcorganic.com');
    await modal.getByPlaceholder(/27aaaaa0000a1z5/i).fill('27CCCCC1234C1Z9');

    await modal.getByRole('button', { name: /register franchise/i }).click();
    await expect(modal).not.toBeVisible();

    await expect(page.getByText('VC Organics Navi Mumbai')).toBeVisible();

    // 4. Record Supply Dispatch Order
    await page.getByRole('button', { name: /record supply order/i }).click();
    const supplyModal = page.getByRole('dialog');
    await expect(supplyModal).toBeVisible();
    await expect(supplyModal.getByText(/record supply dispatch order/i)).toBeVisible();

    await supplyModal.getByRole('button', { name: /submit supply order/i }).click();
    await expect(supplyModal).not.toBeVisible();

    // 5. Switch to Supply Orders Tab
    await page.getByRole('tab', { name: /supply orders/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('PAID', { exact: true }).first()).toBeVisible();

    // 6. Return to Dashboard and confirm stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Mobile Responsive Viewport (430x932 & 390x844) has zero horizontal overflow', async ({
    page
  }) => {
    // Test 430x932
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/franchises');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Franchise CRM & Supply Chain' })).toBeVisible();

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-franchises.png', fullPage: true });

    // Test 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
