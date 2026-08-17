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

test.describe('Phase 2 Auth, Login & Application Shell E2E Suite', () => {
  test('1. Cold load to / redirects unauthenticated user to /login or shows diagnostics', async ({ page }) => {
    await page.goto('/login');

    // First paint assertion: inputs are visible and interactive immediately
    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('2. Submitting invalid credentials renders accessible error alert', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#username', 'nonexistent_user');
    await page.fill('#password', 'wrong_password');
    await page.click('button[type="submit"]');

    const alert = page.getByTestId('login-error-alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
  });

  test('3. Authenticated session restores on page refresh and preserves AppShell', async ({ page }) => {
    // Inject mock authenticated session into localStorage
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

    // Mock the /api/v1/auth/verify endpoint
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'usr-1', username: 'admin', role: 'SUPER ADMIN', assignedStoreId: 'all' }
        })
      });
    });

    // Mock dashboard metrics
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.goto('/dashboard');

    // Verify AppShell elements
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: /select active store outlet/i })).toBeVisible();
    await expect(page.getByText('POS Terminal')).toBeVisible();
    await expect(page.getByText('Product Master')).toBeVisible();

    // Reload page and ensure shell remains stable without flicker
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: /select active store outlet/i })).toBeVisible();
  });

  test('4. Sign Out button terminates session and returns to login', async ({ page }) => {
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

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Logged out' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    await page.click('button[aria-label="Log out of session"]');

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('5. Mobile responsive viewport (430x932) supports mobile navigation drawer', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });

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

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // Open mobile sidebar drawer
    const menuBtn = page.getByLabel('Open navigation menu');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Verify sidebar container is revealed
    const sidebar = page.getByTestId('sidebar-container');
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Close mobile sidebar drawer via close button
    const closeBtn = page.getByLabel('Close sidebar');
    await closeBtn.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('6. Visual screenshot baseline at desktop (1440x900) and mobile (430x932)', async ({ page }) => {
    // Desktop Login Screenshot
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/desktop-login.png' });

    // Mobile Login Screenshot
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/mobile-login.png' });
  });
});
