import { test, expect } from '@playwright/test';

let mockMatrix = {
  admin: [
    'dashboard.view',
    'invoices.create',
    'invoices.view',
    'invoices.print',
    'invoices.void',
    'products.view',
    'products.create',
    'products.update',
    'inventory.view',
    'inventory.adjust',
    'inventory.transfer',
    'purchases.view',
    'purchases.create',
    'customers.view',
    'customers.create',
    'suppliers.view',
    'stores.view',
    'franchise.view',
    'users.view',
    'roles.view',
    'audit.view',
    'settings.view'
  ],
  employee: [
    'dashboard.view',
    'invoices.create',
    'invoices.view',
    'invoices.print',
    'products.view',
    'inventory.view',
    'purchases.view',
    'purchases.create',
    'customers.view',
    'customers.create',
    'suppliers.view',
    'scanner.use'
  ],
  auditor: [
    'dashboard.view',
    'invoices.view',
    'invoices.print',
    'products.view',
    'inventory.view',
    'purchases.view',
    'audit.view'
  ]
};

let mockUsers: Array<{
  id: string;
  name: string;
  username: string;
  role: string;
  category: 'super admin' | 'admin' | 'employee' | 'auditor';
  assignedStoreId: string;
  assignedStores: string[];
  permissionGrants: string[];
  permissionDenies: string[];
  status: string;
  createdAt: string;
}> = [
  {
    id: 'usr-employee',
    name: 'Nithin Yadav',
    username: 'nithin',
    role: 'Employee',
    category: 'employee',
    assignedStoreId: 'store-1',
    assignedStores: ['store-1'],
    permissionGrants: [],
    permissionDenies: [],
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

test.describe('Phase 13B RBAC Permissions Matrix E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    mockMatrix = {
      admin: [
        'dashboard.view',
        'invoices.create',
        'invoices.view',
        'invoices.print',
        'invoices.void',
        'products.view',
        'products.create',
        'products.update',
        'inventory.view',
        'inventory.adjust',
        'inventory.transfer',
        'purchases.view',
        'purchases.create',
        'customers.view',
        'customers.create',
        'suppliers.view',
        'stores.view',
        'franchise.view',
        'users.view',
        'roles.view',
        'audit.view',
        'settings.view'
      ],
      employee: [
        'dashboard.view',
        'invoices.create',
        'invoices.view',
        'invoices.print',
        'products.view',
        'inventory.view',
        'purchases.view',
        'purchases.create',
        'customers.view',
        'customers.create',
        'suppliers.view',
        'scanner.use'
      ],
      auditor: [
        'dashboard.view',
        'invoices.view',
        'invoices.print',
        'products.view',
        'inventory.view',
        'purchases.view',
        'audit.view'
      ]
    };
    mockUsers = [
      {
        id: 'usr-employee',
        name: 'Nithin Yadav',
        username: 'nithin',
        role: 'Employee',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        permissionGrants: [],
        permissionDenies: [],
        status: 'active',
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

    await page.route('**/api/v1/role-permissions', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMatrix)
        });
      }

      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        mockMatrix = body.permissions || body;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Role permissions matrix updated successfully' })
        });
      }

      route.continue();
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active' }])
      });
    });

    await page.route('**/api/v1/users/*/effective-permissions', async (route) => {
      const id = route.request().url().split('/users/')[1].split('/')[0];
      const user = mockUsers.find((u) => u.id === id)!;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          userId: id,
          category: user.category,
          rolePermissions: mockMatrix.employee,
          permissionGrants: user.permissionGrants,
          permissionDenies: user.permissionDenies,
          effectivePermissions: [...mockMatrix.employee, ...user.permissionGrants].filter((p) => !user.permissionDenies.includes(p))
        })
      });
    });

    await page.route('**/api/v1/users/*/permissions', async (route) => {
      const id = route.request().url().split('/users/')[1].split('/')[0];
      const body = JSON.parse(route.request().postData() || '{}');
      const idx = mockUsers.findIndex((u) => u.id === id);
      mockUsers[idx] = {
        ...mockUsers[idx],
        permissionGrants: body.permissionGrants || [],
        permissionDenies: body.permissionDenies || []
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: mockUsers[idx] })
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
        const idx = mockUsers.findIndex((u) => u.id === body.id);
        mockUsers[idx] = { ...mockUsers[idx], ...body };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: mockUsers[idx] })
        });
      }
      route.continue();
    });
  });

  test('1. RBAC Permissions Matrix Lifecycle: Inspect Matrix, Switch Role Tabs, Modify Permissions & Persist', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Permissions
    await page.goto('/permissions');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Role-Based Access Control (RBAC) Matrix' })
    ).toBeVisible();

    await expect(page.getByText('Super Admin Master Bypass Policy')).toBeVisible();

    // 2. Switch to Employee / Cashier role tab
    await page.getByRole('button', { name: /employee \/ cashier/i }).click();

    // 3. Toggle a permission
    const scannerPerm = page.locator('label').filter({ hasText: 'Use Hardware & Camera Barcode Scanner' });
    await expect(scannerPerm).toBeVisible();
    await scannerPerm.click();

    // Verify Save button enabled
    const saveBtn = page.getByRole('button', { name: /save rbac matrix/i });
    await expect(saveBtn).toBeEnabled();

    // 4. Save Matrix
    await saveBtn.click();
    await page.waitForLoadState('networkidle');

    // Button should now be disabled because there are no unsaved changes
    await expect(saveBtn).toBeDisabled();
  });

  test('2. Mobile Responsive Viewport (430x932 & 390x844) has zero horizontal overflow', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/permissions');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Role-Based Access Control (RBAC) Matrix' })
    ).toBeVisible();

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

  test('3. User-specific overrides are edited separately from role templates', async ({ page }) => {
    let roleTemplateSaveCount = 0;
    let userOverrideSaveCount = 0;

    await page.route('**/api/v1/role-permissions', async (route) => {
      if (route.request().method() === 'POST') roleTemplateSaveCount++;
      route.fallback();
    });

    await page.route('**/api/v1/users/*/permissions', async (route) => {
      if (route.request().method() === 'POST') userOverrideSaveCount++;
      route.fallback();
    });

    await page.goto('/permissions');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /users/i }).click();
    await page.getByRole('button', { name: /nithin yadav/i }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await drawer.getByRole('combobox').first().selectOption('admin');
    await drawer.getByRole('button', { name: /^grant$/i }).first().click();
    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'POST' &&
        /\/api\/v1\/users\/[^/]+\/permissions$/.test(new URL(response.url()).pathname)
      ),
      drawer.getByRole('button', { name: /save changes/i }).click()
    ]);

    expect(userOverrideSaveCount).toBe(1);
    expect(roleTemplateSaveCount).toBe(0);
  });
});
