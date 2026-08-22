import { expect, test, type Page } from '@playwright/test';

type AuthUser = {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  category: 'super admin' | 'admin' | 'employee' | 'auditor';
  assignedStoreId?: string;
  assignedStores?: string[];
  permissions?: string[];
  permissionGrants?: string[];
  permissionDenies?: string[];
  status: 'active' | 'suspended' | 'inactive';
  tokenVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};

type LoginResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
};

const env = {
  apiBaseUrl: process.env.REAL_AUTH_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8181',
  superUsername: process.env.REAL_AUTH_SUPER_ADMIN_USERNAME,
  superPassword: process.env.REAL_AUTH_SUPER_ADMIN_PASSWORD,
  targetUsername: process.env.REAL_AUTH_TARGET_USERNAME,
  targetPassword: process.env.REAL_AUTH_TARGET_PASSWORD
};

const envReady = Boolean(
  env.apiBaseUrl &&
  env.superUsername &&
  env.superPassword &&
  env.targetUsername &&
  env.targetPassword
);

async function apiRequest<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);

  const res = await fetch(`${env.apiBaseUrl.replace(/\/+$/, '')}${path}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`API ${options.method || 'GET'} ${path} failed with ${res.status}: ${JSON.stringify(data)}`);
  }

  return data as T;
}

async function apiLogin(username: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

function editableUserPayload(user: AuthUser, overrides: Partial<AuthUser> = {}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email || '',
    phone: user.phone || '',
    role: overrides.role ?? user.role ?? 'Employee',
    category: overrides.category ?? user.category,
    assignedStoreId: overrides.assignedStoreId ?? user.assignedStoreId ?? 'all',
    assignedStores: overrides.assignedStores ?? user.assignedStores ?? [user.assignedStoreId || 'all'],
    permissions: overrides.permissions ?? user.permissions ?? [],
    permissionGrants: overrides.permissionGrants ?? user.permissionGrants ?? [],
    permissionDenies: overrides.permissionDenies ?? user.permissionDenies ?? [],
    status: overrides.status ?? user.status
  };
}

async function saveUser(token: string, user: AuthUser, overrides: Partial<AuthUser>) {
  return apiRequest<{ success: boolean; user: AuthUser }>('/api/v1/users', {
    method: 'POST',
    token,
    body: JSON.stringify(editableUserPayload(user, overrides))
  });
}

async function saveOverrides(token: string, userId: string, permissionGrants: string[], permissionDenies: string[]) {
  return apiRequest<{
    success: boolean;
    user: AuthUser;
    permissions: {
      effectivePermissions: string[];
      permissionGrants: string[];
      permissionDenies: string[];
    };
  }>(`/api/v1/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'POST',
    token,
    body: JSON.stringify({ permissionGrants, permissionDenies })
  });
}

async function expectForbidden(path: string, token: string, body: unknown) {
  const res = await fetch(`${env.apiBaseUrl.replace(/\/+$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  expect(res.status).toBe(403);
}

async function loginInBrowser(page: Page, username: string, password: string) {
  const socketConnected = page.waitForEvent('console', {
    predicate: (message) => message.type() === 'log' && message.text().includes('[Realtime] Connected to backend gateway'),
    timeout: 30_000
  });

  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in to terminal/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await socketConnected;

  const token = await page.evaluate(() => localStorage.getItem('aiavro_jwt_token'));
  expect(token).toBeTruthy();
  expect(token?.startsWith('mock-')).toBe(false);
  expect(token?.startsWith('jwt-')).toBe(false);
  expect(token).not.toBe('test-token');
}

async function markShell(page: Page) {
  await expect(page.getByTestId('sidebar-container')).toBeVisible();
  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('main').first()).toBeVisible();

  const marker = `phase26-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await page.getByTestId('sidebar-container').evaluate((el, value) => el.setAttribute('data-phase26-marker', value), marker);
  await page.locator('header').first().evaluate((el, value) => el.setAttribute('data-phase26-marker', value), marker);
  await page.locator('main').first().evaluate((el, value) => el.setAttribute('data-phase26-marker', value), marker);
  return marker;
}

async function expectShellStillMounted(page: Page, marker: string) {
  await expect(page.getByTestId('sidebar-container')).toHaveAttribute('data-phase26-marker', marker);
  await expect(page.locator('header').first()).toHaveAttribute('data-phase26-marker', marker);
  await expect(page.locator('main').first()).toHaveAttribute('data-phase26-marker', marker);
}

async function waitForAccessToast(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Your access permissions were updated' }).last()).toBeVisible({
    timeout: 30_000
  });
}

