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

test.describe('Login Portal Branding & Presentation Suite', () => {
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

  test('1. Deterministic First Paint: Renders VC ORGANIC\'S without AIAVRO fallback flash', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to login
    await page.goto('/login');

    // Wait for the page load
    await page.waitForLoadState('networkidle');

    // Assert that the visible brand title is VC ORGANIC'S
    const brandHeading = page.getByRole('heading', { name: "VC ORGANIC'S" });
    await expect(brandHeading).toBeVisible();

    // Verify "AIAVRO Billing OS" text is NOT present as the tenant heading
    const allHeadings = await page.getByRole('heading', { level: 1 }).allTextContents();
    expect(allHeadings).not.toContain('AIAVRO Billing OS');

    // Verify logo src uses API origin normalization
    const logoImg = page.locator('img[alt="VC ORGANIC\'S"]');
    await expect(logoImg).toBeVisible();
    const logoSrc = await logoImg.getAttribute('src');
    expect(logoSrc).toContain('/uploads/logos/brand-logo.webp');

    // Verify interactive Smokey WebGL background canvas is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('2. Complete Login Execution: Submits credentials and navigates via AuthProvider', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'secret123');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirection to /dashboard and rendered KPIs
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('3. Responsive Mobile Viewport (430x932) has zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: "VC ORGANIC'S" })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your username/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
