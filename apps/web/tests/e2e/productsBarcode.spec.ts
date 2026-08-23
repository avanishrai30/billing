import { test, expect } from '@playwright/test';

const mockProducts = [
  {
    id: 'prd-101',
    name: 'A2 Gir Cow Cultured Ghee 500ml',
    sku: 'GHEE-A2-500',
    barcode: '8901234567890',
    barcodeSource: 'EXTERNAL',
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
        source: 'EXTERNAL',
        variantName: 'Twin Jar Bundle'
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'prd-102',
    name: 'Third Party Organic Desi Khand',
    sku: 'TP-SUGAR-KHAND',
    barcode: null, // Third party product without barcode initially
    barcodeSource: null,
    category: 'Pantry',
    brand: 'Pure Sugars Ltd',
    supplier: 'Organic Mills',
    purchasePrice: 60,
    sellingPrice: 95,
    gst: 5,
    unit: 'kg',
    sellingMode: 'loose',
    type: 'EXTERNAL',
    status: 'active',
    reorderLevel: 25,
    maxStock: 500,
    description: 'Traditional unrefined third party organic khand.',
    barcodes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'prd-103',
    name: 'Artisan Himalayan Rock Salt 1kg',
    sku: 'SALT-HIM-1K',
    barcode: 'AIA000042',
    barcodeSource: 'AIAVRO',
    category: 'Pantry',
    brand: 'VC Organic',
    supplier: 'Himalayan Miners Guild',
    purchasePrice: 35,
    sellingPrice: 70,
    gst: 0,
    unit: 'pack',
    sellingMode: 'packaged',
    type: 'OWN',
    status: 'active',
    reorderLevel: 20,
    maxStock: 300,
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

test.describe('Product Multi-Source Barcodes & Label Printing (Phase 30.2)', () => {
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

  test('1. Opens Print Barcode Dialog with external manufacturer barcode and source badge', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    // Verify dialog opens
    const dialogTitle = page.getByText('Print Product Barcode & Batch Labels');
    await expect(dialogTitle).toBeVisible();

    // Verify product summary with Manufacturer badge
    await expect(page.getByText('A2 Gir Cow Cultured Ghee 500ml').first()).toBeVisible();
    await expect(page.getByText('SKU: GHEE-A2-500').first()).toBeVisible();
    await expect(page.getByText('Barcode: 8901234567890')).toBeVisible();
    await expect(page.getByText('🏢 Manufacturer').first()).toBeVisible();

    // Verify live SVG Code128 barcode is rendered in preview
    const barcodeSvgText = page.locator('text=8901234567890');
    await expect(barcodeSvgText.first()).toBeVisible();
  });

  test('2. Displays AIAVRO generated barcode source badge for own product', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for Artisan Himalayan Rock Salt 1kg"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    await expect(page.getByText('Barcode: AIA000042')).toBeVisible();
    await expect(page.getByText('⚡ AIAVRO').first()).toBeVisible();
  });

  test('3. Third-party product without barcode does NOT silently use SKU and offers AIA generation', async ({ page }) => {
    const printBtn = page.locator('button[aria-label="Print barcode for Third Party Organic Desi Khand"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    await printBtn.click();

    // Verify warning status: "No barcode assigned"
    await expect(page.getByText('No barcode assigned').first()).toBeVisible();
    await expect(page.getByText('Product requires an assigned barcode to print')).toBeVisible();

    // Verify explicit "Generate AIA Code" button is provided
    const generateBtn = page.getByRole('button', { name: 'Generate AIA Code' });
    await expect(generateBtn).toBeVisible();
  });

  test('4. Product Detail Drawer displays primary barcode and source badge', async ({ page }) => {
    const inspectBtn = page.locator('button[aria-label="Inspect A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(inspectBtn).toBeVisible({ timeout: 10000 });
    await inspectBtn.click();

    // Inside drawer, check barcode and source badge
    await expect(page.getByRole('dialog').getByText('8901234567890')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('🏢 Manufacturer')).toBeVisible();
  });

  test('5. Product Modal warns on changing an existing barcode (Barcode Change Protection)', async ({ page }) => {
    const editBtn = page.locator('button[aria-label="Edit A2 Gir Cow Cultured Ghee 500ml"]');
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Change barcode to another number
    const barcodeInput = page.locator('input[placeholder="Scan or enter primary GTIN/EAN/UPC code..."]');
    await barcodeInput.fill('8909999888877');

    // Click Save
    const saveBtn = page.getByRole('button', { name: 'Save Product Changes' });
    await saveBtn.click();

    // Verify Barcode Change Protection Warning Alert appears
    await expect(page.getByText('Confirm Barcode Replacement')).toBeVisible();
    await expect(page.getByText('You are replacing the existing registered barcode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm & Replace Barcode' })).toBeVisible();
  });
});
