import { test, expect } from '@playwright/test';

let mockStores = [
  { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active', isHub: false, employeeCount: 2 },
  { id: 'store-2', name: 'Thane Regional Hub', code: 'ST-THN', status: 'active', isHub: true, hubPriority: 10, employeeCount: 4 }
];

test.describe('Distribution Hub Operations & Designation E2E Suite', () => {
  test('1. Hub stores display Distribution Hub badge and Super Admin can toggle Hub status', async ({ page }) => {
    const superAdmin = {
      id: 'usr-super',
      username: 'admin',
      name: 'Super Administrator',
      role: 'Enterprise Owner',
      category: 'super admin',
      assignedStoreId: 'all',
      assignedStores: ['all'],
      permissions: ['*']
    };

    let hubPromoteCalled = false;

    await page.addInitScript((userData) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    }, superAdmin);

    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/api/v1/auth/verify') || url.includes('/api/v1/auth/me') || url.includes('/api/v1/users/me')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: superAdmin }) });
      }

      if (url.includes('/api/v1/rbac/me/permissions')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: ['*'] }) });
      }

      if (url.includes('/api/v1/settings/public')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, settings: {} }) });
      }

      if (url.includes('/api/v1/stores/summary')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalStores: 2,
            activeStoresCount: 2,
            inactiveStoresCount: 0,
            hubStoresCount: 1
          })
        });
      }

      if (url.includes('/api/v1/stores/store-1/hub') && route.request().method() === 'POST') {
        hubPromoteCalled = true;
        mockStores = [
          { ...mockStores[0], isHub: true, hubPriority: 5 },
          mockStores[1]
        ];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, store: mockStores[0] })
        });
      }

      if (url.includes('/api/v1/stores')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockStores)
        });
      }

      if (url.includes('/api/v1/businesses')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'biz-1', name: 'AIAVRO Enterprise Ltd' }])
        });
      }

      return route.continue();
    });

    await page.goto('/stores');
    await page.waitForLoadState('domcontentloaded');

    // Verify Distribution Hub badge is displayed for Thane Regional Hub in table
    const table = page.locator('table');
    await expect(table.getByText('Thane Regional Hub')).toBeVisible();
    await expect(table.getByText('DISTRIBUTION HUB')).toBeVisible();

    // Verify Summary Cards show Distribution Hubs metric
    await expect(page.getByText('Distribution Hubs')).toBeVisible();

    // Click Hub promote button on Mumbai Flagship
    const promoteBtn = page.getByRole('button', { name: /set mumbai flagship as hub/i });
    await expect(promoteBtn).toBeVisible();
    await promoteBtn.click();

    // Verify promote API was invoked
    expect(hubPromoteCalled).toBe(true);
  });
});
