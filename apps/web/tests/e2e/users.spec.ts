import { test, expect } from '@playwright/test';

let mockUsers = [
  {
    id: 'usr-1',
    name: 'Super Admin',
    username: 'admin',
    email: 'admin@vcorganics.com',
    phone: '9876543210',
    role: 'Enterprise Owner',
    category: 'super admin',
    assignedStoreId: 'all',
    assignedStores: ['all'],
    status: 'active',
    tokenVersion: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-2',
    name: 'Vikram Shinde',
    username: 'vikram.s',
    email: 'vikram@vcorganics.com',
    phone: '9123456780',
    role: 'Store Manager',
    category: 'admin',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    status: 'active',
    tokenVersion: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-3',
    name: 'Ramesh Patil',
    username: 'ramesh.cashier',
    email: 'ramesh@vcorganics.com',
    phone: '9988776655',
    role: 'Cashier Staff',
    category: 'employee',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    status: 'active',
    tokenVersion: 1,
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

test.describe('Phase 13B User Accounts & Team Management E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    mockUsers = [
      {
        id: 'usr-1',
        name: 'Super Admin',
        username: 'admin',
        email: 'admin@vcorganics.com',
        phone: '9876543210',
        role: 'Enterprise Owner',
        category: 'super admin',
        assignedStoreId: 'all',
        assignedStores: ['all'],
        status: 'active',
        tokenVersion: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-2',
        name: 'Vikram Shinde',
        username: 'vikram.s',
        email: 'vikram@vcorganics.com',
        phone: '9123456780',
        role: 'Store Manager',
        category: 'admin',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        status: 'active',
        tokenVersion: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-3',
        name: 'Ramesh Patil',
        username: 'ramesh.cashier',
        email: 'ramesh@vcorganics.com',
        phone: '9988776655',
        role: 'Cashier Staff',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        status: 'active',
        tokenVersion: 1,
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

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });

    // Users API Handlers
    await page.route('**/api/v1/users/presences', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 'usr-1', username: 'admin', role: 'SUPER ADMIN' }
        ])
      });
    });

    await page.route('**/api/v1/users/*/deactivate', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 2];

      const idx = mockUsers.findIndex((u) => u.id === id);
      if (idx !== -1) {
        mockUsers[idx].status = 'suspended';
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'User suspended', user: mockUsers[idx] })
        });
      }

      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
    });

    await page.route('**/api/v1/users/*', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];

      const match = mockUsers.find((u) => u.id === id);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(match || { id, name: 'User' })
      });
    });

    await page.route('**/api/v1/users', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUsers)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const id = body.id || `usr-${Date.now()}`;
        const newUser = {
          ...body,
          id,
          status: body.status || 'active',
          tokenVersion: 1,
          createdAt: body.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const existingIdx = mockUsers.findIndex((u) => u.id === id);
        if (existingIdx !== -1) {
          mockUsers[existingIdx] = newUser;
        } else {
          mockUsers.push(newUser);
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: newUser })
        });
      }

      route.continue();
    });
  });

  test('1. Complete User Management Lifecycle: Directory, Profile, Create, Edit, Suspend & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Users Directory
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'User Accounts & Team Management' })).toBeVisible();
    await expect(page.getByText('Vikram Shinde')).toBeVisible();
    await expect(page.getByText('Ramesh Patil')).toBeVisible();

    // 2. Open User Detail Drawer
    await page.getByLabel('View user details for Vikram Shinde').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Identity & Contact Details')).toBeVisible();
    await expect(drawer.getByText('@vikram.s', { exact: true })).toBeVisible();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).not.toBeVisible();

    // 3. Create New User
    await page.getByRole('button', { name: /add new user/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/register new user account/i)).toBeVisible();

    await modal.locator('input[name="name"]').fill('Amit Verma');
    await modal.locator('input[name="username"]').fill('amit.verma');
    await modal.locator('input[name="email"]').fill('amit@example.com');
    await modal.locator('input[name="phone"]').fill('9811223344');
    await modal.locator('input[name="password"]').fill('password123');
    await modal.locator('input[name="role"]').fill('Lead Cashier');

    await modal.getByRole('button', { name: /create user account/i }).click();
    await expect(modal).not.toBeVisible();

    await expect(page.getByText('Amit Verma')).toBeVisible();

    // 4. Suspend User (Deactivate)
    await page.getByLabel('Deactivate user Ramesh Patil').click();
    const suspendDialog = page.getByRole('dialog');
    await expect(suspendDialog).toBeVisible();
    await expect(suspendDialog.getByText(/suspend user account/i)).toBeVisible();

    await suspendDialog.getByRole('button', { name: /confirm suspension/i }).click();
    await expect(suspendDialog).not.toBeVisible();

    // Verify Suspended badge
    await expect(page.getByText('SUSPENDED').first()).toBeVisible();

    // 5. Return to Dashboard and confirm stability
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
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'User Accounts & Team Management' })).toBeVisible();

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
