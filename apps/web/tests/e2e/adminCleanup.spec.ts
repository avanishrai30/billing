import { test, expect } from '@playwright/test';

const mockSummary = {
  invoices: { total: 42, active: 30, archived: 8, voided: 4, potentialCleanup: 12 },
  purchases: { total: 18, active: 14, archived: 2, voided: 2, potentialCleanup: 4 },
  products: { total: 120, active: 110, archived: 10, potentialCleanup: 10 },
  inventory: { totalRecords: 120, zeroStock: 15, totalLedgerEntries: 850, potentialCleanup: 15 },
  lastOperation: null
};

const mockInvoices = [
  { id: 'inv-101', invoiceNumber: 'INV-2026-001', date: '2026-08-20T10:00:00Z', customerName: 'Ravi Verma', locationId: 'loc-1', itemCount: 3, total: 1850, status: 'POSTED' },
  { id: 'inv-102', invoiceNumber: 'INV-2026-002', date: '2026-08-21T11:30:00Z', customerName: 'Walk-in Customer', locationId: 'loc-1', itemCount: 1, total: 450, status: 'POSTED' },
  { id: 'inv-103', invoiceNumber: 'INV-2026-003', date: '2026-08-22T14:15:00Z', customerName: 'Ananya Sharma', locationId: 'loc-2', itemCount: 2, total: 980, status: 'VOIDED' }
];

const mockOperations = [
  {
    operationId: 'op-20260824-001',
    domain: 'invoices',
    action: 'archive',
    status: 'COMPLETED',
    actorUserId: 'usr-1',
    actorUsername: 'admin',
    reversible: true,
    rolledBack: false,
    totalTargeted: 2,
    successCount: 2,
    failureCount: 0,
    stockReversalUnits: 0,
    financialImpact: 0,
    affectedRecordIds: ['inv-101', 'inv-102'],
    createdAt: '2026-08-24T08:30:00Z'
  }
];

test.describe('Phase 32 — Super Admin Cleanup & Maintenance Center E2E Suite', () => {
  test('1. Canonical Super Admin accesses Cleanup Center, reviews domain tabs, previews dry-run and executes operation', async ({ page }) => {
    // Inject Super Admin Session
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-superadmin-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-superadmin',
          name: 'Super Administrator',
          username: 'superadmin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active',
          permissions: ['*']
        })
      );
    });

    // Mock auth & settings
    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'usr-superadmin',
            name: 'Super Administrator',
            username: 'superadmin',
            role: 'SUPER ADMIN',
            category: 'super admin',
            assignedStoreId: 'all',
            status: 'active'
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S", logo: '/uploads/logos/vc-logo.webp' })
      });
    });

    // Mock Cleanup endpoints
    await page.route('**/api/v1/admin/cleanup/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, summary: mockSummary })
      });
    });

    await page.route('**/api/v1/admin/cleanup/operations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, operations: mockOperations, total: 1 })
      });
    });

    await page.route('**/api/v1/admin/cleanup/*/query', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          records: mockInvoices,
          pagination: { page: 1, limit: 25, total: 3, totalPages: 1 }
        })
      });
    });

    await page.route('**/api/v1/admin/cleanup/*/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          preview: {
            domain: 'invoices',
            action: 'void',
            totalSelected: 1,
            eligibleCount: 1,
            blockedCount: 0,
            stockReversalUnits: 3,
            financialImpact: 1850,
            reversible: true,
            eligibleRecords: [
              { id: 'inv-101', label: 'Invoice #INV-2026-001', action: 'VOID_AND_REVERT_STOCK', details: 'Restore +3 units' }
            ],
            blockedRecords: [],
            warnings: [],
            previewToken: 'prev-mock-token-1'
          }
        })
      });
    });

    await page.route('**/api/v1/admin/cleanup/*/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            operationId: 'op-exec-999',
            processedCount: 1,
            reversible: true,
            completedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.goto('/admin/cleanup');

    // 1. Verify Header & Super Admin Badge
    await expect(page.getByRole('heading', { name: 'Cleanup & Maintenance Center' })).toBeVisible();
    await expect(page.getByText('SUPER ADMIN ONLY')).toBeVisible();

    // 2. Verify Domain Navigation Tabs
    await expect(page.getByText('Invoices & Sales')).toBeVisible();
    await expect(page.getByText('Procurement')).toBeVisible();
    await expect(page.getByText('Products Master')).toBeVisible();
    await expect(page.getByText('Inventory Stock')).toBeVisible();

    // 3. Verify Table Records
    await expect(page.getByText('INV-2026-001')).toBeVisible();
    await expect(page.getByText('Ravi Verma')).toBeVisible();
    await expect(page.getByText('₹1,850')).toBeVisible();

    // 4. Select a record
    const checkbox = page.locator('tbody tr input[type="checkbox"]').first();
    await checkbox.check();
    await expect(page.getByText('1 Selected')).toBeVisible();

    // 5. Trigger Dry-run Preview (Void & Revert Stock)
    const voidBtn = page.getByRole('button', { name: /void & revert stock/i });
    await expect(voidBtn).toBeEnabled();
    await voidBtn.click();

    // 6. Verify Dry-Run Preview Modal
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Maintenance Cleanup Dry-Run Preview')).toBeVisible();
    await expect(modal.getByText('Eligible to Proceed')).toBeVisible();
    await expect(modal.getByText('Simulated Ledger Adjustments:')).toBeVisible();
    await expect(modal.getByText('+3 units')).toBeVisible();

    // 7. Confirm and Execute
    const confirmExecBtn = modal.getByRole('button', { name: /execute void/i });
    await confirmExecBtn.click();

    // 8. Verify Toast Notification
    await expect(page.getByText('Maintenance Executed')).toBeVisible();

    // 9. Inspect Operations History Drawer
    const historyBtn = page.getByRole('button', { name: /audit & operation history/i });
    await historyBtn.click();
    await expect(page.getByText('Maintenance Operations Audit Trail')).toBeVisible();
    await expect(page.getByText('op-20260824-001')).toBeVisible();
    await expect(page.getByRole('button', { name: /rollback operation/i })).toBeVisible();
  });

  test('2. Non-Super Admin user receives Access Denied', async ({ page }) => {
    // Inject Cashier/Employee Session
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-cashier-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-cashier',
          name: 'Regular Cashier',
          username: 'cashier',
          role: 'CASHIER',
          category: 'employee',
          assignedStoreId: 'loc-1',
          status: 'active',
          permissions: ['invoices.create', 'invoices.view']
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
            id: 'usr-cashier',
            name: 'Regular Cashier',
            username: 'cashier',
            role: 'CASHIER',
            category: 'employee',
            assignedStoreId: 'loc-1',
            status: 'active'
          }
        })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: "VC ORGANIC'S" })
      });
    });

    await page.goto('/admin/cleanup');

    // Verify AccessDeniedState
    await expect(page.getByText('Super Admin Authorization Required')).toBeVisible();
    await expect(page.getByText('The Data Cleanup & Maintenance Center is strictly restricted to canonical Super Admin users.')).toBeVisible();
  });
});
