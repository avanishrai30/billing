import { test, expect } from '@playwright/test';
import { installArchitectureRoutes } from './warehouseArchitecture.fixtures';

test.describe('Canonical stock transfer flow', () => {
  test('submits warehouse to store transfer with location IDs and transfer id', async ({ page }) => {
    await installArchitectureRoutes(page);

    await page.goto('/inventory');
    await page.getByRole('button', { name: /Transfer Stock/i }).click();

    await expect(page.getByRole('heading', { name: 'Inter-Store Stock Transfer' })).toBeVisible();
    await page.locator('input[type="number"]').fill('5');

    const transferRequest = page.waitForRequest(request =>
      request.url().includes('/api/v1/inventory/transfer') && request.method() === 'POST'
    );
    await page.getByRole('button', { name: /Confirm Transfer/i }).click();

    const request = await transferRequest;
    const payload = request.postDataJSON();
    expect(payload).toMatchObject({
      productId: 'prod-a2-ghee',
      fromLocationId: 'central-warehouse',
      toLocationId: 'store-1',
      quantity: 5
    });
    expect(payload.transferId).toMatch(/^trf-/);
  });
});
