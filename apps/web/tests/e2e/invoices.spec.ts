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

const mockStores = [
  { id: 'store-1', name: 'VC Flagship Outlet' },
  { id: 'store-2', name: 'Bandra West Store' }
];

let mockInvoices = [
  {
    _id: 'inv-1',
    id: 'INV-2026-001',
    invoiceNumber: 'INV-2026-001',
    transactionId: 'TXN-001',
    locationId: 'store-1',
    customerName: 'Avanish Rai',
    customerPhone: '+919876543210',
    customerGst: '27AAAAA0000A1Z5',
    customerAddress: 'Mumbai, Maharashtra',
    items: [
      {
        productId: 'prod-101',
        name: 'A2 Pure Cow Ghee 1L',
        sku: 'AIA-GHEE-1L',
        unit: 'tin',
        quantity: 2,
        price: 650,
        tax: 65,
        lineTotal: 1300
      }
    ],
    subtotal: 1300,
    discount: 0,
    tax: 65,
    grandTotal: 1365,
    paymentMode: 'UPI',
    status: 'PAID',
    cashierName: 'Admin Cashier',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'inv-2',
    id: 'INV-2026-002',
    invoiceNumber: 'INV-2026-002',
    transactionId: 'TXN-002',
    locationId: 'store-1',
    customerName: 'Rohan Sharma',
    customerPhone: '+919876543211',
    items: [
      {
        productId: 'prod-102',
        name: 'Farm Fresh Paneer 500g',
        sku: 'AIA-PAN-500',
        unit: 'pack',
        quantity: 1,
        price: 220,
        tax: 11,
        lineTotal: 220
      }
    ],
    subtotal: 220,
    discount: 20,
    tax: 11,
    grandTotal: 211,
    paymentMode: 'CASH',
    status: 'PAID',
    cashierName: 'Admin Cashier',
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 8 Invoices & Sales Ledger E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Reset mock invoices state
    mockInvoices = [
      {
        _id: 'inv-1',
        id: 'INV-2026-001',
        invoiceNumber: 'INV-2026-001',
        transactionId: 'TXN-001',
        locationId: 'store-1',
        customerName: 'Avanish Rai',
        customerPhone: '+919876543210',
        customerGst: '27AAAAA0000A1Z5',
        customerAddress: 'Mumbai, Maharashtra',
        items: [
          {
            productId: 'prod-101',
            name: 'A2 Pure Cow Ghee 1L',
            sku: 'AIA-GHEE-1L',
            unit: 'tin',
            quantity: 2,
            price: 650,
            tax: 65,
            lineTotal: 1300
          }
        ],
        subtotal: 1300,
        discount: 0,
        tax: 65,
        grandTotal: 1365,
        paymentMode: 'UPI',
        status: 'PAID',
        cashierName: 'Admin Cashier',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'inv-2',
        id: 'INV-2026-002',
        invoiceNumber: 'INV-2026-002',
        transactionId: 'TXN-002',
        locationId: 'store-1',
        customerName: 'Rohan Sharma',
        customerPhone: '+919876543211',
        items: [
          {
            productId: 'prod-102',
            name: 'Farm Fresh Paneer 500g',
            sku: 'AIA-PAN-500',
            unit: 'pack',
            quantity: 1,
            price: 220,
            tax: 11,
            lineTotal: 220
          }
        ],
        subtotal: 220,
        discount: 20,
        tax: 11,
        grandTotal: 211,
        paymentMode: 'CASH',
        status: 'PAID',
        cashierName: 'Admin Cashier',
        createdAt: new Date().toISOString()
      }
    ];

    // Authenticate user
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

    await page.route('**/api/v1/invoices/*/void', async (route) => {
      if (route.request().method() === 'POST') {
        const url = new URL(route.request().url());
        const parts = url.pathname.split('/');
        const id = parts[parts.length - 2];
        const match = mockInvoices.find((i) => i.id === id || i.invoiceNumber === id);
        if (match) {
          match.status = 'VOIDED';
          (match as any).isArchived = true;
          (match as any).voidedAt = new Date().toISOString();
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Invoice voided and inventory stock reverted successfully'
          })
        });
      }
      route.continue();
    });

    await page.route('**/api/v1/invoices/*/pdf', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 mock pdf binary')
      });
    });

    await page.route('**/api/v1/invoices*', async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const statusParam = url.searchParams.get('status');
        const searchParam = url.searchParams.get('search');

        let filtered = [...mockInvoices];
        if (statusParam && statusParam !== 'ALL') {
          filtered = filtered.filter((i) => i.status === statusParam);
        }
        if (searchParam) {
          const q = searchParam.toLowerCase();
          filtered = filtered.filter(
            (i) =>
              (i.invoiceNumber || '').toLowerCase().includes(q) ||
              (i.customerName || '').toLowerCase().includes(q) ||
              (i.customerPhone || '').toLowerCase().includes(q)
          );
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invoices: filtered,
            pagination: {
              page: 1,
              limit: 50,
              total: filtered.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        });
      }

      route.continue();
    });
  });

  test('1. Complete Invoices Lifecycle: Summary, Search, Filter, Detail Drawer, Void Reversal & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Start on Dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to Invoices
    await page.getByRole('link', { name: 'Invoices' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Invoices & Sales Ledger' })).toBeVisible();
    await expect(page.getByText('Total Completed Invoices')).toBeVisible();
    await expect(page.getByText('Gross Sales Revenue')).toBeVisible();

    // 3. Search Invoice by Customer Name
    const searchInput = page.getByPlaceholder(/search by invoice #, customer name, phone/i);
    await searchInput.fill('Avanish');
    await expect(page.getByText('Avanish Rai')).toBeVisible();
    await expect(page.getByText('Rohan Sharma')).not.toBeVisible();

    // Clear Search
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('Rohan Sharma')).toBeVisible();

    // 4. Status Filter Tabs
    await page.getByRole('button', { name: 'Voided' }).click();
    // No voided invoices initially
    await expect(page.getByText('No Matching Invoices Found')).toBeVisible();

    await page.getByRole('button', { name: 'All Invoices' }).click();
    await expect(page.getByText('Avanish Rai')).toBeVisible();

    // 5. Open Invoice Detail Drawer
    const viewBtn = page.getByRole('button', {
      name: /view details for invoice inv-2026-001/i
    });
    await viewBtn.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/tax invoice #inv-2026-001/i)).toBeVisible();
    await expect(drawer.getByText('Avanish Rai')).toBeVisible();
    await expect(drawer.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();
    await expect(drawer.getByText('GSTIN: 27AAAAA0000A1Z5')).toBeVisible();

    // Capture visual baseline of Desktop Invoices with Drawer (1440x900)
    await page.screenshot({ path: 'test-results/desktop-invoices.png', fullPage: true });

    // Close Drawer
    await page.getByLabel('Close drawer').click();
    await expect(drawer).not.toBeVisible();

    // 6. Void Invoice
    const voidBtn = page.getByRole('button', {
      name: /void invoice inv-2026-001/i
    });
    await voidBtn.click();

    const voidDialog = page.getByRole('dialog');
    await expect(voidDialog).toBeVisible();
    await expect(voidDialog.getByText(/void invoice #inv-2026-001/i)).toBeVisible();
    await expect(
      voidDialog.getByText(/automatic inventory reversal warning/i)
    ).toBeVisible();

    const reasonInput = voidDialog.getByPlaceholder(/customer return \/ billing correction/i);
    await reasonInput.fill('Customer returned product in good condition');

    await voidDialog.getByRole('button', { name: /confirm & void invoice/i }).click();
    await expect(voidDialog).not.toBeVisible();

    // 7. Verify Cross-Module Isolation: Navigate back to Dashboard and verify integrity
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
    await page.goto('/invoices');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Invoices & Sales Ledger' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-invoices.png', fullPage: true });
  });
});
