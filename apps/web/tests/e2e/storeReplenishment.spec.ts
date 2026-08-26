import { test, expect } from '@playwright/test';
import { architectureCommandCenterData, installArchitectureRoutes } from './warehouseArchitecture.fixtures';

test.describe('Store replenishment suggestions', () => {
  test('receives suggested transfers without automatically moving stock', async ({ page }) => {
    await installArchitectureRoutes(page);

    await page.goto('/inventory');

    const response = await page.evaluate(() => fetch('/api/v1/inventory/command-center').then(res => res.json()));
    expect(response.summary.replenishmentRequiredCount).toBe(1);
    expect(response.networkBalances[0].replenishmentSuggestions).toEqual(
      architectureCommandCenterData.networkBalances[0].replenishmentSuggestions
    );

    await page.getByRole('button', { name: /Store 1/i }).click();
    await page.getByRole('button', { name: /Low Stock/i }).click();
    await expect(page.getByText('A2 Cow Ghee')).toBeVisible();
    await expect(page.getByText('Network Stock')).toBeVisible();
  });
});