async function changeRoleThroughUsersUi(page: Page, user: AuthUser, category: AuthUser['category']) {
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: /user accounts/i })).toBeVisible();
  await page.getByLabel(`Edit user ${user.name}`).click();
  await expect(page.getByRole('heading', { name: new RegExp(`Edit User: ${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') })).toBeVisible();
  await page.getByLabel('Role Assignment').selectOption(category);

  const saveResponse = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/users') && response.request().method() === 'POST' && response.status() === 200;
  });
  await page.getByRole('button', { name: /save changes/i }).click();
  const response = await saveResponse;
  const body = await response.json();

  expect(body.success).toBe(true);
  expect(body.user.category).toBe(category);
  await expect(page.getByRole('heading', { name: new RegExp(`Edit User: ${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') })).toHaveCount(0);
  return body.user as AuthUser;
}

async function expectBrowserCategory(page: Page, category: AuthUser['category']) {
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const raw = localStorage.getItem('aiavro_logged_in_user');
        return raw ? JSON.parse(raw).category : null;
      });
    }, { timeout: 30_000 })
    .toBe(category);
}

async function expectBrowserPermission(page: Page, permission: string, expected: boolean) {
  await expect
    .poll(async () => {
      return page.evaluate((permissionId) => {
        const raw = localStorage.getItem('aiavro_logged_in_user');
        if (!raw) return false;
        const user = JSON.parse(raw);
        return Array.isArray(user.permissions) && user.permissions.includes(permissionId);
      }, permission);
    }, { timeout: 30_000 })
    .toBe(expected);
}

async function expectAuditForTarget(token: string, targetUserId: string) {
  await expect
    .poll(async () => {
      const logs = await apiRequest<Array<{ entity?: string; entityId?: string; eventType?: string }>>(
        '/api/v1/audit-logs?limit=50',
        { token }
      );
      return logs.some((log) => log.entity === 'user' && log.entityId === targetUserId && log.eventType === 'user_updated');
    }, { timeout: 30_000 })
    .toBe(true);
}

