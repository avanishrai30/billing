import { test, expect } from '@playwright/test';

const mockUser = {
  id: 'usr-smoky-1',
  name: 'Super Admin',
  username: 'admin',
  role: 'SUPER ADMIN',
  category: 'super admin',
  assignedStoreId: 'all',
  status: 'active'
};

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

test.describe('Phase 24.2 login smoky composition', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-smoky-token',
          user: mockUser
        })
      });
    });

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: mockUser
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

  test('desktop renders the original smoky background with a centered white login card', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const shell = page.getByTestId('login-smoky-shell');
    const card = page.getByTestId('login-smoky-card');
    const canvas = page.locator('canvas');

    await expect(shell).toBeVisible();
    await expect(card).toBeVisible();
    await expect(canvas).toBeVisible();
    await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to terminal/i })).toBeVisible();

    await expect(page.getByTestId('login-editorial-shell')).toHaveCount(0);
    await expect(page.getByTestId('login-metamorphic-background')).toHaveCount(0);

    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeGreaterThanOrEqual(420);
    expect(cardBox!.width).toBeLessThanOrEqual(520);

    const cardStyles = await card.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const webkitStyles = styles as CSSStyleDeclaration & { webkitBackdropFilter?: string };
      return {
        backgroundColor: styles.backgroundColor,
        backdropFilter: styles.backdropFilter || webkitStyles.webkitBackdropFilter
      };
    });
    expect(cardStyles.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(['none', '']).toContain(cardStyles.backdropFilter);

    const headings = await page.getByRole('heading', { level: 1 }).allTextContents();
    expect(headings).toEqual(["VC ORGANIC'S"]);
  });

  test('mobile renders the full smoky login form without horizontal overflow', async ({ page }) => {
    for (const viewport of [
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('login-smoky-shell')).toBeVisible();
      await expect(page.getByTestId('login-smoky-card')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in to terminal/i })).toBeVisible();
      await expect(page.getByText('AIAVRO Billing OS • Multi-Outlet Gateway')).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('production username/password submit reaches dashboard and removes login visuals', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('secret123');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /sign in to terminal/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
    await expect(page.getByTestId('login-smoky-shell')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('captures smoky visual baselines at required desktop and mobile sizes', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900, name: 'desktop-login-smoky-1440x900.png' },
      { width: 1280, height: 800, name: 'laptop-login-smoky-1280x800.png' },
      { width: 430, height: 932, name: 'mobile-login-smoky-430x932.png' },
      { width: 390, height: 844, name: 'mobile-login-smoky-390x844.png' }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('login-smoky-card')).toBeVisible();
      await page.screenshot({ path: `test-results/${viewport.name}` });
    }
  });
});
