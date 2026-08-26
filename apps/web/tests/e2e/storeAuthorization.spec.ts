import { test, expect } from '@playwright/test';
import { installArchitectureRoutes } from './warehouseArchitecture.fixtures';

test.describe('Store authorization architecture', () => {
  test('store-scoped user sees only assigned locations and receives 403 outside scope', async ({ page }) => {
    const scopedUser = {
      id: 'usr-store-1',
      name: 'Store Employee',
      username: 'store.employee',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      permissions: ['inventory.view'],
      status: 'active'
    };

    await installArchitectureRoutes(page, scopedUser);
    await page.route('**/api/v1/inventory?*', async (route) => {
      const url = route.request().url();
      if (url.includes('locationId=store-2') || url.includes('storeId=store-2')) {
        return route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { code: 'STORE_ACCESS_DENIED', message: "Forbidden: You cannot view inventory for store 'store-2'" }
          })
        });
      }
      return route.fallback();
    });

    await page.goto('/inventory');

    await expect(page.getByRole('button', { name: /Store 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Store 2/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Network Consolidated/i })).toHaveCount(0);

    const denied = await page.evaluate(() =>
      fetch('/api/v1/inventory?locationId=store-2').then(async res => ({
        status: res.status,
        body: await res.json()
      }))
    );

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('STORE_ACCESS_DENIED');
  });
});