test.describe('Phase 26.2 Real-Auth RBAC Realtime Authorization Harness', () => {
  test.skip(!envReady, 'Set REAL_AUTH_API_BASE_URL, REAL_AUTH_SUPER_ADMIN_USERNAME, REAL_AUTH_SUPER_ADMIN_PASSWORD, REAL_AUTH_TARGET_USERNAME, and REAL_AUTH_TARGET_PASSWORD to run real-auth realtime RBAC E2E.');

  test('role changes and user overrides propagate over real Socket.IO without shell remounts', async ({ browser }) => {
    const adminLogin = await apiLogin(env.superUsername!, env.superPassword!);
    const targetLogin = await apiLogin(env.targetUsername!, env.targetPassword!);
    const users = await apiRequest<AuthUser[]>('/api/v1/users', { token: adminLogin.token });
    const targetUser = users.find((user) => user.username === env.targetUsername || user.id === targetLogin.user.id);

    expect(targetUser, `Target user ${env.targetUsername} must exist in controlled test data`).toBeTruthy();
    expect(targetUser!.id).toBe(targetLogin.user.id);

    const original = { ...targetUser! };

    try {
      const reset = await saveUser(adminLogin.token, targetUser!, {
        role: 'Employee',
        category: 'employee',
        permissionGrants: [],
        permissionDenies: [],
        status: 'active'
      });
      await saveOverrides(adminLogin.token, targetUser!.id, [], []);
      expect(reset.user.category).toBe('employee');

      const targetContext = await browser.newContext();
      const adminContext = await browser.newContext();
      const targetPage = await targetContext.newPage();
      const adminPage = await adminContext.newPage();

      await loginInBrowser(targetPage, env.targetUsername!, env.targetPassword!);
      await expect(targetPage.getByRole('link', { name: /roles & access/i })).toHaveCount(0);
      await targetPage.goto('/permissions');
      await expect(targetPage.getByTestId('access-denied-state')).toBeVisible();
      await targetPage.goto('/dashboard');
      const shellMarker = await markShell(targetPage);

      await loginInBrowser(adminPage, env.superUsername!, env.superPassword!);

      const roleChangedUser = await changeRoleThroughUsersUi(adminPage, reset.user, 'admin');
      await expectAuditForTarget(adminLogin.token, targetUser!.id);
      await waitForAccessToast(targetPage);
      await expectBrowserCategory(targetPage, 'admin');
      await expectShellStillMounted(targetPage, shellMarker);
      await expect(targetPage.getByRole('link', { name: /roles & access/i })).toBeVisible();
      await targetPage.goto('/permissions');
      await expect(targetPage.getByRole('heading', { name: /roles & access/i })).toBeVisible();

      const reverseUser = await changeRoleThroughUsersUi(adminPage, roleChangedUser, 'employee');
      await waitForAccessToast(targetPage);
      await expectBrowserCategory(targetPage, 'employee');
      await expectShellStillMounted(targetPage, shellMarker);
      await expect(targetPage.getByRole('link', { name: /roles & access/i })).toHaveCount(0);
      await targetPage.goto('/permissions');
      await expect(targetPage.getByTestId('access-denied-state')).toBeVisible();

      const grant = await saveOverrides(adminLogin.token, reverseUser.id, ['inventory.adjust'], []);
      expect(grant.permissions.permissionGrants).toContain('inventory.adjust');
      expect(grant.permissions.effectivePermissions).toContain('inventory.adjust');
      await waitForAccessToast(targetPage);
      await expectBrowserPermission(targetPage, 'inventory.adjust', true);
      await targetPage.goto('/inventory');
      await expect(targetPage.getByRole('button', { name: /stock adjustment/i })).toBeVisible();
      await expectShellStillMounted(targetPage, shellMarker);

      const deny = await saveOverrides(adminLogin.token, targetUser!.id, [], ['inventory.adjust']);
      expect(deny.permissions.permissionDenies).toContain('inventory.adjust');
      expect(deny.permissions.effectivePermissions).not.toContain('inventory.adjust');
      await waitForAccessToast(targetPage);
      await expectBrowserPermission(targetPage, 'inventory.adjust', false);
      await expect(targetPage.getByRole('button', { name: /stock adjustment/i })).toHaveCount(0);
      await expectShellStillMounted(targetPage, shellMarker);

      const inherited = await saveOverrides(adminLogin.token, targetUser!.id, [], []);
      expect(inherited.permissions.permissionGrants).not.toContain('inventory.adjust');
      expect(inherited.permissions.permissionDenies).not.toContain('inventory.adjust');
      expect(inherited.permissions.effectivePermissions).not.toContain('inventory.adjust');
      await waitForAccessToast(targetPage);
      await expectBrowserPermission(targetPage, 'inventory.adjust', false);
      await expect(targetPage.getByRole('button', { name: /stock adjustment/i })).toHaveCount(0);

      const targetToken = await targetPage.evaluate(() => localStorage.getItem('aiavro_jwt_token'));
      expect(targetToken).toBeTruthy();
      await expectForbidden('/api/v1/users', targetToken!, editableUserPayload(inherited.user, { category: 'admin', role: 'Admin' }));
      await expectForbidden(`/api/v1/users/${encodeURIComponent(targetUser!.id)}/permissions`, targetToken!, {
        permissionGrants: ['roles.update'],
        permissionDenies: []
      });

      await targetContext.close();
      await adminContext.close();
    } finally {
      await saveUser(adminLogin.token, original, {
        role: original.role,
        category: original.category,
        assignedStoreId: original.assignedStoreId,
        assignedStores: original.assignedStores,
        permissions: original.permissions || [],
        permissionGrants: original.permissionGrants || [],
        permissionDenies: original.permissionDenies || [],
        status: original.status
      }).catch(() => undefined);
      await saveOverrides(adminLogin.token, original.id, original.permissionGrants || [], original.permissionDenies || []).catch(() => undefined);
    }
  });
});
