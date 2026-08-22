import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
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
};

test.describe('Root Route Redirect & Application Gateway Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept public settings endpoint
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

    // Intercept dashboard metrics
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    // Intercept stores
    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'store-1', name: 'Main Store', code: 'ST-01', status: 'active' }
        ])
      });
    });
  });

  test('1. Unauthenticated visitor to root / redirects immediately to /login with zero diagnostics flash', async ({
    page
  }) => {
    // Track console errors to ensure no hydration or redirect loop errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for redirect to complete
    await expect(page).toHaveURL(/.*login/);

    // Verify login portal UI is rendered
    await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Verify diagnostics UI is NOT present
    await expect(page.getByText('Infrastructure Diagnostics')).not.toBeVisible();
    await expect(page.getByText('Backend Gateway')).not.toBeVisible();

    // Verify zero uncaught errors
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('2. Authenticated user to root / redirects immediately to /dashboard with AppShell intact', async ({
    page
  }) => {
    // Inject mock session before navigation
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

    await page.goto('/');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify dashboard content is visible
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // Verify diagnostics UI is NOT present
    await expect(page.getByText('Infrastructure Diagnostics')).not.toBeVisible();
  });

  test('3. Direct visit to /login remains functional and renders WebGL portal', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
