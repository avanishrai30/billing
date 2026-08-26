import { test, expect } from '@playwright/test';

const mockStores = [
  { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active', isHub: false, employeeCount: 2 },
  { id: 'store-2', name: 'Thane Central', code: 'ST-THN', status: 'active', isHub: true, employeeCount: 1 },
  { id: 'store-3', name: 'Pune Outlet', code: 'ST-PUN', status: 'active', isHub: false, employeeCount: 0 }
];

const mockStoreEmployeesStore1 = [
  { id: 'usr-1', name: 'Cashier One', username: 'cashier.mumbai', role: 'Cashier', category: 'employee', assignedStoreId: 'store-1', assignedStores: ['store-1'], status: 'active' },
  { id: 'usr-2', name: 'Area Manager', username: 'mgr.west', role: 'Store Manager', category: 'employee', assignedStoreId: 'store-1', assignedStores: ['store-1', 'store-2'], status: 'active' }
];

test.describe('Store Scoping & Multi-Employee Store Assignment E2E Suite', () => {
  test('1. Single-store employee is strictly locked to assigned store without All Stores option', async ({ page }) => {
    const singleStoreUser = {
      id: 'usr-1',
      username: 'cashier.mumbai',
      name: 'Cashier One',
      role: 'Cashier Staff',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      permissions: ['dashboard.view', 'pos.access', 'invoices.view']
    };

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    }, singleStoreUser);

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify') || url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: singleStoreUser }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: singleStoreUser.permissions }) });
      }

      if (url.includes('/api/v1/public/settings') || url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStores) });
      }

      if (url.includes('/api/v1/dashboard/metrics')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            metrics: { totalSales: 5000, netProfit: 1500, stockAssetValuationCost: 20000 },
            activeStoreId: 'store-1'
          })
        });
      }

      return route.continue();
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify Locked indicator in Topbar
    const topbar = page.locator('header');
    await expect(topbar).toBeVisible();
    await expect(topbar).toContainText('Mumbai Flagship');
    await expect(topbar).toContainText('Locked');

    // Ensure "All Stores" select dropdown is NOT present
    const storeSelect = topbar.locator('select[aria-label="Select active store outlet"]');
    await expect(storeSelect).toHaveCount(0);
  });

  test('2. Multi-store employee can switch between assigned stores but never sees All Stores', async ({ page }) => {
    const multiStoreUser = {
      id: 'usr-2',
      username: 'mgr.west',
      name: 'Area Manager',
      role: 'Area Supervisor',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1', 'store-2'],
      permissions: ['dashboard.view', 'pos.access', 'invoices.view', 'stores.view']
    };

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    }, multiStoreUser);

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify') || url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: multiStoreUser }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: multiStoreUser.permissions }) });
      }

      if (url.includes('/api/v1/public/settings') || url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockStores) });
      }

      if (url.includes('/api/v1/dashboard/metrics')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            metrics: { totalSales: 8000, netProfit: 2400 },
            activeStoreId: 'store-1'
          })
        });
      }

      return route.continue();
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const topbar = page.locator('header');
    const storeSelect = topbar.locator('select[aria-label="Select active store outlet"]');
    await expect(storeSelect).toBeVisible();

    // Verify option values in select dropdown
    const options = storeSelect.locator('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText('Mumbai Flagship');
    await expect(options.nth(1)).toContainText('Thane Central');

    // Verify "All Stores" is NOT in options
    const allStoresOption = storeSelect.locator('option[value="all"]');
    await expect(allStoresOption).toHaveCount(0);

    // Switch store to Thane Central
    await storeSelect.selectOption('store-2');
    await expect(storeSelect).toHaveValue('store-2');
  });

  test('3. Super Admin can manage store team drawer and view assigned employees', async ({ page }) => {
    const superAdmin = {
      id: 'usr-super',
      username: 'admin',
      name: 'Super Administrator',
      role: 'Enterprise Owner',
      category: 'super admin',
      assignedStoreId: 'all',
      assignedStores: ['all'],
      permissions: ['*']
    };

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    }, superAdmin);

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify') || url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: superAdmin }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: ['*'] }) });
      }

      if (url.includes('/api/v1/public/settings') || url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores/summary')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ totalStores: 3, activeStoresCount: 3, inactiveStoresCount: 0, hubStoresCount: 1 })
        });
      }

      if (url.includes('/api/v1/stores/store-1/employees')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, storeId: 'store-1', employees: mockStoreEmployeesStore1 })
        });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockStores)
        });
      }

      if (url.includes('/api/v1/businesses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'biz-1', name: 'AIAVRO Enterprise Ltd' }])
        });
      }

      if (url.includes('/api/v1/users')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockStoreEmployeesStore1)
        });
      }

      return route.continue();
    });

    await page.goto('/stores');
    await page.waitForLoadState('domcontentloaded');

    // Click on assigned team count button for Mumbai Flagship
    const teamBtn = page.getByRole('button', { name: /2 employees/i }).first();
    await expect(teamBtn).toBeVisible();
    await teamBtn.click();

    // Verify StoreTeamDrawer opens
    await expect(page.getByText('Mumbai Flagship — Team Members')).toBeVisible();
    await expect(page.getByText('Cashier One')).toBeVisible();
    await expect(page.getByText('@cashier.mumbai')).toBeVisible();
    await expect(page.getByText('Area Manager')).toBeVisible();
  });
});
