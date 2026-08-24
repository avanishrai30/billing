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
    name: 'Wild Forest Raw Honey 500g',
    sku: 'HONEY-WF-500',
    barcode: '8901234567892',
    category: 'Pantry',
    brand: 'VC Organic',
    supplier: 'Western Ghats Guild',
    purchasePrice: 240,
    sellingPrice: 380,
    gst: 5,
    unit: 'bottle',
    sellingMode: 'packaged',
    type: 'OWN',
    status: 'active',
    reorderLevel: 15,
    maxStock: 200,
    description: 'Unprocessed raw forest honey with natural pollen and enzymes.',
    barcodes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: 'prd-103',
    name: 'Organic Desi Tomatoes (Loose)',
    sku: 'TOM-DESI-KG',
    barcode: null,
    category: 'Vegetables',
    brand: 'VC Fresh Farm',
    supplier: 'Nashik Organic Cluster',
    purchasePrice: 25,
    sellingPrice: 45,
    gst: 0,
    unit: 'kg',
    sellingMode: 'loose',
    type: 'OWN',
    status: 'active',
    reorderLevel: 50,
    maxStock: 500,
    description: 'Fresh naturally ripened farm tomatoes.',
    barcodes: [],
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 20 Product Master Catalog Migration E2E Suite', () => {
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
  });

  test('1. Complete Product Master Lifecycle: Browse, Search, Filter, Inspect, Create, Edit, Archive & Import', async ({
    page
  }) => {
    let currentProducts = [...mockProducts];

    // Mock products endpoints
    await page.route(/\/api\/v1\/products/, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === 'GET') {
        const path = url.pathname;
        if (path === '/api/v1/products' || path === '/api/v1/products/') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(currentProducts)
          });
        } else if (path.includes('/by-sku/')) {
          const sku = path.split('/by-sku/')[1];
          const prod = currentProducts.find((p) => p.sku === sku);
          if (prod) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prod) });
          } else {
            await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
          }
        } else if (path.includes('/by-barcode/')) {
          const code = path.split('/by-barcode/')[1];
          const prod = currentProducts.find((p) => p.barcode === code);
          if (prod) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prod) });
          } else {
            await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
          }
        } else {
          const id = path.split('/api/v1/products/')[1];
          const prod = currentProducts.find((p) => p.id === id);
          if (prod) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prod) });
          } else {
            await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
          }
        }
      } else if (method === 'POST') {
        const path = url.pathname;
        if (path === '/api/v1/products/import/preview') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              importId: 'imp-mock-1',
              totalRows: 1,
              validRows: 1,
              errorRows: 0,
              warningRows: 0,
              rows: [
                {
                  rowNumber: 1,
                  status: 'VALID',
                  action: 'CREATE',
                  name: 'Imported Cold Pressed Mustard Oil 1L',
                  sku: 'OIL-MUST-1L',
                  sellingPrice: 220
                }
              ],
              detectedColumns: ['SKU', 'Name', 'Selling Price']
            })
          });
        } else if (path === '/api/v1/products/import/commit') {
          const newImported = {
            id: 'prd-imported-1',
            name: 'Imported Cold Pressed Mustard Oil 1L',
            sku: 'OIL-MUST-1L',
            barcode: '8901234567899',
            category: 'Oils',
            brand: 'VC Organic',
            supplier: 'Mustard Mills Ltd',
            purchasePrice: 150,
            sellingPrice: 220,
            gst: 5,
            unit: 'bottle',
            sellingMode: 'packaged',
            type: 'OWN',
            status: 'active',
            reorderLevel: 10,
            maxStock: 100,
            description: 'Pure cold pressed mustard oil.',
            barcodes: [],
            createdAt: new Date().toISOString()
          };
          currentProducts.push(newImported);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              imported: 1,
              summary: { total: 1, created: 1, updated: 0, failed: 0 }
            })
          });
        } else {
          // Create or update product
          const body = JSON.parse(route.request().postData() || '{}');
          if (body.id) {
            // Update
            currentProducts = currentProducts.map((p) => (p.id === body.id ? { ...p, ...body } : p));
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, product: body })
            });
          } else {
            // Create
            const created = {
              ...body,
              id: `prd-${Date.now()}`,
              createdAt: new Date().toISOString()
            };
            currentProducts.push(created);
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, product: created })
            });
          }
        }
      } else if (method === 'DELETE') {
        const id = url.pathname.split('/api/v1/products/')[1];
        currentProducts = currentProducts.map((p) =>
          p.id === id ? { ...p, isArchived: true, status: 'archived' } : p
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Product archived successfully' })
        });
      }
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // 1. Authoritative Title Assertion
    await expect(
      page.getByRole('heading', { name: 'Product Master Catalog' })
    ).toBeVisible();

    // 2. Summary Metric Cards Assertion
    await expect(page.getByText('Total Active SKUs')).toBeVisible();
    await expect(page.getByText('Catalog Classification')).toBeVisible();
    await expect(page.getByText('Selling Formats')).toBeVisible();

    // 3. Table Rows Assertion
    await expect(page.getByRole('table').getByText('A2 Gir Cow Cultured Ghee 500ml')).toBeVisible();
    await expect(page.getByRole('table').getByText('GHEE-A2-500')).toBeVisible();
    await expect(page.getByRole('table').getByText('Wild Forest Raw Honey 500g')).toBeVisible();

    // 4. Search Filter Test
    const searchInput = page.getByPlaceholder('Search by SKU, product name, or barcode...');
    await searchInput.fill('Ghee');
    await expect(page.getByRole('table').getByText('A2 Gir Cow Cultured Ghee 500ml')).toBeVisible();
    await expect(page.getByRole('table').getByText('Wild Forest Raw Honey 500g')).not.toBeVisible();

    // Reset Search
    await searchInput.fill('');
    await expect(page.getByRole('table').getByText('Wild Forest Raw Honey 500g')).toBeVisible();

    // 5. Inspect Detail Drawer
    const inspectBtn = page.getByRole('table').getByLabel('Inspect A2 Gir Cow Cultured Ghee 500ml');
    await inspectBtn.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'A2 Gir Cow Cultured Ghee 500ml' })).toBeVisible();
    await expect(drawer.getByText('Pure bilona method cultured ghee from grass-fed Gir cows.')).toBeVisible();
    await expect(drawer.getByText('8901234567890')).toBeVisible();

    // Close Drawer via Close button
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).not.toBeVisible();

    // 6. Create New Product SKU
    const addSkuBtn = page.getByRole('button', { name: /add product sku/i });
    await addSkuBtn.click();
    const createModal = page.getByRole('dialog');
    await expect(createModal).toBeVisible();
    await expect(createModal.getByRole('heading', { name: 'Register New Product SKU' })).toBeVisible();

    // Verify Default Expiry Date (Optional) field is present
    await expect(createModal.getByText('Default Expiry Date (Optional)')).toBeVisible();
    await expect(createModal.getByText('Default expiry for this SKU. Batch expiry overrides this value.')).toBeVisible();

    await createModal.getByPlaceholder(/e\.g\. a2 desi cow cultured ghee/i).fill('Organic A2 Paneer 250g');
    await createModal.getByPlaceholder(/e\.g\. ghee-a2-500m/i).fill('PAN-A2-250');
    await createModal.locator('#product-purchase-price').fill('110');
    await createModal.locator('#product-selling-price').fill('160');
    await createModal.locator('#product-default-expiry').fill('2026-11-30');

    // Take screenshot of Create Product Modal showing Default Expiry Date field
    await page.screenshot({
      path: '/Users/avanish/.gemini/antigravity/brain/bdb89543-3c62-42bd-8677-4a1129f88c3e/create-product-modal-expiry.png',
      fullPage: false
    });

    // Submit Create Form
    await createModal.getByRole('button', { name: 'Create Product SKU' }).click();
    await page.waitForLoadState('networkidle');

    // Verify newly created product appears in catalog
    await expect(page.getByRole('table').getByText('Organic A2 Paneer 250g')).toBeVisible();
    await expect(page.getByRole('table').getByText('PAN-A2-250')).toBeVisible();

    // 7. Edit Product Master
    const editBtn = page.getByRole('table').getByLabel('Edit Organic A2 Paneer 250g');
    await editBtn.click();
    const editModal = page.getByRole('dialog');
    await expect(editModal).toBeVisible();
    await expect(editModal.getByRole('heading', { name: /edit product master: organic a2 paneer 250g/i })).toBeVisible();

    // Verify Default Expiry Date preloaded
    await expect(editModal.locator('#product-default-expiry')).toHaveValue('2026-11-30');

    // Update Selling Price and Expiry
    const priceInput = editModal.locator('#product-selling-price');
    await priceInput.fill('175');
    await editModal.locator('#product-default-expiry').fill('2026-12-15');
    await editModal.getByRole('button', { name: 'Save Product Changes' }).click();
    await page.waitForLoadState('networkidle');
    await expect(editModal).not.toBeVisible();

    await expect(page.getByRole('table').getByText('₹175.00')).toBeVisible();

    // 8. Archive Product SKU
    const archiveBtn = page.getByRole('table').getByLabel('Archive Organic A2 Paneer 250g');
    await archiveBtn.click();
    const archiveDialog = page.getByRole('dialog');
    await expect(archiveDialog).toBeVisible();
    await expect(archiveDialog.getByRole('heading', { name: /archive product: organic a2 paneer 250g/i })).toBeVisible();

    await archiveDialog.getByRole('button', { name: 'Archive Product SKU' }).click();
    await page.waitForLoadState('networkidle');
    await expect(archiveDialog).not.toBeVisible();

    // Should disappear from active catalog view
    await expect(page.getByRole('table').getByText('Organic A2 Paneer 250g', { exact: true })).not.toBeVisible();

    // 9. Bulk Import Flow
    const bulkImportBtn = page.getByRole('button', { name: /bulk import/i });
    await bulkImportBtn.click();
    const importDialog = page.getByRole('dialog');
    await expect(importDialog).toBeVisible();
    await expect(importDialog.getByRole('heading', { name: 'Intelligent Bulk Product Import' })).toBeVisible();

    // Trigger file upload simulation
    const fileInput = importDialog.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'products.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('SKU,Name,Selling Price\nOIL-MUST-1L,Imported Cold Pressed Mustard Oil 1L,220\n')
    });

    // Verify preview step
    await expect(importDialog.getByText('OIL-MUST-1L')).toBeVisible();

    // Commit import
    const commitBtn = importDialog.getByRole('button', { name: /commit 1 valid skus/i });
    await commitBtn.click();

    // Confirmation screen
    await expect(importDialog.getByText('Import Committed Successfully')).toBeVisible();
    await importDialog.getByRole('button', { name: 'Done & View Catalog' }).click();
    await page.waitForLoadState('networkidle');

    // Verify imported item in catalog
    await expect(page.getByRole('table').getByText('Imported Cold Pressed Mustard Oil 1L')).toBeVisible();
  });

  test('2. Mobile Viewport (430x932 & 390x844) renders catalog without horizontal overflow', async ({ page }) => {
    // Mock products
    await page.route(/\/api\/v1\/products/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProducts)
      });
    });

    for (const viewport of [
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/products');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: 'Product Master Catalog' })
      ).toBeVisible();

      // Check no horizontal body overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('3. Role Access Restrictions: User without products.view sees AccessDeniedState', async ({ page }) => {
    // Inject restricted user (Cashier without products.view)
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-restricted-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-restricted',
          name: 'Restricted Staff',
          username: 'staff1',
          role: 'STAFF',
          category: 'employee',
          assignedStoreId: 'store-1',
          status: 'active',
          permissions: ['dashboard.view']
        })
      );
    });

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-restricted',
            name: 'Restricted Staff',
            username: 'staff1',
            role: 'STAFF',
            category: 'employee',
            assignedStoreId: 'store-1',
            status: 'active',
            permissions: ['dashboard.view']
          }
        })
      });
    });

    await page.goto('/products');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('Product Master Restricted')).toBeVisible();
  });
});
