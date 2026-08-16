import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 10000,
    netProfit: 2500,
    totalPurchases: 5000,
    franchiseEarnings: 0,
    stockAssetValuationCost: 20000,
    stockAssetValuationRetail: 35000,
    totalProducts: 20,
    ownProducts: 15,
    externalProducts: 5,
    lowStockCount: 1,
    outOfStockCount: 0,
    categoriesCount: 3,
    brandsCount: 2,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 30,
    purchaseCount: 5
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'all'
};

const mockSuppliers = [
  { id: 'sup-1', name: 'Baramati Milk Cooperative', contact: '9822012345' },
  { id: 'sup-2', name: 'Amul Dairy Federation', contact: '9822099999' }
];

const mockStores = [
  { id: 'store-1', name: 'VC Flagship Outlet' },
  { id: 'store-2', name: 'Bandra West Store' }
];

let createdPurchases: any[] = [];

test.describe('Phase 5 Purchase Entry, Transport & Procurement Ledger E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    createdPurchases = [
      {
        id: 'pur-1001',
        purchaseId: 'PO-2026-001001',
        supplierName: 'Baramati Milk Cooperative',
        invoiceNumber: 'BILL-44819',
        purchaseDate: '2026-08-16',
        locationId: 'store-1',
        paymentStatus: 'PAID',
        items: [
          {
            name: 'Pure Desi Ghee 1L',
            sku: 'AIA-GHEE-1L',
            quantity: 20,
            unit: 'tin',
            cost: 580,
            discountPercent: 0,
            gstRate: 5,
            taxableValue: 11600,
            taxAmount: 580,
            lineTotal: 12180
          }
        ],
        transport: {
          enabled: true,
          transporter: 'VRL Logistics',
          mode: 'ROAD',
          docketNumber: 'VRL-99881',
          charge: 500,
          taxRate: 5,
          taxAmount: 25
        },
        subtotal: 11600,
        taxAmount: 605,
        shipping: 500,
        otherCharges: 0,
        grandTotal: 12705,
        status: 'RECEIVED',
        createdAt: new Date().toISOString()
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

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/suppliers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSuppliers)
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });

    await page.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock purchases list
    await page.route('**/api/v1/purchases*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            purchases: createdPurchases,
            pagination: {
              page: 1,
              limit: 50,
              total: createdPurchases.length,
              totalPages: 1,
              hasNext: false,
              hasPrev: false
            }
          })
        });
      } else if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        const newPur = {
          ...payload,
          id: `pur-${Date.now()}`,
          purchaseId: `PO-2026-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        createdPurchases.unshift(newPur);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, purchase: newPur })
        });
      }
    });

    // Mock void purchase
    await page.route('**/api/v1/purchases/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        const url = route.request().url();
        const id = url.substring(url.lastIndexOf('/') + 1);
        createdPurchases = createdPurchases.map((p) =>
          p.id === id || p.purchaseId === id ? { ...p, status: 'VOIDED', isArchived: true } : p
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Purchase voided' })
        });
      } else if (route.request().method() === 'GET') {
        const url = route.request().url();
        const id = url.substring(url.lastIndexOf('/') + 1);
        const p = createdPurchases.find((item) => item.id === id || item.purchaseId === id);
        if (p) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(p) });
        } else {
          await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        }
      }
    });
  });

  test('Complete Procurement Lifecycle: login -> dashboard -> create purchase with transport -> history -> detail drawer -> void -> verify dashboard', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Dashboard loads
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to Purchase Entry
    await page.getByRole('link', { name: 'Purchases' }).click();
    await expect(
      page.getByRole('heading', { name: /procurement & inward purchase entry/i })
    ).toBeVisible();

    // 3. Fill Inward Header
    await page.fill('input[placeholder*="Baramati Dairy"]', 'Amul Dairy Federation');
    await page.fill('input[placeholder*="BILL-98214"]', 'INV-AMUL-9901');

    // 4. Fill Line Item
    await page.fill('input[placeholder*="Pure Cow Ghee 1L"]', 'Pasteurized Table Butter 500g');
    await page.fill('input[placeholder*="SKU code"]', 'AMUL-BUTTER-500');

    // Select Quantity 10 and Rate 250
    const qtyInput = page.locator('input[type="number"]').nth(0);
    await qtyInput.fill('10');

    const rateInput = page.locator('input[type="number"]').nth(1);
    await rateInput.fill('250');

    // 5. Toggle Transport Charges
    await page.getByText('Enable Transport').click();

    // Fill Transporter & Freight
    await page.fill('input[placeholder*="VRL Logistics"]', 'Navata Road Transport');
    const freightInput = page.locator('input[type="number"]').nth(3); // Freight charge input
    await freightInput.fill('300');

    // 6. Submit Purchase Entry
    const saveBtn = page.getByRole('button', { name: /record inward purchase batch/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // 7. Verify Auto-redirect to History tab and see newly recorded purchase
    await expect(page.getByText('Amul Dairy Federation').first()).toBeVisible();
    await expect(page.getByText('INV-AMUL-9901')).toBeVisible();

    // Capture visual screenshot baseline
    await page.screenshot({ path: 'test-results/desktop-purchases.png', fullPage: true });

    // 8. Open Detail Drawer
    const viewBtn = page.locator('button[aria-label^="View details for"]').first();
    await viewBtn.click();

    await expect(page.getByText('Pasteurized Table Butter 500g')).toBeVisible();
    await expect(page.getByText('Navata Road Transport')).toBeVisible();

    // Close Drawer
    await page.getByLabel('Close drawer').click();

    // 9. Void Purchase
    const voidBtn = page.locator('button[aria-label^="Void purchase"]').first();
    await voidBtn.click();

    const voidDialog = page.getByRole('dialog');
    await expect(voidDialog).toBeVisible();
    await expect(page.getByText(/stock ledger reversal warning/i)).toBeVisible();

    const confirmVoidBtn = page.getByRole('button', { name: /confirm & void inward stock/i });
    await confirmVoidBtn.click();

    // Verify status updated to VOIDED in the table
    await expect(page.locator('tbody tr').first().getByText('VOIDED')).toBeVisible();

    // 10. Return to Dashboard and verify Dashboard is isolated and intact
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('Mobile Responsive Viewport (430x932) has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/purchases');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /procurement & inward purchase entry/i })
    ).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await page.screenshot({ path: 'test-results/mobile-purchases.png', fullPage: true });
  });
});
