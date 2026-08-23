import { test, expect } from '@playwright/test';

const mockProducts = [
  {
    id: 'prd-101',
    name: 'A2 Gir Cow Cultured Ghee 500ml',
    sku: 'GHEE-A2-500',
    barcode: '8901234567890',
    category: 'Dairy',
    brand: 'VC Organic',
    supplier: 'Gir Sanctuary Farms',
    purchasePrice: 420,
    sellingPrice: 650,
    gst: 12,
    unit: 'bottle',
    sellingMode: 'packaged',
    type: 'OWN',
    status: 'active',
    reorderLevel: 10,
    maxStock: 150,
    description: 'Pure bilona method cultured ghee from grass-fed Gir cows.',
    barcodes: [
      {
        barcode: '8901234567891',
        type: 'ALTERNATE',
        variantName: 'Twin Jar Bundle'
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'prd-102',
    name: 'Organic Desi Khand Sugar',
    sku: 'SUGAR-KHAND-1K',
    barcode: null, // No barcode assigned initially
    category: 'Pantry',
    brand: 'VC Organic',
    supplier: 'Organic Mills',
    purchasePrice: 60,
    sellingPrice: 95,
    gst: 5,
    unit: 'kg',
    sellingMode: 'loose',
    type: 'OWN',
    status: 'active',
    reorderLevel: 25,
    maxStock: 500,
    description: 'Traditional unrefined organic khand.',
    barcodes: [],
    createdAt: new Date().toISOString()
  }
];

const mockBatches = [
  {
    id: 'bat-201',
    productId: 'prd-101',
    lotNumber: 'LOT-2026-08',
    manufactureDate: '2026-08-01',
    expiryDate: '2027-08-31',
    receivedQuantity: 100,
    remainingQuantity: 84,
    status: 'active'
  }
];

test.describe('Product Barcode Hardening & Label Printing (Phase 30.1)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated session
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
          status: 'active',
          permissions: [
            'dashboard.view',
            'products.view',
            'products.create',
            'products.update',
            'products.archive',
            'products.delete',
            'products.import',
            'products.import.preview',
            'products.import.commit'
          ]
        })
      );
    });

    // Mock auth verify
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-1',
            name: 'Super Admin',
            username: 'admin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    // Mock public settings
    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: "VC ORGANIC'S",
          logo: '/uploads/logos/vc-logo.webp'
        })
      });
    });

    // Mock products endpoints
    await page.route(/\/api\/v1\/products/, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const path = url.pathname;

      if (method === 'GET') {
        if (path === '/api/v1/products' || path === '/api/v1/products/') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockProducts)
          });
        } else if (path.includes('/prd-101/batches')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, batches: mockBatches })
          });
        } else if (path.includes('/prd-102/batches')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, batches: [] })
          });
        } else if (path.includes('/generate-barcode')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, barcode: 'AIA000043' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockProducts[0])
          });
        }
      } else if (method === 'POST') {
        if (path.includes('/barcodes')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, barcode: 'AIA000043' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, product: mockProducts[0] })
          });
        }
      }
    });

    await page.goto('/products');
  });

  test('1. Opens Print Barcode Dialog with verified product details and live Code128 preview', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    // Verify dialog opens
    const dialogTitle = page.getByText('Print Product Barcode & Batch Labels');
    await expect(dialogTitle).toBeVisible();

    // Verify product summary
    await expect(page.getByText('A2 Gir Cow Cultured Ghee 500ml').first()).toBeVisible();
    await expect(page.getByText('SKU: GHEE-A2-500').first()).toBeVisible();
    await expect(page.getByText('Barcode: 8901234567890')).toBeVisible();

    // Verify live SVG Code128 barcode is rendered in preview
    const barcodeSvgText = page.locator('text=8901234567890');
    await expect(barcodeSvgText.first()).toBeVisible();
  });

  test('2. Displays batch lot and expiry strictly from selected inventory batch', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    // Verify batch option is selected and shows in live preview
    await expect(page.getByText('Lot: LOT-2026-08 • EXP: 2027-08-31')).toBeVisible();
  });

  test('3. Does NOT silently treat SKU as barcode when product has no barcode assigned', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for Organic Desi Khand Sugar"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    // Verify warning status: "No barcode assigned"
    await expect(page.getByText('No barcode assigned').first()).toBeVisible();
    await expect(page.getByText('Product requires an assigned barcode to print')).toBeVisible();

    // Verify explicit "Generate AIA Code" button is provided
    const generateBtn = page.getByRole('button', { name: 'Generate AIA Code' });
    await expect(generateBtn).toBeVisible();
  });

  test('4. Print Barcode action available inside Product Detail Drawer', async ({ page }) => {
    const inspectBtn = page.locator('button[aria-label="Inspect A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(inspectBtn).toBeVisible({ timeout: 10000 });
    await inspectBtn.click();

    // Inside drawer, click Print Labels button
    const drawerPrintBtn = page.getByRole('button', { name: 'Print Labels' });
    await expect(drawerPrintBtn).toBeVisible();
    await drawerPrintBtn.click();

    // Verify dialog opened
    await expect(page.getByText('Print Product Barcode & Batch Labels')).toBeVisible();
  });

  test('5. Responsive layout on mobile viewport (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/products');

    const printBtn = page.locator('button[aria-label="Print barcode for A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    await expect(page.getByText('Print Product Barcode & Batch Labels')).toBeVisible();

    // Verify horizontal scrollbar does not overflow page
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
