import { test, expect } from '@playwright/test';

const mockInvoices = [
  {
    _id: 'inv-1',
    id: 'INV-1001',
    invoiceNumber: 'INV-1001',
    customerId: 'cust-1',
    customerName: 'Reliance Retail Ltd',
    customerGst: '27AAAAA0000A1Z5',
    storeId: 'store-1',
    subtotal: 5000,
    tax: 250,
    discount: 0,
    grandTotal: 5250,
    paymentMode: 'UPI',
    status: 'PAID',
    createdAt: new Date().toISOString(),
    items: [
      {
        productId: 'prod-1',
        name: 'Organic Ghee',
        quantity: 10,
        price: 500,
        sellingPrice: 500,
        gst: 5,
        tax: 250,
        lineTotal: 5000
      }
    ]
  },
  {
    _id: 'inv-2',
    id: 'INV-1002',
    invoiceNumber: 'INV-1002',
    customerId: 'cust-2',
    customerName: 'Rahul Sharma',
    storeId: 'store-1',
    subtotal: 2000,
    tax: 360,
    discount: 0,
    grandTotal: 2360,
    paymentMode: 'CASH',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    items: [
      {
        productId: 'prod-2',
        name: 'Packaged Confectionery',
        quantity: 10,
        price: 200,
        sellingPrice: 200,
        gst: 18,
        tax: 360,
        lineTotal: 2000
      }
    ]
  }
];

const mockPurchases = [
  {
    _id: 'pur-1',
    id: 'PUR-5001',
    purchaseId: 'PUR-5001',
    supplierId: 'sup-1',
    supplierName: 'Dairy Wholesale Corp',
    locationId: 'store-1',
    storeId: 'store-1',
    purchaseDate: '2026-08-16',
    paymentStatus: 'PAID',
    subtotal: 10000,
    taxAmount: 500,
    shipping: 300,
    grandTotal: 10800,
    status: 'RECEIVED',
    createdAt: new Date().toISOString(),
    items: []
  }
];

const mockCustomers = [
  {
    id: 'cust-1',
    name: 'Reliance Retail Ltd',
    phone: '9876543210',
    gstin: '27AAAAA0000A1Z5',
    totalPurchases: 50000,
    outstandingBalance: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Rahul Sharma',
    phone: '9876543211',
    gstin: '',
    totalPurchases: 2000,
    outstandingBalance: 0,
    status: 'active',
    createdAt: new Date().toISOString()
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

test.describe('Phase 15B Tax & GST Reporting Ledger E2E Suite', () => {
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

    await page.route('**/api/v1/invoices*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: mockInvoices,
          total: mockInvoices.length,
          page: 1,
          totalPages: 1
        })
      });
    });

    await page.route('**/api/v1/purchases*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          purchases: mockPurchases,
          pagination: {
            page: 1,
            limit: 50,
            total: mockPurchases.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        })
      });
    });

    await page.route('**/api/v1/franchise-supply-orders*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/v1/customers*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCustomers)
      });
    });
  });

  test('1. Complete Tax & GST Lifecycle: Summary, Slabs, B2B/B2C, Inward ITC & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Tax & GST
    await page.goto('/tax');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'GST Compliance & Tax Reporting Ledger' })
    ).toBeVisible();

    await expect(page.getByText('100% Tax Ledger Reconciled')).toBeVisible();

    // 2. Verify Overview Tab Content
    await expect(page.getByText('Total Outward GST')).toBeVisible();
    await expect(page.getByText('Inward GST Paid (ITC)')).toBeVisible();
    await expect(page.getByText('B2B Registered Sales')).toBeVisible();
    await expect(page.getByText('Central GST (CGST)')).toBeVisible();

    // 3. Switch to GST Slabs Tab
    await page.getByRole('button', { name: /gst slabs/i }).click();
    await expect(page.getByText('Essential Foods')).toBeVisible();
    await expect(page.getByText('5% Rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Enterprise Standard')).toBeVisible();
    await expect(page.getByText('18% Rate', { exact: true })).toBeVisible();

    // 4. Switch to B2B vs B2C Tab
    await page.getByRole('button', { name: /b2b vs b2c/i }).click();
    await expect(page.getByText('Reliance Retail Ltd')).toBeVisible();
    await expect(page.getByText('27AAAAA0000A1Z5')).toBeVisible();
    await expect(page.getByText('Rahul Sharma')).toBeVisible();

    // 5. Switch to Inward GST Tab
    await page.getByRole('button', { name: /inward gst/i }).click();
    await expect(page.getByText('Dairy Wholesale Corp')).toBeVisible();
    await expect(page.getByText('PUR-5001')).toBeVisible();

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
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/tax');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'GST Compliance & Tax Reporting Ledger' })
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
