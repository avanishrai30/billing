import { test, expect } from '@playwright/test';
import { installArchitectureRoutes } from './warehouseArchitecture.fixtures';

test.describe('Warehouse-centric inventory architecture', () => {
  test('shows Product Master stock by physical warehouse and store locations', async ({ page }) => {
    await installArchitectureRoutes(page);

    await page.goto('/inventory');

    await expect(page.getByRole('heading', { name: 'Inventory Command Center' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Network Consolidated/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Central Warehouse/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Store 1/i })).toBeVisible();
    await expect(page.getByText('A2 Cow Ghee')).toBeVisible();
    await expect(page.getByText('AIA000002', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Product Master Missing')).toHaveCount(0);
  });
});
