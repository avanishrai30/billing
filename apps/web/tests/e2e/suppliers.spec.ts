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

let mockSuppliers = [
  {
    id: 'sup-1',
    name: 'Golden Ghee Co.',
    contact: '9876543210',
    email: 'orders@goldenghee.com',
    gst: '27AAAAA0000A1Z5',
    address: 'Unit 4, Anand Industrial Estate, Gujarat',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-2',
    name: 'Pure Dairy Products',
    contact: '9876543211',
    email: 'contact@puredairy.com',
    gst: '',
    address: 'Pune, Maharashtra',
    createdAt: new Date().toISOString()
  }
];

const mockSupplierPurchases = [
  {
    _id: 'pur-1',
    id: 'PUR-2026-001',
    invoiceNumber: 'PUR-2026-001',
    locationId: 'store-1',
    supplierId: 'sup-1',
    supplierName: 'Golden Ghee Co.',
    items: [
      {
        productId: 'prod-101',
        name: 'A2 Pure Cow Ghee 1L',
        quantity: 50,
        cost: 500,
        lineTotal: 25000
      }
    ],
    transport: {
      transporter: 'VRL Logistics',
      docketNumber: 'LR-998822',
      charge: 500,
      enabled: true
    },
    subtotal: 25000,
    tax: 1250,
    grandTotal: 26750,
    status: 'COMPLETED',
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 10B Suppliers & Vendor Directory E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Reset mock suppliers
    mockSuppliers = [
      {
        id: 'sup-1',
        name: 'Golden Ghee Co.',
        contact: '9876543210',
        email: 'orders@goldenghee.com',
        gst: '27AAAAA0000A1Z5',
        address: 'Unit 4, Anand Industrial Estate, Gujarat',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sup-2',
        name: 'Pure Dairy Products',
        contact: '9876543211',
        email: 'contact@puredairy.com',
        gst: '',
        address: 'Pune, Maharashtra',
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

    await page.route('**/api/v1/purchases*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          purchases: mockSupplierPurchases,
          pagination: {
            page: 1,
            limit: 50,
            total: mockSupplierPurchases.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        })
      });
    });

    await page.route('**/api/v1/suppliers/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockSuppliers.find((s) => s.id === id);
        if (match) {
          Object.assign(match, body, { updatedAt: new Date().toISOString() });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, supplier: match })
        });
      }

      if (route.request().method() === 'DELETE') {
        mockSuppliers = mockSuppliers.filter((s) => s.id !== id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Supplier deleted successfully' })
        });
      }

      if (route.request().method() === 'GET') {
        const match = mockSuppliers.find((s) => s.id === id);
        if (!match) {
          return route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Supplier not found' } })
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(match)
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/suppliers', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockSuppliers)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newSup = {
          ...body,
          id: `sup-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        mockSuppliers.push(newSup);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, supplier: newSup })
        });
      }

      route.continue();
    });
  });

  test('1. Complete Supplier Directory Lifecycle: Search, Detail Drawer, Purchase History, Create, Edit, Delete & Dashboard Isolation', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Start on Dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to Suppliers
    await page.getByRole('link', { name: 'Suppliers' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Supplier & Vendor Directory' })).toBeVisible();
    await expect(page.getByText('Registered Supply Partners')).toBeVisible();
    await expect(page.getByText('Golden Ghee Co.')).toBeVisible();
    await expect(page.getByText('Pure Dairy Products')).toBeVisible();

    // 3. Search Supplier
    const searchInput = page.getByPlaceholder(/search by supplier name, contact phone, email, or gstin/i);
    await searchInput.fill('Golden');
    await expect(page.getByText('Golden Ghee Co.')).toBeVisible();
    await expect(page.getByText('Pure Dairy Products')).not.toBeVisible();

    // Clear search
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('Pure Dairy Products')).toBeVisible();

    // 4. Open Detail Drawer & View Purchase History
    const viewBtn = page.getByRole('button', {
      name: /view history and details for golden ghee co\./i
    });
    await viewBtn.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('GST Verified')).toBeVisible();
    await expect(drawer.getByText(/unit 4, anand industrial estate/i)).toBeVisible();
    await expect(drawer.getByText(/inward purchase ledger/i)).toBeVisible();
    await expect(drawer.getByText('PUR-2026-001')).toBeVisible();
    await expect(drawer.getByText(/lr: lr-998822/i)).toBeVisible();

    // Capture visual baseline of Desktop Suppliers with Drawer (1440x900)
    await page.screenshot({ path: 'test-results/desktop-suppliers.png', fullPage: true });

    // Close Drawer
    await page.getByLabel('Close drawer').click();
    await expect(drawer).not.toBeVisible();

    // 5. Create New Supplier Profile
    await page.getByRole('button', { name: /register supplier/i }).click();

    const createModal = page.getByRole('dialog');
    await expect(createModal).toBeVisible();
    await expect(createModal.getByText(/register new supply partner/i)).toBeVisible();

    await createModal.getByPlaceholder('e.g. Golden Ghee Co.').fill('Organic Spices Ltd.');
    await createModal.getByPlaceholder('e.g. 9876543210').fill('9811223344');
    await createModal.getByPlaceholder('e.g. orders@goldenghee.com').fill('orders@spices.com');
    await createModal.getByPlaceholder(/unit 4, anand/i).fill('Kerala, India');

    await createModal.getByRole('button', { name: /register supplier/i }).click();
    await expect(createModal).not.toBeVisible();

    await expect(page.getByText('Organic Spices Ltd.')).toBeVisible();

    // 6. Edit Supplier Profile
    const editBtn = page.getByRole('button', {
      name: /edit profile for organic spices ltd\./i
    });
    await editBtn.click();

    const editModal = page.getByRole('dialog');
    await expect(editModal).toBeVisible();
    await expect(editModal.getByText(/edit supplier: organic spices ltd\./i)).toBeVisible();

    const nameInput = editModal.getByPlaceholder('e.g. Golden Ghee Co.');
    await nameInput.fill('Organic Spices Ltd. (Wholesale)');

    await editModal.getByRole('button', { name: /save changes/i }).click();
    await expect(editModal).not.toBeVisible();

    await expect(page.getByText('Organic Spices Ltd. (Wholesale)')).toBeVisible();

    // 7. Delete Supplier Profile
    const deleteBtn = page.getByRole('button', {
      name: /delete supplier organic spices ltd\. \(wholesale\)/i
    });
    await deleteBtn.click();

    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByText(/delete supplier: organic spices ltd\. \(wholesale\)/i)).toBeVisible();

    await deleteDialog.getByRole('button', { name: /confirm & delete profile/i }).click();
    await expect(deleteDialog).not.toBeVisible();

    await expect(page.getByText('Organic Spices Ltd. (Wholesale)')).not.toBeVisible();

    // 8. Cross-Module Isolation: Navigate back to Dashboard and verify stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Mobile Responsive Viewport (430x932) has zero horizontal overflow and responsive table layout', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/suppliers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Supplier & Vendor Directory' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-suppliers.png', fullPage: true });
  });
});
