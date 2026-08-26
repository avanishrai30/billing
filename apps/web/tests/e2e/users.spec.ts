import { test, expect } from '@playwright/test';

let mockUsers: Array<{
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  category: string;
  assignedStoreId: string;
  assignedStores: string[];
  permissions: string[];
  permissionGrants: string[];
  permissionDenies: string[];
  status: string;
  tokenVersion: number;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
  createdAt: string;
}> = [
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
    permissions: [],
    permissionGrants: [],
    permissionDenies: [],
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
    permissions: [],
    permissionGrants: [],
    permissionDenies: [],
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
    permissions: [],
    permissionGrants: [],
    permissionDenies: [],
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
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
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
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
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
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
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

    await page.route('**/api/v1/users/*/effective-permissions', async (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 2];
      const user = mockUsers.find((u) => u.id === id);
      const category = user?.category || 'employee';
      const effectivePermissions =
        category === 'admin'
          ? ['users.view', 'users.update', 'roles.view', 'roles.update', 'settings.update']
          : category === 'super admin'
            ? ['*']
            : ['dashboard.view', 'products.view', 'customers.view'];

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          userId: id,
          category,
          rolePermissions: effectivePermissions,
          permissionGrants: user?.permissionGrants || [],
          permissionDenies: user?.permissionDenies || [],
          effectivePermissions
        })
      });
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
        if (body.username === 'pradeep.all') {
          expect(body).toMatchObject({
            name: 'Pradeep H',
            username: 'pradeep.all',
            email: '',
            role: 'Administrator',
            category: 'admin',
            assignedStoreId: 'all',
            assignedStores: ['all'],
            permissions: [],
            permissionGrants: [],
            permissionDenies: [],
            status: 'active'
          });
          expect(body.password).toBeTruthy();
        }
        if (body.username === 'pradeep.store1') {
          expect(body).toMatchObject({
            name: 'Pradeep H Store 1',
            username: 'pradeep.store1',
            email: '',
            role: 'Employee',
            category: 'employee',
            assignedStoreId: 'store-1',
            assignedStores: ['store-1'],
            permissions: [],
            permissionGrants: [],
            permissionDenies: [],
            status: 'active'
          });
          expect(body.password).toBeTruthy();
        }
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

    // Canonical category edit: Employee -> Admin must update authorization while preserving custom title.
    await page.getByLabel('Edit user Ramesh Patil').click();
    const roleModal = page.getByRole('dialog');
    await expect(roleModal).toBeVisible();
    await expect(roleModal.getByText('Authorization Role', { exact: true }).first()).toBeVisible();
    await expect(roleModal.getByText("This controls the user's permissions and application access.")).toBeVisible();
    await expect(roleModal.getByText(/Job Title \/ Display Title/).first()).toBeVisible();
    await expect(roleModal.getByText('This is a descriptive job title and does not control permissions.')).toBeVisible();
    await roleModal.getByLabel('Authorization Role').selectOption('admin');
    await roleModal.getByRole('button', { name: /save changes/i }).click();
    await expect(roleModal).not.toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Authorization role updated to Admin' })).toBeVisible();
    const rameshRow = page.getByRole('row').filter({ hasText: 'Ramesh Patil' });
    await expect(rameshRow.getByText('Admin', { exact: true }).first()).toBeVisible();
    await expect(rameshRow.getByText('Cashier Staff', { exact: true })).toBeVisible();

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
    await expect(modal.getByLabel('Authorization Role')).toHaveValue('employee');

    await modal.getByRole('button', { name: /create user account/i }).click();
    await expect(modal).not.toBeVisible();

    await expect(page.getByText('Amit Verma')).toBeVisible();

    // 3b. Create Admin with canonical All Stores scope
    await page.getByRole('button', { name: /add new user/i }).click();
    const allStoresModal = page.getByRole('dialog');
    await allStoresModal.locator('input[name="name"]').fill('Pradeep H');
    await allStoresModal.locator('input[name="username"]').fill('pradeep.all');
    await expect(allStoresModal.locator('input[name="email"]')).toHaveValue('');
    await allStoresModal.locator('input[name="phone"]').fill('9898989898');
    await allStoresModal.locator('input[name="password"]').fill('password123');
    await allStoresModal.getByLabel('Authorization Role').selectOption('admin');
    await allStoresModal.locator('input[name="role"]').fill('Administrator');
    await allStoresModal.getByRole('button', { name: 'All Stores' }).click();
    await allStoresModal.getByRole('button', { name: /create user account/i }).click();
    await expect(allStoresModal).not.toBeVisible();
    await expect(page.getByText('Pradeep H', { exact: true })).toBeVisible();
    const pradeepAllRow = page.getByRole('row').filter({ hasText: 'pradeep.all' });
    await expect(pradeepAllRow.getByText('Admin', { exact: true }).first()).toBeVisible();
    await expect(pradeepAllRow.getByText('All Stores (Global)')).toBeVisible();

    // 3c. Create Employee with Mumbai Flagship store assignment
    await page.getByRole('button', { name: /add new user/i }).click();
    const storeModal = page.getByRole('dialog');
    await storeModal.locator('input[name="name"]').fill('Pradeep H Store 1');
    await storeModal.locator('input[name="username"]').fill('pradeep.store1');
    await expect(storeModal.locator('input[name="email"]')).toHaveValue('');
    await storeModal.locator('input[name="phone"]').fill('9797979797');
    await storeModal.locator('input[name="password"]').fill('password123');
    await storeModal.locator('input[name="role"]').fill('Employee');
    await expect(storeModal.locator('label').filter({ hasText: 'Mumbai Flagship' })).toBeVisible();
    await storeModal.getByRole('button', { name: /create user account/i }).click();
    await expect(storeModal).not.toBeVisible();
    await expect(page.getByText('Pradeep H Store 1')).toBeVisible();
    const pradeepStoreRow = page.getByRole('row').filter({ hasText: 'pradeep.store1' });
    await expect(pradeepStoreRow.getByText('Employee', { exact: true }).first()).toBeVisible();
    await expect(pradeepStoreRow.getByText('Mumbai Flagship')).toBeVisible();

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

  test('3. Realtime User Avatar Display, Initials Fallback, and Zero Broken Image Layout', async ({ page }) => {
    // Populate one user with an avatar, one with initials
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
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
        status: 'active',
        tokenVersion: 1,
        avatar: '/uploads/users/admin-avatar.webp',
        avatarUpdatedAt: '2026-08-26T10:00:00.000Z',
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
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
        status: 'active',
        tokenVersion: 1,
        avatar: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-3',
        name: 'Pradeep H',
        username: 'pradeep.h',
        email: 'pradeep@vcorganics.com',
        phone: '9888877777',
        role: 'Auditor',
        category: 'auditor',
        assignedStoreId: 'all',
        assignedStores: ['all'],
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
        status: 'active',
        tokenVersion: 1,
        avatar: '/uploads/users/broken-avatar.webp',
        avatarUpdatedAt: '2026-08-26T10:00:00.000Z',
        createdAt: new Date().toISOString()
      }
    ];

    await page.route('**/uploads/users/**', async (route) => {
      if (route.request().url().includes('broken-avatar')) {
        return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'image/webp',
        body: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64')
      });
    });

    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // 1. Verify User 1 renders image avatar with resolved URL
    const adminRow = page.getByRole('row').filter({ hasText: 'Super Admin' });
    const adminAvatar = adminRow.getByTestId('user-avatar');
    const adminAvatarImg = adminAvatar.locator('img');
    await expect(adminAvatarImg).toBeVisible();
    const imgSrc = await adminAvatarImg.getAttribute('src');
    expect(imgSrc).toContain('/uploads/users/admin-avatar.webp?v=');

    // 2. Verify User 2 renders initials fallback (VS)
    const vikramRow = page.getByRole('row').filter({ hasText: 'Vikram Shinde' });
    const vikramAvatar = vikramRow.getByTestId('user-avatar');
    await expect(vikramAvatar.getByText('VS')).toBeVisible();
    await expect(vikramAvatar.locator('img')).not.toBeVisible();

    // 3. Verify User 3 with broken avatar image 404 gracefully falls back to initials (PH) without broken image icon
    const pradeepRow = page.getByRole('row').filter({ hasText: 'Pradeep H' });
    const pradeepAvatar = pradeepRow.getByTestId('user-avatar');
    await expect(pradeepAvatar.getByText('PH')).toBeVisible();
    await expect(pradeepAvatar.locator('img')).not.toBeVisible();

    // 4. Inspect user drawer to verify avatar inside identity details
    await adminRow.getByLabel('View user details for Super Admin').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    const drawerAvatarImg = drawer.getByTestId('user-avatar').locator('img');
    await expect(drawerAvatarImg).toBeVisible();
    await drawer.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(drawer).not.toBeVisible();
  });
});
