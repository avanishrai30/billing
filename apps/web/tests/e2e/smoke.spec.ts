import { test, expect } from '@playwright/test';

test.describe('Phase 1 Frontend Infrastructure Smoke Suite', () => {
  test('1. Diagnostics page loads and shows infrastructure cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('AIAVRO Billing OS');
    await expect(page.getByText('Backend Gateway')).toBeVisible();
    await expect(page.getByText('Public Settings API')).toBeVisible();
    await expect(page.getByText('Auth Foundation')).toBeVisible();
    await expect(page.getByText('Realtime Gateway')).toBeVisible();
  });

  test('2. Unauthenticated user accessing protected area is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByText('Sign In')).toBeVisible();
  });
});
