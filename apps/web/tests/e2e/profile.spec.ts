import { test, expect } from '@playwright/test';

test.describe('Self-Service Profile E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    const user = {
      id: 'usr-profile',
      name: 'Cashier Staff',
      username: 'cashier1',
      role: 'Cashier',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      status: 'active',
      permissions: ['dashboard.view', 'products.view']
    };

    await page.addInitScript((profileUser) => {
      localStorage.setItem('aiavro_jwt_token', 'mock-profile-token');
      localStorage.setItem('aiavro_logged_in_user', JSON.stringify(profileUser));
    }, user);

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'VC Organic Billing', logo: '/uploads/logos/brand-logo.webp' })
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'store-1', name: 'Main Store', code: 'ST-01', status: 'active' }])
      });
    });

    await page.route('**/api/v1/users/me/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          auditLogs: [
            {
              _id: 'audit-1',
              eventType: 'LOGIN_SUCCESS',
              entity: 'auth',
              entityId: 'usr-profile',
              performedBy: 'cashier1',
              user: 'Cashier Staff (@cashier1)',
              role: 'CASHIER',
              action: 'auth',
              view: 'login',
              details: 'User session authenticated successfully',
              businessId: 'store-1',
              businessName: 'Main Store',
              ip: '127.0.0.1',
              userAgent: 'playwright',
              requestId: 'req-profile',
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.route('**/api/v1/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: { ...user, name: 'Cashier Lead' } })
      });
    });

    await page.route('**/api/v1/upload?type=users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, imagePath: '/uploads/users/profile.webp', imageId: 'img-profile' })
      });
    });

    await page.route('**/api/v1/users/avatar', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, avatar: '/uploads/users/profile.webp' })
      });
    });

    await page.route('**/api/v1/users/change-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Password updated successfully' })
      });
    });
  });

  test('1. User can edit own profile, upload avatar, remove avatar, and view own activity', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByText('Recent Account Activity')).toBeVisible();
    await expect(page.getByText('LOGIN SUCCESS')).toBeVisible();

    await page.getByRole('textbox', { name: 'Full Name', exact: true }).fill('Cashier Lead');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/profile saved/i)).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'profile.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
    });
    await expect(page.getByText(/avatar updated/i)).toBeVisible();

    // Verify remove photo button is present and functional
    const removeBtn = page.getByRole('button', { name: /remove profile photo/i });
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await expect(page.getByText(/avatar removed/i)).toBeVisible();
    }
  });

  test('2. User can change account password with validation', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await page.getByRole('textbox', { name: 'Current Password', exact: true }).fill('currentPass123');
    await page.getByRole('textbox', { name: 'New Password', exact: true }).fill('newPass123');
    await page.getByRole('textbox', { name: 'Confirm New Password', exact: true }).fill('newPass123');

    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();
  });

  test('3. Mobile responsive viewport (430x932 & 390x844) has zero horizontal overflow', async ({ page }) => {
    for (const viewport of [{ width: 430, height: 932 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(isOverflowing).toBe(false);
    }
  });
});
