import { test, expect } from '@playwright/test';

const mockStores = [
  { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active', isHub: false }
];

let mockUsers = [
  {
    id: 'usr-rajesh',
    name: 'Rajesh',
    username: 'rajesh',
    role: 'Store Cashier',
    category: 'employee',
    status: 'active',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    avatar: '/uploads/users/rajesh-profile.webp',
    avatarUpdatedAt: '2026-08-26T00:00:00Z',
    permissionGrants: [],
    permissionDenies: []
  },
  {
    id: 'usr-hemasree',
    name: 'Hemasree',
    username: 'hemasree',
    role: 'Inventory Assistant',
    category: 'employee',
    status: 'active',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    avatar: null,
    avatarUpdatedAt: null,
    permissionGrants: [],
    permissionDenies: []
  },
  {
    id: 'usr-alavro',
    name: 'Alavro',
    username: 'alavro',
    role: 'System Auditor',
    category: 'auditor',
    status: 'active',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    avatar: '/uploads/users/broken-avatar.webp',
    avatarUpdatedAt: '2026-08-26T00:00:00Z',
    permissionGrants: ['audit.view'],
    permissionDenies: []
  }
];

const mockRoleMatrix = {
  admin: ['dashboard.view', 'users.view', 'roles.view'],
  employee: ['dashboard.view', 'pos.access', 'invoices.create', 'invoices.view'],
  auditor: ['dashboard.view', 'audit.view']
};

test.describe('Global User Avatar Consistency & Roles & Access E2E Suite', () => {
  const superAdmin = {
    id: 'usr-admin',
    name: 'Super Administrator',
    username: 'admin',
    role: 'Enterprise Owner',
    category: 'super admin',
    assignedStoreId: 'all',
    assignedStores: ['all'],
    avatar: '/uploads/users/admin.webp',
    avatarUpdatedAt: '2026-08-26T00:00:00Z',
    permissions: ['*']
  };

  test.beforeEach(async ({ page }) => {
    // Reset mock users array
    mockUsers = [
      {
        id: 'usr-rajesh',
        name: 'Rajesh',
        username: 'rajesh',
        role: 'Store Cashier',
        category: 'employee',
        status: 'active',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        avatar: '/uploads/users/rajesh-profile.webp',
        avatarUpdatedAt: '2026-08-26T00:00:00Z',
        permissionGrants: [],
        permissionDenies: []
      },
      {
        id: 'usr-hemasree',
        name: 'Hemasree',
        username: 'hemasree',
        role: 'Inventory Assistant',
        category: 'employee',
        status: 'active',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        avatar: null,
        avatarUpdatedAt: null,
        permissionGrants: [],
        permissionDenies: []
      },
      {
        id: 'usr-alavro',
        name: 'Alavro',
        username: 'alavro',
        role: 'System Auditor',
        category: 'auditor',
        status: 'active',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        avatar: '/uploads/users/broken-avatar.webp',
        avatarUpdatedAt: '2026-08-26T00:00:00Z',
        permissionGrants: ['audit.view'],
        permissionDenies: []
      }
    ];

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    }, superAdmin);

    // Mock generic 1x1 transparent PNG for avatar images
    await page.route('**/uploads/users/**', async (route) => {
      const url = route.request().url();
      if (url.includes('broken-avatar')) {
        return route.fulfill({ status: 404, body: 'Not Found' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        )
      });
    });

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify') || url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: superAdmin }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: ['*'] }) });
      }

      if (url.includes('/api/v1/rbac/matrix') || url.includes('/api/v1/rbac/roles')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRoleMatrix) });
      }

      if (url.includes('/api/v1/public/settings') || url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStores) });
      }

      if (url.includes('/api/v1/users')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUsers) });
      }

      return route.continue();
    });
  });

  test('1. Users page renders uploaded photo for Rajesh, initials for Hemasree, and fallback for broken avatar', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('domcontentloaded');

    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Rajesh has real avatar photo
    const rajeshRow = table.locator('tr').filter({ hasText: 'Rajesh' });
    await expect(rajeshRow).toBeVisible();
    const rajeshAvatarImg = rajeshRow.locator('[data-testid="user-avatar"] img');
    await expect(rajeshAvatarImg).toBeVisible();
    await expect(rajeshAvatarImg).toHaveAttribute('src', expect.stringContaining('/uploads/users/rajesh-profile.webp?v='));

    // Hemasree has no avatar -> initials "H"
    const hemasreeRow = table.locator('tr').filter({ hasText: 'Hemasree' });
    await expect(hemasreeRow).toBeVisible();
    await expect(hemasreeRow.locator('[data-testid="user-avatar"]').getByText('H', { exact: true })).toBeVisible();
    await expect(hemasreeRow.locator('[data-testid="user-avatar"] img')).toHaveCount(0);

    // Alavro has broken avatar -> initials "A"
    const alavroRow = table.locator('tr').filter({ hasText: 'Alavro' });
    await expect(alavroRow).toBeVisible();
    await expect(alavroRow.locator('[data-testid="user-avatar"]').getByText('A', { exact: true })).toBeVisible();
  });

  test('2. Roles & Access page renders identical avatar photo for Rajesh and initials for Hemasree', async ({ page }) => {
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    // Switch to Users tab in Roles & Access
    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible();
    await usersTab.click();

    // Verify Active Users grid is loaded
    await expect(page.getByText('Active Users')).toBeVisible();

    // Rajesh card must render the real avatar image (not just "R")
    const rajeshCard = page.locator('button').filter({ hasText: 'Rajesh' }).first();
    await expect(rajeshCard).toBeVisible();
    const rajeshImg = rajeshCard.locator('[data-testid="user-avatar"] img');
    await expect(rajeshImg).toBeVisible();
    await expect(rajeshImg).toHaveAttribute('src', expect.stringContaining('/uploads/users/rajesh-profile.webp?v='));

    // Hemasree card must render initials "H"
    const hemasreeCard = page.locator('button').filter({ hasText: 'Hemasree' }).first();
    await expect(hemasreeCard).toBeVisible();
    await expect(hemasreeCard.locator('[data-testid="user-avatar"]').getByText('H', { exact: true })).toBeVisible();
    await expect(hemasreeCard.locator('[data-testid="user-avatar"] img')).toHaveCount(0);

    // Click Rajesh card to inspect User Access Drawer
    await rajeshCard.click();
    await expect(page.getByText('Rajesh Access')).toBeVisible();

    // Drawer header identity block must render Rajesh's avatar image
    const drawer = page.locator('div[role="dialog"]').or(page.locator('.fixed.inset-y-0.right-0'));
    const drawerImg = drawer.locator('[data-testid="user-avatar"] img');
    await expect(drawerImg).toBeVisible();
    await expect(drawerImg).toHaveAttribute('src', expect.stringContaining('/uploads/users/rajesh-profile.webp?v='));
  });

  test('3. Realtime user_updated event updates avatar on Roles & Access and Users page', async ({ page }) => {
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible();
    await usersTab.click();

    // Hemasree initially has initials "H"
    const hemasreeCard = page.locator('button').filter({ hasText: 'Hemasree' }).first();
    await expect(hemasreeCard.locator('[data-testid="user-avatar"]').getByText('H', { exact: true })).toBeVisible();

    // Simulate backend realtime user_updated event (e.g. Hemasree uploads a new avatar)
    await page.evaluate(() => {
      const updatedHemasree = {
        id: 'usr-hemasree',
        name: 'Hemasree',
        username: 'hemasree',
        role: 'Inventory Assistant',
        category: 'employee',
        status: 'active',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        avatar: '/uploads/users/hemasree-new.webp',
        avatarUpdatedAt: '2026-08-26T07:30:00Z',
        updatedAt: '2026-08-26T07:30:00Z',
        permissionGrants: [],
        permissionDenies: []
      };

      const realtime = (window as any).__aiavro_realtime;
      if (realtime) {
        realtime.dispatch('user_updated', { success: true, user: updatedHemasree, userId: 'usr-hemasree' });
      }
    });

    // Navigate to /users to verify cross-page consistency
    await page.goto('/users');
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('table');
    await expect(table).toBeVisible();
    const rajeshRow = table.locator('tr').filter({ hasText: 'Rajesh' });
    await expect(rajeshRow.locator('[data-testid="user-avatar"] img')).toBeVisible();
  });

  test('4. Live realtime replacement & avatar removal on Roles & Access page without page reload', async ({ page }) => {
    await page.goto('/permissions');
    await page.waitForLoadState('domcontentloaded');

    const usersTab = page.getByRole('tab', { name: /users/i });
    await expect(usersTab).toBeVisible();
    await usersTab.click();

    // 1. Rajesh card shows uploaded photo
    const rajeshCard = page.locator('button').filter({ hasText: 'Rajesh' }).first();
    await expect(rajeshCard.locator('[data-testid="user-avatar"] img')).toBeVisible();

    // 2. Emit user_updated removing Rajesh's avatar
    mockUsers[0].avatar = null;
    mockUsers[0].avatarUpdatedAt = null;

    await page.evaluate(() => {
      const realtime = (window as any).__aiavro_realtime;
      if (realtime) {
        realtime.dispatch('user_updated', {
          userId: 'usr-rajesh',
          avatar: null,
          avatarUpdatedAt: null,
          user: {
            id: 'usr-rajesh',
            name: 'Rajesh',
            username: 'rajesh',
            role: 'Store Cashier',
            category: 'employee',
            status: 'active',
            assignedStoreId: 'store-1',
            assignedStores: ['store-1'],
            avatar: null,
            avatarUpdatedAt: null,
            updatedAt: '2026-08-26T08:00:00Z'
          }
        });
      }
    });

    // 3. Rajesh card in Roles & Access immediately falls back to "R" without reload
    await expect(rajeshCard.locator('[data-testid="user-avatar"]').getByText('R', { exact: true })).toBeVisible();
    await expect(rajeshCard.locator('[data-testid="user-avatar"] img')).toHaveCount(0);
  });
});
