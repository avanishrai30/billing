import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control & Direct Route Guards Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock public settings
    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: "VC ORGANIC'S",
          logo: '/uploads/logos/brand-logo.webp'
        })
      });
    });

    // Mock stores
    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'store-1', name: 'Main Store', code: 'ST-01', status: 'active' }
        ])
      });
    });

    // Mock dashboard metrics
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalSales: 10000,
            netProfit: 2500,
            totalPurchases: 5000,
            franchiseEarnings: 0,
            stockAssetValuationCost: 20000,
            stockAssetValuationRetail: 35000,
            totalProducts: 20,
            ownProducts: 15,
            externalProducts: 5,
            lowStockCount: 1,
            outOfStockCount: 0,
            categoriesCount: 3,
            brandsCount: 2,
            suppliersCount: 2,
            expiryWarningsCount: 0,
            invoiceCount: 30,
            purchaseCount: 5
          },
          lowStockWatchlist: [],
          recentInvoices: [],
          recentPurchases: [],
          activeStoreId: 'all'
        })
      });
    });
  });

  test('1. Super Admin has unrestricted access across administrative routes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-super-admin-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-super',
          name: 'Super Administrator',
          username: 'superadmin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active',
          permissions: ['*']
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
            id: 'usr-super',
            name: 'Super Administrator',
            username: 'superadmin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active',
            permissions: ['*']
          }
        })
      });
    });

    await page.route('**/api/v1/role-permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          admin: ['dashboard.view'],
          employee: ['invoices.create'],
          auditor: ['audit.view']
        })
      });
    });

    // Access /permissions directly
    await page.goto('/permissions');
    await expect(page.getByRole('heading', { name: /role-based access control/i })).toBeVisible();
    await expect(page.getByTestId('access-denied-state')).not.toBeVisible();
  });

  test('2. Cashier / Employee is restricted from /permissions with AccessDeniedState', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-employee-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-emp',
          name: 'Cashier Staff',
          username: 'cashier1',
          role: 'CASHIER',
          category: 'employee',
          assignedStoreId: 'store-1',
          status: 'active',
          permissions: [
            'dashboard.view',
            'invoices.create',
            'invoices.view',
            'products.view',
            'inventory.view',
            'customers.view'
          ]
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
            id: 'usr-emp',
            name: 'Cashier Staff',
            username: 'cashier1',
            role: 'CASHIER',
            category: 'employee',
            assignedStoreId: 'store-1',
            status: 'active',
            permissions: [
              'dashboard.view',
              'invoices.create',
              'invoices.view',
              'products.view',
              'inventory.view',
              'customers.view'
            ]
          }
        })
      });
    });

    // Try navigating to /permissions
    await page.goto('/permissions');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('Role Permissions Restricted')).toBeVisible();
    await expect(page.getByText('roles.view')).toBeVisible();

    // Try navigating to /audit
    await page.goto('/audit');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('Audit Trail Restricted')).toBeVisible();

    // Try navigating to /stores
    await page.goto('/stores');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('Outlets Management Restricted')).toBeVisible();
  });

  test('3. Auditor is allowed on /audit and /invoices but restricted from /pos and /settings', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-auditor-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-audit',
          name: 'Compliance Officer',
          username: 'auditor1',
          role: 'AUDITOR',
          category: 'auditor',
          assignedStoreId: 'all',
          status: 'active',
          permissions: [
            'dashboard.view',
            'products.view',
            'inventory.view',
            'purchases.view',
            'invoices.view',
            'audit.view'
          ]
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
            id: 'usr-audit',
            name: 'Compliance Officer',
            username: 'auditor1',
            role: 'AUDITOR',
            category: 'auditor',
            assignedStoreId: 'all',
            status: 'active',
            permissions: [
              'dashboard.view',
              'products.view',
              'inventory.view',
              'purchases.view',
              'invoices.view',
              'audit.view'
            ]
          }
        })
      });
    });

    await page.route('**/api/v1/audit/logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [],
          total: 0
        })
      });
    });

    // Access /audit -> Allowed
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: /security & immutable audit trail/i })).toBeVisible();
    await expect(page.getByTestId('access-denied-state')).not.toBeVisible();

    // Access /pos -> Restricted
    await page.goto('/pos');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('POS Terminal Restricted')).toBeVisible();

    // Access /settings -> Restricted
    await page.goto('/settings');
    await expect(page.getByTestId('access-denied-state')).toBeVisible();
    await expect(page.getByText('Settings & Configurations Restricted')).toBeVisible();
  });
});
