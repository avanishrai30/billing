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

test.describe('Phase 23E.5 — Apple-Style Metamorphic Visual Login World Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept public settings endpoint to return VC ORGANIC'S
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

    await page.route('**/api/v1/settings/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            title: "VC ORGANIC'S",
            logo: '/uploads/logos/brand-logo.webp'
          }
        })
      });
    });

    // Intercept media assets
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

    // Intercept login auth mutation
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-valid-token',
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

  test('1. /login mounts metamorphic procedural WebGL background and translucent glass card', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Metamorphic background container & canvas must be present
    const backgroundWrapper = page.getByTestId('login-metamorphic-background');
    await expect(backgroundWrapper).toBeVisible();

    const canvas = page.getByTestId('metamorphic-shader-canvas');
    await expect(canvas).toBeVisible();

    // Translucent glass login container and inputs must be visible
    const brandHeading = page.getByRole('heading', { name: "VC ORGANIC'S" });
    await expect(brandHeading).toBeVisible();

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const submitBtn = page.getByRole('button', { name: /sign in/i });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('2. Form inputs, password visibility toggle, and authentication execution work seamlessly', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const toggleButton = page.getByRole('button', { name: /show password/i });

    // Test username input
    await usernameInput.fill('admin');
    await expect(usernameInput).toHaveValue('admin');

    // Test password input & toggle visibility
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveValue('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: /hide password/i })).toBeVisible();

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Submit form and verify navigation to dashboard
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('3. Mobile responsive viewport (430x932 & 390x844) renders with zero horizontal overflow', async ({
    page
  }) => {
    for (const viewport of [
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('4. Metamorphic login background is strictly isolated and does NOT appear on /dashboard', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Inject authenticated session
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

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard header must be visible
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // Login metamorphic background must NOT exist on dashboard
    const bgOnDashboard = page.getByTestId('login-metamorphic-background');
    await expect(bgOnDashboard).toHaveCount(0);
  });

  test('5. Capture visual baseline screenshots of new metamorphic login world', async ({ page }) => {
    // 1. Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/desktop-login-1440x900.png' });
    await page.screenshot({ path: 'test-results/desktop-login-metamorphic.png' });

    // 2. Laptop 1280x800
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/laptop-login-1280x800.png' });

    // 3. Mobile 430x932
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/mobile-login-430x932.png' });
    await page.screenshot({ path: 'test-results/mobile-login-metamorphic.png' });

    // 4. Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/mobile-login-390x844.png' });
  });
});
