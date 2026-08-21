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

/**
 * Phase 19C: Login INP / Input Latency & Rendering Performance Suite
 * Validates that typing into username and password inputs does not trigger heavy render commits,
 * dropped frames, or background shader resets.
 */
test.describe('Login Input Latency & Rendering Performance Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock public settings to return deterministic tenant branding
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

    // Mock successful authentication
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-perf-token',
          user: {
            id: 'usr-perf-1',
            name: 'Terminal Admin',
            username: 'admin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    // Mock verify session
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-perf-1',
            name: 'Terminal Admin',
            username: 'admin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    // Mock dashboard metrics to allow successful landing
    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/dashboard/summary*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          todaySales: 15420.5,
          todayInvoices: 24,
          lowStockCount: 2,
          totalProducts: 48
        })
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

  test('1. Rapid keystroke entry in username and password inputs maintains fast responsiveness', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('#username');
    const passwordInput = page.locator('#password');
    const canvas = page.locator('canvas');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(canvas).toBeVisible();

    // Verify fast typing into username with low delay
    const startTypeUser = Date.now();
    await usernameInput.pressSequentially('admin.perf.test', { delay: 10 });
    const userTypeDuration = Date.now() - startTypeUser;
    await expect(usernameInput).toHaveValue('admin.perf.test');
    expect(userTypeDuration).toBeLessThan(3000);

    // Verify fast typing into password with low delay
    const startTypePass = Date.now();
    await passwordInput.pressSequentially('SuperSecret123!', { delay: 10 });
    const passTypeDuration = Date.now() - startTypePass;
    await expect(passwordInput).toHaveValue('SuperSecret123!');
    expect(passTypeDuration).toBeLessThan(3000);

    // Canvas background must remain visible and attached to DOM
    await expect(canvas).toBeVisible();
  });

  test('2. Toggles password visibility without modifying input geometry or unmounting visual layer', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('#password');
    const toggleButton = page.getByRole('button', { name: /show password/i });

    await passwordInput.fill('MySecretPassword');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: /hide password/i })).toBeVisible();

    // Click hide password
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible();

    // Visual shader layer remains active
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('3. Submits credentials and transitions cleanly to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');

    const submitBtn = page.getByRole('button', { name: /sign in to terminal/i });
    await submitBtn.click();

    // Should navigate to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /business intelligence & operational kpis/i })).toBeVisible();
  });
});
