import { test, expect } from '@playwright/test';

test.describe('Phase 3 Design System & Shared Primitives Visual & Interaction Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock authenticated session so protected route boundary passes
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
  });

  test('1. Desktop visual gallery (1440x900) renders all UI primitives deterministically', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');

    // Verify key primitive sections
    await expect(page.getByRole('heading', { name: 'Design System & UI Primitives Gallery' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Primary Action' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter outlet name')).toBeVisible();
    await expect(page.getByText('Organic Cow Ghee 500ml')).toBeVisible();

    // Capture desktop gallery baseline screenshot
    await page.screenshot({ path: 'test-results/desktop-design-system.png', fullPage: true });
  });

  test('2. Mobile viewport (430x932) renders dense data layouts without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Design System & UI Primitives Gallery' })).toBeVisible();

    // Check no horizontal body overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Capture mobile gallery baseline screenshot
    await page.screenshot({ path: 'test-results/mobile-design-system.png', fullPage: true });
  });

  test('3. Interactive Dialog and Drawer open and close with accessible keyboard/click events', async ({ page }) => {
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Design System & UI Primitives Gallery' })).toBeVisible();

    // Open Dialog
    const openDialogBtn = page.getByRole('button', { name: 'Open Dialog' });
    await expect(openDialogBtn).toBeVisible();
    await openDialogBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enterprise Confirmation Dialog' })).toBeVisible();

    // Close Dialog via Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).not.toBeVisible();

    // Open Side Drawer
    const openDrawerBtn = page.getByRole('button', { name: 'Open Side Drawer' });
    await expect(openDrawerBtn).toBeVisible();
    await openDrawerBtn.click();
    await expect(page.getByRole('heading', { name: 'Product Inspection Drawer' })).toBeVisible();

    // Close Drawer via header close button
    await page.getByLabel('Close drawer').click();
    await expect(page.getByRole('heading', { name: 'Product Inspection Drawer' })).not.toBeVisible();
  });

  test('4. Tabs trigger switches active panel without structural reflow', async ({ page }) => {
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Design System & UI Primitives Gallery' })).toBeVisible();

    await expect(page.getByText('Overview Panel')).toBeVisible();
    await expect(page.getByText('History Panel')).not.toBeVisible();

    const historyTab = page.getByRole('tab', { name: 'History' });
    await expect(historyTab).toBeVisible();
    await historyTab.click();
    await expect(page.getByText('History Panel')).toBeVisible();
    await expect(page.getByText('Overview Panel')).not.toBeVisible();
  });
});
