import { test, expect } from '@playwright/test';

const mockUser = {
  id: 'usr-editorial-1',
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

test.describe('Phase 24 login editorial composition', () => {
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
          token: 'mock-editorial-token',
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

  test('desktop renders botanical split with the editorial glass login surface', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const shell = page.getByTestId('login-editorial-shell');
    const visualField = page.getByTestId('login-editorial-visual-field');
    const panel = page.getByTestId('login-editorial-panel');

    await expect(shell).toBeVisible();
    await expect(visualField).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('login-metamorphic-background')).toBeVisible();
    await expect(page.getByTestId('metamorphic-shader-canvas')).toBeVisible();
    await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /show password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in to terminal/i })).toBeVisible();

    const visualBox = await visualField.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(visualBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThan(visualBox!.x + visualBox!.width);
    expect(panelBox!.width).toBeGreaterThanOrEqual(420);

    const panelStyles = await panel.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const webkitStyles = styles as CSSStyleDeclaration & { webkitBackdropFilter?: string };
      return {
        backgroundColor: styles.backgroundColor,
        backdropFilter: styles.backdropFilter || webkitStyles.webkitBackdropFilter
      };
    });
    expect(panelStyles.backgroundColor).toMatch(/rgba|\/\s*0\./);
    expect(panelStyles.backdropFilter).toContain('blur');

    const headings = await page.getByRole('heading', { level: 1 }).allTextContents();
    expect(headings).toEqual(["VC ORGANIC'S"]);
  });

  test('mobile stacks botanical visual region before the login form without overflow', async ({
    page
  }) => {
    for (const viewport of [
      { width: 430, height: 932 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const visualBox = await page.getByTestId('login-editorial-visual-field').boundingBox();
      const panelBox = await page.getByTestId('login-editorial-panel').boundingBox();
      expect(visualBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.y).toBeGreaterThan(visualBox!.y);

      await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in to terminal/i })).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });

  test('production username/password submit reaches dashboard and removes login background', async ({
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
    await expect(page.getByTestId('login-metamorphic-background')).toHaveCount(0);
  });
});
