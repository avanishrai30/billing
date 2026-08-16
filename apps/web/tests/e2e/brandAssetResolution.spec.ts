import { test, expect } from '@playwright/test';

test.describe('Public Brand Asset URL Resolution & Dynamic Tenant Identity E2E Suite', () => {
  const customBrandSettings = {
    title: 'VC Organic Enterprise',
    logo: '/uploads/logos/vc-organics-logo-main.webp'
  };

  test.beforeEach(async ({ page }) => {
    // Mock image media response so img elements do not trigger onError
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
  });

  test('1. Login page renders dynamically configured logo with absolute API origin URL', async ({
    page
  }) => {
    // Intercept public settings to return relative logo path
    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(customBrandSettings)
      });
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Title assertion
    await expect(page.getByRole('heading', { name: 'VC Organic Enterprise' })).toBeVisible();

    // Image logo assertion: src must contain the API origin and relative uploads path
    const logoImg = page.locator('img[alt="VC Organic Enterprise"]');
    await expect(logoImg).toBeVisible();

    const src = await logoImg.getAttribute('src');
    expect(src).not.toBeNull();
    // Must be an absolute URL starting with http:// or https:// (never a bare relative path)
    expect(src).toMatch(/^https?:\/\/.+\/uploads\/logos\/vc-organics-logo-main\.webp$/);
    // Must not be resolving against a static relative path on the frontend origin without port or protocol
    expect(src).not.toBe('/uploads/logos/vc-organics-logo-main.webp');
  });

  test('2. Authenticated AppShell Sidebar renders normalized dynamic logo and tenant name', async ({
    page
  }) => {
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
        body: JSON.stringify(customBrandSettings)
      });
    });

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          metrics: {
            totalSales: 0,
            netProfit: 0,
            totalPurchases: 0,
            franchiseEarnings: 0,
            stockAssetValuationCost: 0,
            stockAssetValuationRetail: 0,
            totalProducts: 0,
            ownProducts: 0,
            externalProducts: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            categoriesCount: 0,
            brandsCount: 1,
            suppliersCount: 0,
            expiryWarningsCount: 0,
            invoiceCount: 0,
            purchaseCount: 0
          },
          lowStockWatchlist: [],
          recentInvoices: [],
          recentPurchases: [],
          activeStoreId: 'all'
        })
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Sidebar brand title
    const sidebar = page.getByTestId('sidebar-container');
    await expect(sidebar.getByText('VC Organic Enterprise')).toBeVisible();

    // Sidebar brand logo
    const sidebarLogo = sidebar.locator('img[alt="VC Organic Enterprise"]');
    await expect(sidebarLogo).toBeVisible();

    const sidebarLogoSrc = await sidebarLogo.getAttribute('src');
    expect(sidebarLogoSrc).toMatch(/^https?:\/\/.+\/uploads\/logos\/vc-organics-logo-main\.webp$/);

    // Refresh and ensure branding persists
    await page.reload();
    await expect(sidebar.getByText('VC Organic Enterprise')).toBeVisible();
    await expect(sidebarLogo).toBeVisible();
  });
});
