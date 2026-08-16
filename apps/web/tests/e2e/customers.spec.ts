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

let mockCustomers = [
  {
    id: 'cust-1',
    name: 'Avanish Rai',
    phone: '9876543210',
    email: 'avanish@example.com',
    gstin: '27AAAAA0000A1Z5',
    address: '102 Green Acres, Mumbai',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cust-2',
    name: 'Rohan Sharma',
    phone: '9876543211',
    email: 'rohan@example.com',
    gstin: '',
    address: 'Bandra West, Mumbai',
    createdAt: new Date().toISOString()
  }
];

const mockCustomerInvoices = [
  {
    _id: 'inv-1',
    id: 'INV-2026-001',
    invoiceNumber: 'INV-2026-001',
    locationId: 'store-1',
    customerId: 'cust-1',
    customerName: 'Avanish Rai',
    items: [
      {
        productId: 'prod-101',
        name: 'A2 Pure Cow Ghee 1L',
        quantity: 2,
        price: 650,
        lineTotal: 1300
      }
    ],
    subtotal: 1300,
    discount: 0,
    tax: 65,
    grandTotal: 1365,
    status: 'PAID',
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 9B Customers / CRM E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Reset mock customers
    mockCustomers = [
      {
        id: 'cust-1',
        name: 'Avanish Rai',
        phone: '9876543210',
        email: 'avanish@example.com',
        gstin: '27AAAAA0000A1Z5',
        address: '102 Green Acres, Mumbai',
        createdAt: new Date().toISOString()
      },
      {
        id: 'cust-2',
        name: 'Rohan Sharma',
        phone: '9876543211',
        email: 'rohan@example.com',
        gstin: '',
        address: 'Bandra West, Mumbai',
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

    await page.route('**/api/v1/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          invoices: mockCustomerInvoices,
          pagination: {
            page: 1,
            limit: 50,
            total: mockCustomerInvoices.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        })
      });
    });

    await page.route('**/api/v1/customers/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}');
        const match = mockCustomers.find((c) => c.id === id);
        if (match) {
          Object.assign(match, body, { updatedAt: new Date().toISOString() });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, customer: match })
        });
      }

      if (route.request().method() === 'DELETE') {
        mockCustomers = mockCustomers.filter((c) => c.id !== id);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Customer deleted successfully' })
        });
      }

      if (route.request().method() === 'GET') {
        const match = mockCustomers.find((c) => c.id === id);
        if (!match) {
          return route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } })
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

    await page.route('**/api/v1/customers', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockCustomers)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newCust = {
          ...body,
          id: `cust-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        mockCustomers.push(newCust);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, customer: newCust })
        });
      }

      route.continue();
    });
  });

  test('1. Complete Customer CRM Lifecycle: Search, Detail Drawer, Invoice History, Create, Edit, Delete & Dashboard Isolation', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Start on Dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to Customers
    await page.getByRole('link', { name: 'Customers' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Customer CRM Directory' })).toBeVisible();
    await expect(page.getByText('Registered Buyer Profiles')).toBeVisible();
    await expect(page.getByText('Avanish Rai')).toBeVisible();
    await expect(page.getByText('Rohan Sharma')).toBeVisible();

    // 3. Search Customer
    const searchInput = page.getByPlaceholder(/search by customer name, phone number, email, or gstin/i);
    await searchInput.fill('Avanish');
    await expect(page.getByText('Avanish Rai')).toBeVisible();
    await expect(page.getByText('Rohan Sharma')).not.toBeVisible();

    // Clear search
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('Rohan Sharma')).toBeVisible();

    // 4. Open Detail Drawer & View Invoice History
    const viewBtn = page.getByRole('button', {
      name: /view history and details for avanish rai/i
    });
    await viewBtn.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('GST Verified')).toBeVisible();
    await expect(drawer.getByText('102 Green Acres, Mumbai')).toBeVisible();
    await expect(drawer.getByText(/purchase history/i)).toBeVisible();
    await expect(drawer.getByText('INV-2026-001')).toBeVisible();

    // Capture visual baseline of Desktop Customers with Drawer (1440x900)
    await page.screenshot({ path: 'test-results/desktop-customers.png', fullPage: true });

    // Close Drawer
    await page.getByLabel('Close drawer').click();
    await expect(drawer).not.toBeVisible();

    // 5. Create New Customer Profile
    await page.getByRole('button', { name: /register customer/i }).click();

    const createModal = page.getByRole('dialog');
    await expect(createModal).toBeVisible();
    await expect(createModal.getByText(/register buyer customer profile/i)).toBeVisible();

    await createModal.getByPlaceholder('e.g. Avanish Rai').fill('Priya Patel');
    await createModal.getByPlaceholder('e.g. 9876543210').fill('9812345678');
    await createModal.getByPlaceholder('e.g. avanish@example.com').fill('priya@example.com');
    await createModal.getByPlaceholder(/102 green acres/i).fill('Juhu, Mumbai');

    await createModal.getByRole('button', { name: /register customer/i }).click();
    await expect(createModal).not.toBeVisible();

    await expect(page.getByText('Priya Patel')).toBeVisible();

    // 6. Edit Customer Profile
    const editBtn = page.getByRole('button', {
      name: /edit profile for priya patel/i
    });
    await editBtn.click();

    const editModal = page.getByRole('dialog');
    await expect(editModal).toBeVisible();
    await expect(editModal.getByText(/edit customer: priya patel/i)).toBeVisible();

    const nameInput = editModal.getByPlaceholder('e.g. Avanish Rai');
    await nameInput.fill('Priya Patel (VIP)');

    await editModal.getByRole('button', { name: /save changes/i }).click();
    await expect(editModal).not.toBeVisible();

    await expect(page.getByText('Priya Patel (VIP)')).toBeVisible();

    // 7. Delete Customer Profile
    const deleteBtn = page.getByRole('button', {
      name: /delete customer priya patel \(vip\)/i
    });
    await deleteBtn.click();

    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await expect(deleteDialog.getByText(/delete customer: priya patel \(vip\)/i)).toBeVisible();

    await deleteDialog.getByRole('button', { name: /confirm & delete profile/i }).click();
    await expect(deleteDialog).not.toBeVisible();

    await expect(page.getByText('Priya Patel (VIP)')).not.toBeVisible();

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
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Customer CRM Directory' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-customers.png', fullPage: true });
  });
});
