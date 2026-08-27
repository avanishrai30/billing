import { auditApi, normalizeAuditLogsResponse } from '../../features/audit/api';
import { auditQueryKeys } from '../../features/audit/hooks';
import { apiClient } from '../../lib/api/client';
import type { AuditLogDoc } from '../../features/audit/types';

jest.mock('../../lib/api/client');

describe('Audit API & Query Keys Suite', () => {
  const productionRawAuditLog: AuditLogDoc = {
    _id: 'prod-audit-1',
    eventType: 'LOGIN_SUCCESS',
    entity: 'auth',
    entityId: 'usr-prod',
    performedBy: 'system',
    user: 'System',
    role: 'SYSTEM',
    action: 'auth',
    view: 'login',
    details: 'LOGIN_SUCCESS',
    businessId: 'all',
    businessName: 'All Outlets',
    ip: '',
    userAgent: '',
    requestId: 'req-prod-1',
    timestamp: '2026-08-27T21:57:36.533Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. auditQueryKeys generates deterministic cache keys', () => {
    expect(auditQueryKeys.all).toEqual(['audit-logs']);
    expect(auditQueryKeys.list({ limit: 100, storeId: 'store-1' })).toEqual([
      'audit-logs',
      'list',
      { limit: 100, storeId: 'store-1' }
    ]);
  });

  it('2. auditApi.getAuditLogs calls GET /api/v1/audit-logs with query parameters', async () => {
    const mockLogs = [
      {
        _id: 'audit-1',
        eventType: 'LOGIN_SUCCESS',
        entity: 'auth',
        entityId: 'usr-1',
        performedBy: 'admin',
        action: 'auth',
        view: 'login',
        details: 'User session authenticated successfully',
        businessId: 'all',
        timestamp: new Date().toISOString()
      }
    ];

    (apiClient.get as jest.Mock).mockResolvedValue(mockLogs);

    const result = await auditApi.getAuditLogs({
      limit: 50,
      skip: 10,
      eventType: 'LOGIN_SUCCESS',
      storeId: 'store-1'
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/audit-logs?limit=50&skip=10&eventType=LOGIN_SUCCESS&storeId=store-1'
    );
    expect(result).toEqual(mockLogs);
  });

  it('3. normalizes production raw JSON array audit response', () => {
    expect(normalizeAuditLogsResponse([productionRawAuditLog])).toEqual([productionRawAuditLog]);
  });

  it('4. normalizes wrapped auditLogs response', () => {
    expect(normalizeAuditLogsResponse({ success: true, auditLogs: [productionRawAuditLog] })).toEqual([
      productionRawAuditLog
    ]);
  });

  it('5. normalizes reasonable empty responses without inventing audit data', () => {
    expect(normalizeAuditLogsResponse([])).toEqual([]);
    expect(normalizeAuditLogsResponse(null)).toEqual([]);
    expect(normalizeAuditLogsResponse({ success: false, error: { code: 'SERVER_ERROR' } })).toEqual([]);
  });

  it('6. rejects malformed successful payloads instead of converting them to an empty ledger', () => {
    expect(() => normalizeAuditLogsResponse({ success: true } as any)).toThrow(/Malformed audit log response/);
    expect(() => normalizeAuditLogsResponse({ success: true, auditLogs: {} } as any)).toThrow(/Malformed audit log response/);
  });

  it('7. does not send storeId when All Outlets/global scope is selected', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([productionRawAuditLog]);

    const result = await auditApi.getAuditLogs({
      limit: 100,
      skip: 0,
      storeId: 'all'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/audit-logs?limit=100&skip=0');
    expect(result[0].businessId).toBe('all');
    expect(result[0].businessName).toBe('All Outlets');
  });

  it('8. propagates 401 and 403 request failures as truthful load errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(auditApi.getAuditLogs()).rejects.toThrow('Unauthorized');

    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Forbidden'));
    await expect(auditApi.getAuditLogs()).rejects.toThrow('Forbidden');
  });
});
