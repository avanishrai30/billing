import { test, expect } from '@playwright/test';

const mockStores = [
  {
    id: 'store-1',
    name: 'Mumbai Flagship',
    code: 'ST-MUM',
    subtitle: 'Pure Farm Organics',
    gstin: '27AAAAA0000A1Z5',
    phone: '+91 98765 43210',
    email: 'mumbai@vcorganics.com',
    upiId: 'vcorganics@icici',
    address: 'Shop 4, Market Yard, Pune',
    logo: '/uploads/logos/brand-logo.webp',
    invoicePrefix: 'VC-MUM-',
    currency: 'INR',
    isActive: true,
    status: 'active'
  },
  {
    id: 'store-2',
    name: 'Thane Outlet',
    code: 'ST-THN',
    subtitle: 'Organic Groceries',
    gstin: '27BBBBB0000B1Z5',
    phone: '+91 98765 43211',
    email: 'thane@vcorganics.com',
    upiId: 'vcthane@icici',
    address: 'Shop 12, Gokhale Rd, Thane',
    logo: '/uploads/logos/brand-logo.webp',
    invoicePrefix: 'VC-THN-',
    currency: 'INR',
    isActive: true,
    status: 'active'
  }
];

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 25000,
    netProfit: 7500,
    totalPurchases: 12000,
    franchiseEarnings: 10500,
    stockAssetValuationCost: 45000,
    stockAssetValuationRetail: 70000,
    totalProducts: 10,
    ownProducts: 8,
    externalProducts: 2,
    lowStockCount: 1,
    outOfStockCount: 0,
    categoriesCount: 3,
    brandsCount: 2,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 60,
    purchaseCount: 18
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'all'
};

test.describe('Phase 16B Settings & Configuration E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
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
        body: JSON.stringify({
          title: 'VC Organic Billing',
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

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        const target = mockStores.find((s) => s.id === payload.id);
        if (target) Object.assign(target, payload);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, store: payload })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });

    await page.route('**/api/v1/settings', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Settings saved successfully' })
        });
      }
    });

    await page.route('**/api/v1/upload*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          imagePath: '/uploads/logos/brand-logo-uploaded.webp',
          imageId: 'img-123'
        })
      });
    });
  });

  test('1. Complete Settings Lifecycle: Branding Update, Store Profile, Preferences & Dashboard Stability', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Navigate to Settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Settings & Configuration' })).toBeVisible();
    await expect(page.getByText('Live Configuration')).toBeVisible();

    // 2. Inspect Branding Settings
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveValue('VC Organic Billing');

    // Change title and save
    await titleInput.fill('VC Organics Enterprise Billing');
    const saveBrandingBtn = page.getByRole('button', { name: /save branding settings/i });
    await expect(saveBrandingBtn).toBeEnabled();
    await saveBrandingBtn.click();

    await expect(page.getByText('Portal branding updated successfully!')).toBeVisible();

    // 3. Switch to Store & Business Profile Tab
    await page.getByRole('button', { name: /store & business profile/i }).click();

    await expect(page.getByText('Store & Business Billing Profile')).toBeVisible();
    const storeNameInput = page.locator('input[name="name"]');
    await expect(storeNameInput).toHaveValue('Mumbai Flagship');

    // Update store details and save
    await storeNameInput.fill('Mumbai Flagship Mega Store');
    const saveStoreBtn = page.getByRole('button', { name: /save business profile/i });
    await expect(saveStoreBtn).toBeEnabled();
    await saveStoreBtn.click();

    await expect(page.getByText(/store profile for 'mumbai flagship mega store' saved successfully!/i)).toBeVisible();

    // 4. Switch to Workstation Preferences Tab
    await page.getByRole('button', { name: /workstation preferences/i }).click();

    await expect(page.getByText('Display & Client Preferences')).toBeVisible();
    const checkbox = page.locator('#pref-product-images');
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(page.getByText('Preference Saved')).toBeVisible();

    // Verify localStorage value
    const prefVal = await page.evaluate(() => localStorage.getItem('aiavro_pref_show_product_images'));
    expect(prefVal).toBe('false');

    // 5. Return to Dashboard and confirm stability
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Restricted User Isolation: Cashier has read-only indications', async ({ page }) => {
    // Override user with Cashier
    await page.addInitScript(() => {
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-2',
          name: 'Cashier Staff',
          username: 'cashier',
          role: 'CASHIER',
          category: 'cashier',
          assignedStoreId: 'store-1',
          status: 'active'
        })
      );
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Settings & Configuration' })).toBeVisible();
    await expect(page.getByText(/read-only mode/i)).toBeVisible();

    // Switch to business profile
    await page.getByRole('button', { name: /store & business profile/i }).click();
    await expect(page.getByText(/read-only mode/i)).toBeVisible();
  });

  test('3. Mobile Responsive Viewport (430x932 & 390x844) has zero horizontal overflow', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Settings & Configuration' })).toBeVisible();

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Test 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
