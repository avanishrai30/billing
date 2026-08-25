import { adminCleanupApi } from '../../features/adminCleanup/api';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Phase 32 / 32.1 Super Admin Cleanup & Maintenance API & Business Rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Fetches high-level cleanup summary counts across all 4 domains', async () => {
    const mockSummary = {
      invoices: { total: 100, active: 80, archived: 15, voided: 5, potentialCleanup: 20 },
      purchases: { total: 50, active: 45, archived: 3, voided: 2, potentialCleanup: 5 },
      products: { total: 200, active: 180, archived: 20, potentialCleanup: 20 },
      inventory: { totalRecords: 200, zeroStock: 25, totalLedgerEntries: 1200, potentialCleanup: 25 },
      lastOperation: null
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      summary: mockSummary
    });

    const res = await adminCleanupApi.getSummary();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/cleanup/summary');
    expect(res.invoices.total).toBe(100);
    expect(res.products.archived).toBe(20);
    expect(res.inventory.zeroStock).toBe(25);
  });

  it('2. Queries domain records with datePreset and status filters', async () => {
    const mockQueryResult = {
      records: [
        { id: 'inv-1', invoiceNumber: 'INV-2026-001', customerName: 'Ravi', total: 1500, status: 'POSTED' }
      ],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 }
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockQueryResult);

    const res = await adminCleanupApi.queryRecords('invoices', {
      search: 'Ravi',
      datePreset: 'last7days',
      status: 'active'
    }, { page: 1, limit: 25 });

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/cleanup/invoices/query', {
      filters: { search: 'Ravi', datePreset: 'last7days', status: 'active' },
      pagination: { page: 1, limit: 25 }
    });
    expect(res.records.length).toBe(1);
  });

  it('3. Generates Dry-run Preview with stock delta, financial volume and blocked record reasons', async () => {
    const mockPreview = {
      domain: 'invoices' as const,
      action: 'void' as const,
      totalSelected: 2,
      eligibleCount: 1,
      blockedCount: 1,
      stockReversalUnits: 12,
      financialImpact: 2400,
      reversible: true,
      eligibleRecords: [
        { id: 'inv-1', label: 'Invoice #inv-1', action: 'VOID_AND_REVERT_STOCK', details: 'Restore +12 units' }
      ],
      blockedRecords: [
        { id: 'inv-2', label: 'Invoice #inv-2', reason: 'Invoice is already voided/archived.' }
      ],
      warnings: [],
      previewToken: 'prev-token-123'
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      preview: mockPreview
    });

    const res = await adminCleanupApi.previewCleanup('invoices', 'void', ['inv-1', 'inv-2']);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/cleanup/invoices/preview', {
      action: 'void',
      targetIds: ['inv-1', 'inv-2'],
      filters: undefined
    });
    expect(res.eligibleCount).toBe(1);
    expect(res.blockedCount).toBe(1);
    expect(res.stockReversalUnits).toBe(12);
  });

  it('4. Executes cleanup operation with previewToken and returns operationId', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      result: {
        operationId: 'op-12345',
        domain: 'products',
        action: 'archive',
        processedCount: 5,
        reversible: true,
        completedAt: new Date().toISOString()
      }
    });

    const res = await adminCleanupApi.executeCleanup(
      'products',
      'archive',
      ['prd-1', 'prd-2'],
      'prev-token-123',
      'DELETE 2 PRODUCT RECORDS',
      undefined,
      'super-secret'
    );
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/cleanup/products/execute', {
      action: 'archive',
      targetIds: ['prd-1', 'prd-2'],
      previewToken: 'prev-token-123',
      confirmCode: 'DELETE 2 PRODUCT RECORDS',
      filters: undefined,
      password: 'super-secret'
    });
    expect(res.result.operationId).toBe('op-12345');
    expect(res.result.processedCount).toBe(5);
  });

  it('5. Handles Stale Preview error when target records change before execution', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('Target records have changed since preview was generated. STALE PREVIEW / RE-PREVIEW REQUIRED.')
    );

    await expect(
      adminCleanupApi.executeCleanup('invoices', 'void', ['inv-1'], 'stale-token-123', 'DELETE 1 INVOICE RECORD', undefined, 'super-secret')
    ).rejects.toThrow('STALE PREVIEW / RE-PREVIEW REQUIRED');
  });

  it('6. Handles Duplicate Execution error when attempting to re-execute an already executed preview', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error('This cleanup operation has already been executed. Duplicate execution rejected.')
    );

    await expect(
      adminCleanupApi.executeCleanup('invoices', 'void', ['inv-1'], 'executed-token-123', 'DELETE 1 INVOICE RECORD', undefined, 'super-secret')
    ).rejects.toThrow('Duplicate execution rejected');
  });

  it('7. Lists historical cleanup operations and rolls back reversible run', async () => {
    const mockOps = [
      {
        operationId: 'op-999',
        domain: 'invoices' as const,
        action: 'archive' as const,
        status: 'COMPLETED' as const,
        actorUserId: 'usr-1',
        actorUsername: 'admin',
        reversible: true,
        rolledBack: false,
        totalTargeted: 3,
        successCount: 3,
        failureCount: 0,
        stockReversalUnits: 0,
        financialImpact: 0,
        affectedRecordIds: ['inv-1', 'inv-2', 'inv-3'],
        createdAt: new Date().toISOString()
      }
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      operations: mockOps,
      total: 1
    });

    const listRes = await adminCleanupApi.listOperations(20, 0);
    expect(listRes.operations.length).toBe(1);
    expect(listRes.operations[0].operationId).toBe('op-999');

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      result: {
        operationId: 'op-999',
        restoredCount: 3,
        rolledBackAt: new Date().toISOString()
      }
    });

    const rollRes = await adminCleanupApi.rollbackOperation('op-999');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/admin/cleanup/operations/op-999/rollback', {});
    expect(rollRes.result.restoredCount).toBe(3);
  });
});
